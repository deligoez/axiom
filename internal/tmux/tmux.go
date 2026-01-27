// Package tmux provides tmux session management for Claude CLI interaction.
// This approach is based on Gastown's production-tested pattern for
// sending input to ink-based CLI applications like Claude Code.
package tmux

import (
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"
)

const (
	// DefaultDebounceMs is the delay between sending text and Enter key.
	// This prevents race conditions where Enter arrives before paste is processed.
	DefaultDebounceMs = 100

	// DefaultStartupDelayMs is the delay to wait for Claude CLI to start.
	DefaultStartupDelayMs = 5000
)

// Tmux provides tmux operations for managing Claude CLI sessions.
type Tmux struct {
	binPath string
}

// New creates a new Tmux instance.
func New() *Tmux {
	return &Tmux{
		binPath: "tmux",
	}
}

// run executes a tmux command and returns stdout.
func (t *Tmux) run(args ...string) (string, error) {
	cmd := exec.Command(t.binPath, args...)
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("tmux %v failed: %s", args, string(exitErr.Stderr))
		}
		return "", fmt.Errorf("tmux %v failed: %w", args, err)
	}
	return strings.TrimSpace(string(out)), nil
}

// IsAvailable checks if tmux is installed and accessible.
func (t *Tmux) IsAvailable() bool {
	_, err := exec.LookPath(t.binPath)
	return err == nil
}

// NewSession creates a new detached tmux session.
func (t *Tmux) NewSession(name, workDir string) error {
	args := []string{"new-session", "-d", "-s", name, "-x", "120", "-y", "40"}
	if workDir != "" {
		args = append(args, "-c", workDir)
	}
	_, err := t.run(args...)
	return err
}

// HasSession checks if a session exists.
func (t *Tmux) HasSession(name string) bool {
	_, err := t.run("has-session", "-t", name)
	return err == nil
}

// KillSession terminates a tmux session.
func (t *Tmux) KillSession(name string) error {
	_, err := t.run("kill-session", "-t", name)
	return err
}

// SendKeys sends keystrokes to a session with debounce before Enter.
// Uses literal mode (-l) to handle special characters properly.
func (t *Tmux) SendKeys(session, keys string) error {
	return t.SendKeysDebounced(session, keys, DefaultDebounceMs)
}

// SendKeysDebounced sends keystrokes with a configurable delay before Enter.
// The debounceMs parameter controls how long to wait after paste before sending Enter.
// This prevents race conditions where Enter arrives before paste is processed.
func (t *Tmux) SendKeysDebounced(session, keys string, debounceMs int) error {
	// Send text using literal mode (-l) to handle special chars
	if _, err := t.run("send-keys", "-t", session, "-l", keys); err != nil {
		return err
	}
	// Wait for paste to be processed
	if debounceMs > 0 {
		time.Sleep(time.Duration(debounceMs) * time.Millisecond)
	}
	// Send Enter separately - more reliable than appending to send-keys
	_, err := t.run("send-keys", "-t", session, "Enter")
	return err
}

// SendKeysRaw sends keystrokes without adding Enter.
func (t *Tmux) SendKeysRaw(session, keys string) error {
	_, err := t.run("send-keys", "-t", session, keys)
	return err
}

// CapturePaneContent captures the visible content of the session's pane.
func (t *Tmux) CapturePaneContent(session string) (string, error) {
	return t.run("capture-pane", "-t", session, "-p")
}

// CapturePaneHistory captures the full scrollback history.
func (t *Tmux) CapturePaneHistory(session string, lines int) (string, error) {
	return t.run("capture-pane", "-t", session, "-p", "-S", fmt.Sprintf("-%d", lines))
}

// CapturePaneFullHistory captures the entire history from the start.
// This includes all scrollback, not just the visible pane.
func (t *Tmux) CapturePaneFullHistory(session string) (string, error) {
	return t.run("capture-pane", "-t", session, "-p", "-S", "-")
}

// ClaudeSession manages a Claude CLI session in tmux.
type ClaudeSession struct {
	tmux        *Tmux
	sessionName string
	workDir     string
	mu          sync.Mutex

	// Output tracking
	lastCaptureLen int
}

// NewClaudeSession creates a new Claude session manager.
func NewClaudeSession(sessionName, workDir string) *ClaudeSession {
	return &ClaudeSession{
		tmux:        New(),
		sessionName: sessionName,
		workDir:     workDir,
	}
}

// Start starts the Claude CLI in a tmux session.
func (s *ClaudeSession) Start(systemPrompt string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Kill existing session if any
	if s.tmux.HasSession(s.sessionName) {
		_ = s.tmux.KillSession(s.sessionName)
	}

	// Create new session
	if err := s.tmux.NewSession(s.sessionName, s.workDir); err != nil {
		return fmt.Errorf("creating tmux session: %w", err)
	}

	// Build Claude command
	args := []string{"claude", "--dangerously-skip-permissions"}
	if systemPrompt != "" {
		args = append(args, "--system-prompt", systemPrompt)
	}
	cmd := strings.Join(args, " ")

	// Start Claude in the session
	if err := s.tmux.SendKeysRaw(s.sessionName, cmd); err != nil {
		return fmt.Errorf("sending claude command: %w", err)
	}
	if _, err := s.tmux.run("send-keys", "-t", s.sessionName, "Enter"); err != nil {
		return fmt.Errorf("sending enter: %w", err)
	}

	// Wait for Claude to start
	time.Sleep(DefaultStartupDelayMs * time.Millisecond)

	return nil
}

// SendMessage sends a message to Claude and returns when prompt is ready again.
func (s *ClaudeSession) SendMessage(message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.tmux.SendKeys(s.sessionName, message)
}

// GetNewOutput returns any new output since last capture.
func (s *ClaudeSession) GetNewOutput() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	content, err := s.tmux.CapturePaneContent(s.sessionName)
	if err != nil {
		return "", err
	}

	// Return only new content
	if len(content) > s.lastCaptureLen {
		newContent := content[s.lastCaptureLen:]
		s.lastCaptureLen = len(content)
		return newContent, nil
	}

	return "", nil
}

// GetFullOutput returns the complete pane content including scrollback history.
func (s *ClaudeSession) GetFullOutput() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.tmux.CapturePaneFullHistory(s.sessionName)
}

// IsRunning checks if the session is still running.
func (s *ClaudeSession) IsRunning() bool {
	return s.tmux.HasSession(s.sessionName)
}

// Stop terminates the Claude session.
func (s *ClaudeSession) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.tmux.HasSession(s.sessionName) {
		return s.tmux.KillSession(s.sessionName)
	}
	return nil
}

// WaitForPrompt waits until the Claude prompt (❯) appears.
func (s *ClaudeSession) WaitForPrompt(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		content, err := s.tmux.CapturePaneContent(s.sessionName)
		if err != nil {
			return err
		}
		// Check for prompt symbol
		if strings.Contains(content, "❯") {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for prompt")
}
