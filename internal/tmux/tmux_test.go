package tmux

import (
	"strings"
	"testing"
	"time"
)

func TestTmux_IsAvailable(t *testing.T) {
	tmux := New()
	if !tmux.IsAvailable() {
		t.Skip("tmux not available")
	}
	// If we get here, tmux is available
}

func TestTmux_SessionLifecycle(t *testing.T) {
	tmux := New()
	if !tmux.IsAvailable() {
		t.Skip("tmux not available")
	}

	sessionName := "axiom-test-session"

	// Clean up any existing session
	_ = tmux.KillSession(sessionName)

	// Create session
	err := tmux.NewSession(sessionName, "")
	if err != nil {
		t.Fatalf("NewSession failed: %v", err)
	}

	// Verify session exists
	if !tmux.HasSession(sessionName) {
		t.Fatal("session should exist after creation")
	}

	// Kill session
	err = tmux.KillSession(sessionName)
	if err != nil {
		t.Fatalf("KillSession failed: %v", err)
	}

	// Verify session is gone
	if tmux.HasSession(sessionName) {
		t.Fatal("session should not exist after kill")
	}
}

func TestTmux_SendKeys(t *testing.T) {
	tmux := New()
	if !tmux.IsAvailable() {
		t.Skip("tmux not available")
	}

	sessionName := "axiom-test-sendkeys"

	// Clean up
	_ = tmux.KillSession(sessionName)
	defer func() { _ = tmux.KillSession(sessionName) }()

	// Create session
	if err := tmux.NewSession(sessionName, ""); err != nil {
		t.Fatalf("NewSession failed: %v", err)
	}

	// Send some text (will create a command at shell prompt)
	if err := tmux.SendKeysRaw(sessionName, "echo hello"); err != nil {
		t.Fatalf("SendKeysRaw failed: %v", err)
	}

	// Small delay for processing
	time.Sleep(50 * time.Millisecond)

	// Capture pane content
	content, err := tmux.CapturePaneContent(sessionName)
	if err != nil {
		t.Fatalf("CapturePaneContent failed: %v", err)
	}

	// The text should appear in the pane
	if !strings.Contains(content, "echo hello") {
		t.Errorf("expected 'echo hello' in pane content, got: %s", content)
	}
}

func TestClaudeSession_StartStop(t *testing.T) {
	// This test requires Claude CLI to be installed
	// It's a manual/integration test
	t.Skip("manual test - requires Claude CLI")

	session := NewClaudeSession("axiom-claude-test", "")
	defer func() { _ = session.Stop() }()

	// Start Claude
	err := session.Start("")
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	// Wait for prompt
	err = session.WaitForPrompt(30 * time.Second)
	if err != nil {
		t.Fatalf("WaitForPrompt failed: %v", err)
	}

	// Send a message
	err = session.SendMessage("Say hello in 3 words")
	if err != nil {
		t.Fatalf("SendMessage failed: %v", err)
	}

	// Wait for response
	time.Sleep(10 * time.Second)

	// Get output
	output, err := session.GetFullOutput()
	if err != nil {
		t.Fatalf("GetFullOutput failed: %v", err)
	}

	t.Logf("Output:\n%s", output)

	// Stop
	err = session.Stop()
	if err != nil {
		t.Fatalf("Stop failed: %v", err)
	}
}
