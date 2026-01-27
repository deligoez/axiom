package agent

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestInteractiveAgent_Creation(t *testing.T) {
	// Skip if no claude CLI available
	if _, err := exec.LookPath("claude"); err != nil {
		t.Skip("claude CLI not installed")
	}

	// Create temp prompt file
	tmpDir := t.TempDir()
	promptPath := filepath.Join(tmpDir, "test_prompt.md")
	err := os.WriteFile(promptPath, []byte("You are a helpful test assistant."), 0o644)
	if err != nil {
		t.Fatalf("failed to create prompt file: %v", err)
	}

	// Create log directory
	logDir := filepath.Join(tmpDir, ".axiom", "agents", "ava", "logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		t.Fatalf("failed to create log directory: %v", err)
	}

	// Change to temp dir for .axiom path
	oldDir, _ := os.Getwd()
	_ = os.Chdir(tmpDir)
	defer func() { _ = os.Chdir(oldDir) }()

	// Test: Agent can be created
	agent, err := NewInteractiveAgent(promptPath, "Hello")
	if err != nil {
		t.Fatalf("failed to create agent: %v", err)
	}
	defer func() { _ = agent.Close() }()

	// Give it time to start
	time.Sleep(100 * time.Millisecond)

	if agent.pty == nil {
		t.Error("expected pty to be initialized")
	}
}

func TestInteractiveAgent_GetChunks(t *testing.T) {
	// Test: GetChunks returns channels
	agent := &InteractiveAgent{
		chunks: make(chan string, 10),
		done:   make(chan error, 1),
	}

	chunks, done := agent.GetChunks()
	if chunks == nil {
		t.Error("expected chunks channel to be non-nil")
	}
	if done == nil {
		t.Error("expected done channel to be non-nil")
	}
}

func TestStreamCleaner_Integration(t *testing.T) {
	// Test: StreamCleaner works with typical Claude output
	cleaner := NewStreamCleaner()

	// Simulate Claude CLI output chunks
	chunks := []string{
		"\x1b[?25l",          // Hide cursor
		"✻ Thinking…\n",      // Spinner (should be filtered)
		"\x1b[32m",           // Start green color
		"Hello! I'm ",        // Partial content
		"Claude.\x1b[0m\n",   // Complete content
		"Tokens: 100/8000\n", // Status bar (should be filtered)
	}

	var result string
	for _, chunk := range chunks {
		cleaned := cleaner.Process(chunk)
		result += cleaned
	}
	result += cleaner.Flush()

	// Should contain actual content
	if result != "Hello! I'm Claude.\n" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestSessionLogger_Creation(t *testing.T) {
	// Test: SessionLogger creates log file
	tmpDir := t.TempDir()
	logDir := filepath.Join(tmpDir, ".axiom", "agents", "test", "logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		t.Fatalf("failed to create log directory: %v", err)
	}

	// Change to temp dir
	oldDir, _ := os.Getwd()
	_ = os.Chdir(tmpDir)
	defer func() { _ = os.Chdir(oldDir) }()

	logger, err := NewSessionLogger("test")
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer func() { _ = logger.Close() }()

	// Log a message
	logger.Log("user", "Hello")

	// Verify log file exists
	files, _ := filepath.Glob(filepath.Join(logDir, "session-*.jsonl"))
	if len(files) == 0 {
		t.Error("expected log file to be created")
	}
}

func TestPTYAgent_Write(t *testing.T) {
	// Test: PTY Write function works
	agent := NewPTYAgent()

	// Can't write to non-running process
	err := agent.Write("test")
	if err == nil {
		t.Error("expected error writing to non-running process")
	}
}
