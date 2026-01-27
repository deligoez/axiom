package agent

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// cliEvent represents the JSON structure from Claude CLI --print --verbose --output-format stream-json.
// The main event types are:
// - "assistant": contains the response in message.content[].text
// - "result": indicates completion
type cliEvent struct {
	Type    string `json:"type"`
	Message *struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"message"`
	Result string `json:"result"` // For "result" type events
}

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

// InteractiveAgent manages multi-turn conversations with Claude CLI.
// Uses --print for clean JSON output and --continue to maintain conversation context.
type InteractiveAgent struct {
	systemPrompt string
	mu           sync.Mutex
	isFirstCall  bool

	// Output streaming for current message
	chunks chan string
	done   chan error

	// Logging
	logger *SessionLogger
}

// NewInteractiveAgent creates a new agent for multi-turn conversations.
func NewInteractiveAgent(promptPath, initialMessage string) (*InteractiveAgent, error) {
	// Read prompt file
	content, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("reading prompt %s: %w", promptPath, err)
	}

	// Create session logger
	logger, err := NewSessionLogger("ava")
	if err != nil {
		return nil, fmt.Errorf("create logger: %w", err)
	}

	agent := &InteractiveAgent{
		systemPrompt: string(content),
		isFirstCall:  true,
		chunks:       make(chan string, 100),
		done:         make(chan error, 1),
		logger:       logger,
	}

	// Log initial message
	logger.Log("system", initialMessage)

	// Start first message
	go agent.runMessage(initialMessage)

	return agent, nil
}

// SendMessage sends a message to the agent using --continue flag.
//
//nolint:gocritic // named results would conflict with channel direction
func (a *InteractiveAgent) SendMessage(message string) (<-chan string, <-chan error) {
	a.mu.Lock()

	// Log user message
	a.logger.Log("user", message)

	// Close old channels to unblock any waiting goroutines
	if a.chunks != nil {
		close(a.chunks)
	}
	if a.done != nil {
		select {
		case a.done <- nil:
		default:
		}
		close(a.done)
	}

	// Create fresh channels for this message
	a.chunks = make(chan string, 100)
	a.done = make(chan error, 1)

	a.mu.Unlock()

	// Run message with --continue flag
	go a.runMessage(message)

	return a.chunks, a.done
}

// GetChunks returns the current chunks channel for streaming.
//
//nolint:gocritic // named results would conflict with channel direction
func (a *InteractiveAgent) GetChunks() (<-chan string, <-chan error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.chunks, a.done
}

// runMessage executes a single message and streams the response.
func (a *InteractiveAgent) runMessage(message string) {
	// Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		a.sendError(fmt.Errorf("claude CLI not found: %w", err))
		return
	}

	// Build command args
	// --print gives us clean output (no terminal UI)
	// --output-format stream-json gives us real-time JSON streaming
	// --verbose is REQUIRED when using stream-json with --print
	// --continue maintains conversation context between calls
	args := []string{
		"--print",
		"--verbose",
		"--output-format", "stream-json",
		"--dangerously-skip-permissions",
	}

	a.mu.Lock()
	isFirst := a.isFirstCall
	if isFirst {
		// First call: use system prompt
		args = append(args, "--system-prompt", a.systemPrompt)
		a.isFirstCall = false
	} else {
		// Subsequent calls: use --continue to maintain context
		args = append(args, "--continue")
	}
	a.mu.Unlock()

	args = append(args, message)

	cmd := exec.Command(binPath, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		a.sendError(fmt.Errorf("creating stdout pipe: %w", err))
		return
	}

	if err := cmd.Start(); err != nil {
		a.sendError(fmt.Errorf("starting agent: %w", err))
		return
	}

	// Read and stream JSON output
	var fullResponse strings.Builder
	scanner := bufio.NewScanner(stdout)
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()

		var event cliEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}

		// Extract text from assistant events
		// Format: {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
		if event.Type == "assistant" && event.Message != nil {
			for _, content := range event.Message.Content {
				if content.Type == "text" && content.Text != "" {
					fullResponse.WriteString(content.Text)
					a.sendChunk(content.Text)
				}
			}
		}
	}

	// Wait for process to complete
	cmdErr := cmd.Wait()

	// Log complete response
	if fullResponse.Len() > 0 {
		a.logger.Log("assistant", fullResponse.String())
	}

	a.mu.Lock()
	if a.chunks != nil {
		close(a.chunks)
	}
	if a.done != nil {
		if cmdErr != nil {
			a.done <- cmdErr
		} else {
			a.done <- nil
		}
		close(a.done)
	}
	// Prepare new channels for next message
	a.chunks = make(chan string, 100)
	a.done = make(chan error, 1)
	a.mu.Unlock()
}

// sendChunk safely sends a chunk to the channel.
func (a *InteractiveAgent) sendChunk(text string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.chunks != nil {
		select {
		case a.chunks <- text:
		default:
			// Channel full, skip
		}
	}
}

// sendError safely sends an error and closes channels.
func (a *InteractiveAgent) sendError(err error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.chunks != nil {
		close(a.chunks)
	}
	if a.done != nil {
		a.done <- err
		close(a.done)
	}
}

// Close closes the logger.
func (a *InteractiveAgent) Close() error {
	return a.logger.Close()
}
