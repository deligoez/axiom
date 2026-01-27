package agent

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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

// InteractiveAgent manages multi-turn conversations with Claude CLI using PTY.
// Uses full interactive mode with output filtering for real-time streaming.
type InteractiveAgent struct {
	systemPrompt string
	mu           sync.Mutex
	isFirstCall  bool

	// PTY agent for process management
	pty *PTYAgent

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
		pty:          NewPTYAgent(),
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

// SendMessage sends a message to the agent.
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

	// Run message
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

// runMessage executes a single message and streams the response via PTY.
func (a *InteractiveAgent) runMessage(message string) {
	// Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		a.sendError(fmt.Errorf("claude CLI not found: %w", err))
		return
	}

	// Build command args
	// -p is shorthand for --prompt (sends single prompt, CLI exits after response)
	// --dangerously-skip-permissions to avoid permission prompts
	args := []string{
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

	// Add -p flag with the message for single-shot mode
	args = append(args, "-p", message)

	// Create cleaner for filtering PTY output
	cleaner := NewStreamCleaner()

	// Raw PTY chunks and done channels
	rawChunks := make(chan string, 1000)
	rawDone := make(chan error, 1)

	// Start PTY process
	go a.pty.RunStreaming(binPath, args, rawChunks, rawDone)

	// Process and filter output
	var fullResponse string
	for chunk := range rawChunks {
		// Clean the chunk (strip ANSI, filter UI elements)
		cleaned := cleaner.Process(chunk)
		if cleaned != "" {
			fullResponse += cleaned
			a.sendChunk(cleaned)
		}
	}

	// Flush any remaining content
	if remaining := cleaner.Flush(); remaining != "" {
		fullResponse += remaining
		a.sendChunk(remaining)
	}

	// Wait for PTY to complete
	cmdErr := <-rawDone

	// Log complete response
	if fullResponse != "" {
		a.logger.Log("assistant", fullResponse)
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

// Close closes the logger and stops any running process.
func (a *InteractiveAgent) Close() error {
	_ = a.pty.Stop()
	return a.logger.Close()
}
