package agent

import (
	"os"
	"strings"
	"testing"
)

func TestSpawn_PromptNotFound(t *testing.T) {
	_, err := Spawn("/nonexistent/prompt.md")
	if err == nil {
		t.Error("expected error for missing prompt")
	}
	if !strings.Contains(err.Error(), "reading prompt") {
		t.Errorf("expected 'reading prompt' in error, got: %v", err)
	}
}

func TestSpawn_ClaudeNotInPath(t *testing.T) {
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

	_, err = Spawn(tmpFile.Name())
	if err == nil {
		t.Error("expected error when claude not in PATH")
	}
	if !strings.Contains(err.Error(), "not found") {
		t.Errorf("expected 'not found' in error, got: %v", err)
	}
}

func TestSpawn_ReadsPromptFile(t *testing.T) {
	// Create a temporary prompt file
	tmpFile, err := os.CreateTemp("", "test-prompt-*.md")
	if err != nil {
		t.Fatalf("creating temp file: %v", err)
	}
	defer func() { _ = os.Remove(tmpFile.Name()) }()

	testContent := "# Test Prompt\nThis is a test."
	if _, err := tmpFile.WriteString(testContent); err != nil {
		t.Fatalf("writing temp file: %v", err)
	}
	if err := tmpFile.Close(); err != nil {
		t.Fatalf("closing temp file: %v", err)
	}

	// This test verifies the prompt is read correctly
	// It will fail at the LookPath stage if claude isn't installed,
	// but that's expected - we're testing the prompt reading part
	_, err = Spawn(tmpFile.Name())

	// If error is about prompt reading, that's a failure
	// If error is about claude not found, prompt was read successfully
	if err != nil && strings.Contains(err.Error(), "reading prompt") {
		t.Errorf("failed to read prompt: %v", err)
	}
}

func TestSpawn_ErrorMessageIncludesInstallHint(t *testing.T) {
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

	_, err = Spawn(tmpFile.Name())
	if err == nil {
		t.Fatal("expected error")
	}

	// Should include install hint
	if !strings.Contains(err.Error(), "npm install") {
		t.Errorf("expected install hint in error, got: %v", err)
	}
}
