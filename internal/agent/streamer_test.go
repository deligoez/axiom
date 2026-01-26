package agent

import (
	"os"
	"strings"
	"testing"
)

func TestSpawnStreaming_PromptNotFound(t *testing.T) {
	_, _, err := SpawnStreaming("/nonexistent/prompt.md", "Start")
	if err == nil {
		t.Error("expected error for missing prompt")
	}
	if !strings.Contains(err.Error(), "reading prompt") {
		t.Errorf("expected 'reading prompt' in error, got: %v", err)
	}
}

func TestSpawnStreaming_ClaudeNotInPath(t *testing.T) {
	// Create a temporary prompt file
	tmpFile, err := os.CreateTemp("", "test-prompt-*.md")
	if err != nil {
		t.Fatalf("creating temp file: %v", err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()

	if _, err := tmpFile.WriteString("Test prompt"); err != nil {
		t.Fatalf("writing temp file: %v", err)
	}
	if err := tmpFile.Close(); err != nil {
		t.Fatalf("closing temp file: %v", err)
	}

	// Temporarily clear PATH
	oldPath := os.Getenv("PATH")
	if err := os.Setenv("PATH", ""); err != nil {
		t.Fatalf("setting PATH: %v", err)
	}
	defer func() { _ = os.Setenv("PATH", oldPath) }()

	_, _, err = SpawnStreaming(tmpFile.Name(), "Start")
	if err == nil {
		t.Error("expected error when claude not in PATH")
	}
	if !strings.Contains(err.Error(), "not found") {
		t.Errorf("expected 'not found' in error, got: %v", err)
	}
}

func TestSpawnStreaming_ReturnsChannels(t *testing.T) {
	// Create a temporary prompt file
	tmpFile, err := os.CreateTemp("", "test-prompt-*.md")
	if err != nil {
		t.Fatalf("creating temp file: %v", err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()

	if _, err := tmpFile.WriteString("Test prompt"); err != nil {
		t.Fatalf("writing temp file: %v", err)
	}
	if err := tmpFile.Close(); err != nil {
		t.Fatalf("closing temp file: %v", err)
	}

	// This test verifies the function signature returns channels
	// It will fail if claude isn't installed, which is expected
	lines, done, err := SpawnStreaming(tmpFile.Name(), "Start")

	// If error is about prompt reading, that's a failure
	if err != nil && strings.Contains(err.Error(), "reading prompt") {
		t.Errorf("failed to read prompt: %v", err)
	}

	// If claude is installed and no error, verify we got channels
	if err == nil {
		if lines == nil {
			t.Error("expected lines channel, got nil")
		}
		if done == nil {
			t.Error("expected done channel, got nil")
		}
		// Drain channels to avoid goroutine leak
		go func() {
			for range lines {
			}
		}()
		<-done
	}
}

func TestSpawnStreaming_ErrorMessageIncludesInstallHint(t *testing.T) {
	// Create a temporary prompt file
	tmpFile, err := os.CreateTemp("", "test-prompt-*.md")
	if err != nil {
		t.Fatalf("creating temp file: %v", err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()

	if _, err := tmpFile.WriteString("Test"); err != nil {
		t.Fatalf("writing temp file: %v", err)
	}
	if err := tmpFile.Close(); err != nil {
		t.Fatalf("closing temp file: %v", err)
	}

	// Clear PATH to trigger "not found" error
	oldPath := os.Getenv("PATH")
	if err := os.Setenv("PATH", ""); err != nil {
		t.Fatalf("setting PATH: %v", err)
	}
	defer func() { _ = os.Setenv("PATH", oldPath) }()

	_, _, err = SpawnStreaming(tmpFile.Name(), "Start")
	if err == nil {
		t.Fatal("expected error")
	}

	// Should include install hint
	if !strings.Contains(err.Error(), "npm install") {
		t.Errorf("expected install hint in error, got: %v", err)
	}
}
