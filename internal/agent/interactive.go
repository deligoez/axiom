package agent

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// SessionLogger handles session-based logging for agent conversations.
type SessionLogger struct {
	sessionID string
	logFile   *os.File
	mu        sync.Mutex
}

// NewSessionLogger creates a new session logger.
func NewSessionLogger(agentName string) (*SessionLogger, error) {
	sessionID := time.Now().Format("2006-01-02-150405")
	logDir := filepath.Join(".axiom", "agents", agentName, "logs")

	if err := os.MkdirAll(logDir, 0o755); err != nil {
		return nil, fmt.Errorf("create log directory: %w", err)
	}

	logPath := filepath.Join(logDir, fmt.Sprintf("session-%s.jsonl", sessionID))
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open log file: %w", err)
	}

	return &SessionLogger{
		sessionID: sessionID,
		logFile:   f,
	}, nil
}

// Log writes a message to the session log.
func (l *SessionLogger) Log(role, content string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry := map[string]string{
		"timestamp":  time.Now().Format(time.RFC3339),
		"session_id": l.sessionID,
		"role":       role,
		"content":    content,
	}

	if data, err := json.Marshal(entry); err == nil {
		_, _ = l.logFile.Write(append(data, '\n'))
	}
}

// Close closes the log file.
func (l *SessionLogger) Close() error {
	return l.logFile.Close()
}

// InteractiveAgent maintains a persistent Claude CLI process for multi-turn conversations.
// Unlike SpawnStreaming which creates a new process per message, this keeps one process
// running and sends messages via stdin.
type InteractiveAgent struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	mu     sync.Mutex

	// Output streaming
	chunks        chan string
	done          chan error
	currentOutput strings.Builder

	// Logging
	logger *SessionLogger
}

// NewInteractiveAgent creates and starts a persistent Claude CLI agent.
func NewInteractiveAgent(promptPath, initialMessage string) (*InteractiveAgent, error) {
	// Read prompt file
	content, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("reading prompt %s: %w", promptPath, err)
	}

	// Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		return nil, fmt.Errorf("claude CLI not found: %w", err)
	}

	// Create session logger
	logger, err := NewSessionLogger("ava")
	if err != nil {
		return nil, fmt.Errorf("create logger: %w", err)
	}

	// Build command for interactive mode (no --print = stays alive)
	// Using --output-format stream-json for real-time streaming
	cmd := exec.Command(binPath,
		"--verbose",
		"--output-format", "stream-json",
		"--dangerously-skip-permissions",
		"--system-prompt", string(content),
		initialMessage, // First message as argument
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		_ = logger.Close()
		return nil, fmt.Errorf("creating stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		_ = logger.Close()
		return nil, fmt.Errorf("creating stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		_ = logger.Close()
		return nil, fmt.Errorf("starting agent: %w", err)
	}

	agent := &InteractiveAgent{
		cmd:    cmd,
		stdin:  stdin,
		stdout: stdout,
		chunks: make(chan string, 100),
		done:   make(chan error, 1),
		logger: logger,
	}

	// Log initial message
	logger.Log("system", initialMessage)

	// Start reading output in background
	go agent.readOutput()

	return agent, nil
}

// SendMessage sends a message to the agent and returns channels for streaming response.
// The chunks channel receives text as it's generated.
// The done channel receives nil on success or an error.
//
//nolint:gocritic // named results would conflict with channel direction
func (a *InteractiveAgent) SendMessage(message string) (<-chan string, <-chan error) {
	a.mu.Lock()

	// Log user message
	a.logger.Log("user", message)

	// Reset output builder for new message
	a.currentOutput.Reset()

	// Create fresh channels for this message
	a.chunks = make(chan string, 100)
	a.done = make(chan error, 1)

	a.mu.Unlock()

	// Send message to agent via stdin (with newline to submit)
	_, err := fmt.Fprintln(a.stdin, message)
	if err != nil {
		a.mu.Lock()
		a.done <- fmt.Errorf("sending message: %w", err)
		close(a.chunks)
		close(a.done)
		a.mu.Unlock()
	}

	return a.chunks, a.done
}

// GetChunks returns the current chunks channel for initial message streaming.
//
//nolint:gocritic // named results would conflict with channel direction
func (a *InteractiveAgent) GetChunks() (<-chan string, <-chan error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.chunks, a.done
}

// readOutput continuously reads from stdout and parses stream events.
func (a *InteractiveAgent) readOutput() {
	scanner := bufio.NewScanner(a.stdout)
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()

		var event streamEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}

		// Extract text from text_delta events
		if event.Type == "stream_event" &&
			event.Event != nil &&
			event.Event.Type == "content_block_delta" &&
			event.Event.Delta != nil &&
			event.Event.Delta.Type == "text_delta" &&
			event.Event.Delta.Text != "" {
			a.mu.Lock()
			text := event.Event.Delta.Text
			a.currentOutput.WriteString(text)
			if a.chunks != nil {
				a.chunks <- text
			}
			a.mu.Unlock()
		}

		// Check for message completion
		if event.Type == "stream_event" && event.Event != nil && event.Event.Type == "message_stop" {
			a.mu.Lock()
			// Log complete assistant response
			if a.currentOutput.Len() > 0 {
				a.logger.Log("assistant", a.currentOutput.String())
			}
			if a.chunks != nil {
				close(a.chunks)
				a.done <- nil
				close(a.done)
				// Prepare for next message
				a.chunks = make(chan string, 100)
				a.done = make(chan error, 1)
			}
			a.mu.Unlock()
		}
	}

	// Process ended
	a.mu.Lock()
	if a.chunks != nil {
		close(a.chunks)
		a.done <- a.cmd.Wait()
		close(a.done)
	}
	_ = a.logger.Close()
	a.mu.Unlock()
}

// Close terminates the agent process.
func (a *InteractiveAgent) Close() error {
	_ = a.stdin.Close()
	err := a.cmd.Wait()
	_ = a.logger.Close()
	return err
}
