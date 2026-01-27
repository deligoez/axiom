package agent

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/deligoez/axiom/internal/tmux"
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

// InteractiveAgent manages multi-turn conversations with Claude CLI using tmux.
// Uses persistent tmux session for real-time streaming without -p flag.
// Based on Gastown's production-tested approach for ink-based CLI interaction.
type InteractiveAgent struct {
	systemPrompt string
	mu           sync.Mutex

	// Tmux session for persistent Claude process
	session *tmux.ClaudeSession

	// Output streaming for current message
	chunks chan string
	done   chan error

	// Logging
	logger *SessionLogger

	// Output tracking for incremental capture
	lastOutputLen int
	cleaner       *StreamCleaner
}

// NewInteractiveAgent creates a new agent for multi-turn conversations.
// Uses tmux for persistent process management instead of spawning new processes.
func NewInteractiveAgent(promptPath, initialMessage string) (*InteractiveAgent, error) {
	// Check tmux availability
	t := tmux.New()
	if !t.IsAvailable() {
		return nil, fmt.Errorf("tmux is required for interactive agent but not found")
	}

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

	// Generate unique session name
	sessionName := fmt.Sprintf("axiom-ava-%s", time.Now().Format("150405"))

	// Get current working directory for the session
	workDir, _ := os.Getwd()

	agent := &InteractiveAgent{
		systemPrompt: string(content),
		session:      tmux.NewClaudeSession(sessionName, workDir),
		chunks:       make(chan string, 100),
		done:         make(chan error, 1),
		logger:       logger,
		cleaner:      NewStreamCleanerWithResponseExtraction(),
	}

	// Log initial message
	logger.Log("system", initialMessage)

	// Start Claude in tmux session
	if err := agent.session.Start(agent.systemPrompt); err != nil {
		_ = logger.Close()
		return nil, fmt.Errorf("starting claude session: %w", err)
	}

	// Wait for Claude to be ready (prompt appears)
	if err := agent.session.WaitForPrompt(30 * time.Second); err != nil {
		_ = agent.session.Stop()
		_ = logger.Close()
		return nil, fmt.Errorf("waiting for claude prompt: %w", err)
	}

	// Capture initial state
	initialOutput, _ := agent.session.GetFullOutput()
	agent.lastOutputLen = len(initialOutput)

	// Send initial message
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

	// Reset cleaner for new message
	a.cleaner = NewStreamCleanerWithResponseExtraction()

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

// runMessage sends a message to Claude via tmux and streams the response.
func (a *InteractiveAgent) runMessage(message string) {
	// Send message via tmux
	if err := a.session.SendMessage(message); err != nil {
		a.sendError(fmt.Errorf("sending message: %w", err))
		return
	}

	// Poll for output changes and stream them
	var fullResponse strings.Builder
	pollInterval := 100 * time.Millisecond
	noChangeCount := 0
	maxNoChangeCount := 50 // 5 seconds of no change = done

	for {
		// Capture current pane content
		output, err := a.session.GetFullOutput()
		if err != nil {
			a.sendError(fmt.Errorf("capturing output: %w", err))
			return
		}

		// Check for new content
		if len(output) > a.lastOutputLen {
			newContent := output[a.lastOutputLen:]
			a.lastOutputLen = len(output)

			// Clean the new content (strip ANSI, filter UI elements)
			cleaned := a.cleaner.Process(newContent)
			if cleaned != "" {
				fullResponse.WriteString(cleaned)
				a.sendChunk(cleaned)
			}

			noChangeCount = 0
		} else {
			noChangeCount++
		}

		// Check if Claude is done (prompt appeared again)
		if a.isPromptReady(output) && noChangeCount > 5 {
			break
		}

		// Timeout if no changes for too long
		if noChangeCount >= maxNoChangeCount {
			break
		}

		time.Sleep(pollInterval)
	}

	// Flush any remaining content
	if remaining := a.cleaner.Flush(); remaining != "" {
		fullResponse.WriteString(remaining)
		a.sendChunk(remaining)
	}

	// Log complete response
	if fullResponse.Len() > 0 {
		a.logger.Log("assistant", fullResponse.String())
	}

	// Signal completion
	a.mu.Lock()
	if a.chunks != nil {
		close(a.chunks)
	}
	if a.done != nil {
		a.done <- nil
		close(a.done)
	}
	// Prepare new channels for next message
	a.chunks = make(chan string, 100)
	a.done = make(chan error, 1)
	a.mu.Unlock()
}

// isPromptReady checks if the Claude prompt (❯) is visible and ready for input.
func (a *InteractiveAgent) isPromptReady(output string) bool {
	lines := strings.Split(output, "\n")
	if len(lines) < 2 {
		return false
	}

	// Look for prompt in last few lines
	for i := len(lines) - 1; i >= 0 && i >= len(lines)-5; i-- {
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "❯") && !strings.Contains(line, "...") {
			return true
		}
	}
	return false
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

// Close closes the logger and stops the tmux session.
func (a *InteractiveAgent) Close() error {
	_ = a.session.Stop()
	return a.logger.Close()
}
