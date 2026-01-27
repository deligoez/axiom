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

	"github.com/creack/pty"
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

// InteractiveAgent manages a persistent Claude CLI session using PTY.
// This runs Claude in true interactive mode, maintaining conversation context.
type InteractiveAgent struct {
	ptyFile *os.File
	cmd     *exec.Cmd
	mu      sync.Mutex

	// Output streaming
	chunks chan string
	done   chan error

	// Response tracking
	currentResponse strings.Builder
	responseReady   chan struct{}

	// Logging
	logger *SessionLogger
}

// NewInteractiveAgent creates and starts a persistent Claude CLI agent using PTY.
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

	// Build command for interactive mode (NO --print!)
	cmd := exec.Command(binPath,
		"--verbose",
		"--dangerously-skip-permissions",
		"--system-prompt", string(content),
	)

	// Start with PTY
	ptyFile, err := pty.Start(cmd)
	if err != nil {
		_ = logger.Close()
		return nil, fmt.Errorf("starting pty: %w", err)
	}

	agent := &InteractiveAgent{
		ptyFile:       ptyFile,
		cmd:           cmd,
		chunks:        make(chan string, 100),
		done:          make(chan error, 1),
		responseReady: make(chan struct{}),
		logger:        logger,
	}

	// Log initial message
	logger.Log("system", initialMessage)

	// Start reading output in background
	go agent.readOutput()

	// Send initial message after a short delay for CLI to initialize
	go func() {
		time.Sleep(500 * time.Millisecond)
		agent.sendToAgent(initialMessage)
	}()

	return agent, nil
}

// sendToAgent sends a message to the Claude CLI via PTY.
func (a *InteractiveAgent) sendToAgent(message string) {
	a.mu.Lock()
	// Reset response tracking
	a.currentResponse.Reset()
	a.mu.Unlock()

	// Send message followed by Enter
	_, _ = a.ptyFile.WriteString(message + "\n")
}

// SendMessage sends a message to the agent and returns channels for streaming response.
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

	// Send message to agent
	a.sendToAgent(message)

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

// readOutput reads from the PTY and streams text to the chunks channel.
func (a *InteractiveAgent) readOutput() {
	reader := bufio.NewReader(a.ptyFile)

	for {
		// Read character by character for real-time streaming
		r, _, err := reader.ReadRune()
		if err != nil {
			break
		}

		char := string(r)

		// Skip ANSI escape sequences (terminal formatting)
		if r == '\x1b' {
			// Read until end of escape sequence
			for {
				next, _, err := reader.ReadRune()
				if err != nil {
					break
				}
				// Escape sequences typically end with a letter
				if (next >= 'A' && next <= 'Z') || (next >= 'a' && next <= 'z') {
					break
				}
			}
			continue
		}

		// Skip control characters except newlines
		if r < 32 && r != '\n' && r != '\r' {
			continue
		}

		// Track response and send to channel
		a.mu.Lock()
		a.currentResponse.WriteString(char)
		if a.chunks != nil {
			// Use recover to handle closed channel (safe send)
			func() {
				//nolint:errcheck // recover() returns nil or panic value, we don't need it
				defer func() { _ = recover() }()
				select {
				case a.chunks <- char:
				default:
					// Channel full, skip
				}
			}()
		}
		a.mu.Unlock()
	}

	// Process ended
	a.mu.Lock()
	response := a.currentResponse.String()
	if response != "" {
		a.logger.Log("assistant", response)
	}
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
	_ = a.ptyFile.Close()
	err := a.cmd.Wait()
	_ = a.logger.Close()
	return err
}
