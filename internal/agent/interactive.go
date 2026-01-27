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

	// Stream cleaner for response extraction
	cleaner *StreamCleaner

	// Number of response markers (⏺) seen before current message
	baselineResponseCount int
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
	// Count response markers (⏺) BEFORE sending message
	// This helps us identify only NEW responses
	baselineOutput, _ := a.session.GetFullOutput()
	a.baselineResponseCount = strings.Count(baselineOutput, "⏺")

	// Send message via tmux
	if err := a.session.SendMessage(message); err != nil {
		a.sendError(fmt.Errorf("sending message: %w", err))
		return
	}

	// Poll for response using marker-based detection
	pollInterval := 200 * time.Millisecond
	noChangeCount := 0
	maxNoChangeCount := 25 // 5 seconds of no response change = done
	lastExtractedLen := 0

	for {
		// Capture current pane content (full history)
		output, err := a.session.GetFullOutput()
		if err != nil {
			a.sendError(fmt.Errorf("capturing output: %w", err))
			return
		}

		// Find the position of the Nth+1 response marker (the new one)
		// This is the start of the current message's response
		newResponseStart := findNthMarkerPosition(output, "⏺", a.baselineResponseCount+1)
		if newResponseStart == -1 {
			// No new response yet
			noChangeCount++
			if noChangeCount >= maxNoChangeCount {
				break
			}
			time.Sleep(pollInterval)
			continue
		}

		// Extract content from the new response only
		newOutput := output[newResponseStart:]
		a.cleaner.Reset()
		_ = a.cleaner.Process(newOutput)
		extracted := a.cleaner.GetFullResponse()

		// Check if we have new extracted content
		if len(extracted) > lastExtractedLen {
			newContent := extracted[lastExtractedLen:]
			lastExtractedLen = len(extracted)

			a.sendChunk(newContent)
			noChangeCount = 0
		} else {
			noChangeCount++
		}

		// Check if Claude is done (response marker + prompt after it)
		if a.isPromptReady(output) && lastExtractedLen > 0 && noChangeCount > 5 {
			break
		}

		// Timeout if no changes for too long
		if noChangeCount >= maxNoChangeCount {
			break
		}

		time.Sleep(pollInterval)
	}

	// Get the complete extracted response
	fullResponse := a.cleaner.GetFullResponse()

	// Log complete response
	if fullResponse != "" {
		a.logger.Log("assistant", fullResponse)
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

// findNthMarkerPosition finds the position of the Nth occurrence of a marker.
// Returns -1 if not found.
func findNthMarkerPosition(s, marker string, n int) int {
	if n <= 0 {
		return -1
	}

	pos := 0
	count := 0
	for {
		idx := strings.Index(s[pos:], marker)
		if idx == -1 {
			return -1
		}
		count++
		if count == n {
			return pos + idx
		}
		pos += idx + len(marker)
	}
}

// isPromptReady checks if Claude has finished responding.
// It looks for the response marker (⏺) followed by a new prompt (❯).
func (a *InteractiveAgent) isPromptReady(output string) bool {
	// Must have seen response marker before checking for ending prompt
	responseIdx := strings.LastIndex(output, "⏺")
	if responseIdx == -1 {
		return false // No response yet
	}

	// Look for prompt AFTER the response marker
	afterResponse := output[responseIdx:]
	promptIdx := strings.Index(afterResponse, "❯")
	if promptIdx == -1 {
		return false // No prompt after response
	}

	// The prompt must be on its own line (empty or just whitespace after it)
	lines := strings.Split(afterResponse[promptIdx:], "\n")
	if len(lines) > 0 {
		firstLine := strings.TrimSpace(lines[0])
		// Prompt line should be just "❯" or "❯ " (empty prompt)
		if firstLine == "❯" || firstLine == "❯ " || strings.HasPrefix(firstLine, "❯") && strings.TrimSpace(strings.TrimPrefix(firstLine, "❯")) == "" {
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
