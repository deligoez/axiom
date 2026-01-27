package agent

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/deligoez/axiom/internal/tmux"
)

func TestInteractiveAgent_E2E(t *testing.T) {
	// Skip in CI or if tmux/claude not available
	if os.Getenv("CI") != "" {
		t.Skip("skipping E2E test in CI")
	}
	if _, err := exec.LookPath("claude"); err != nil {
		t.Skip("claude CLI not installed")
	}
	tm := tmux.New()
	if !tm.IsAvailable() {
		t.Skip("tmux not available")
	}

	// Create temp workspace (use fixed path for debugging)
	tmpDir := "/tmp/axiom-e2e-test"
	_ = os.RemoveAll(tmpDir)
	_ = os.MkdirAll(tmpDir, 0o755)
	t.Logf("Test dir: %s", tmpDir)
	promptPath := filepath.Join(tmpDir, "test_prompt.md")
	if err := os.WriteFile(promptPath, []byte("You are a test assistant. Be very brief. Max 10 words per response."), 0o644); err != nil {
		t.Fatalf("failed to create prompt file: %v", err)
	}

	// Create log directory
	logDir := filepath.Join(tmpDir, ".axiom", "agents", "ava", "logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		t.Fatalf("failed to create log directory: %v", err)
	}

	// Change to temp dir
	oldDir, _ := os.Getwd()
	_ = os.Chdir(tmpDir)
	defer func() { _ = os.Chdir(oldDir) }()

	t.Log("Creating InteractiveAgent...")
	agent, err := NewInteractiveAgent(promptPath, "Say hello")
	if err != nil {
		t.Fatalf("failed to create agent: %v", err)
	}
	defer func() { _ = agent.Close() }()

	// Collect initial response
	t.Log("Waiting for initial response...")
	chunks, done := agent.GetChunks()
	var response strings.Builder
	timeout := time.After(30 * time.Second)

Loop1:
	for {
		select {
		case chunk, ok := <-chunks:
			if !ok {
				break Loop1
			}
			response.WriteString(chunk)
			t.Logf("Chunk: %q", chunk)
		case err := <-done:
			if err != nil {
				t.Fatalf("error in initial message: %v", err)
			}
			break Loop1
		case <-timeout:
			t.Fatal("timeout waiting for initial response")
		}
	}

	t.Logf("Initial response: %q", response.String())

	// Send follow-up message
	t.Log("Sending follow-up message...")
	chunks2, done2 := agent.SendMessage("What is 2+2?")

	var response2 strings.Builder
	timeout2 := time.After(30 * time.Second)

Loop2:
	for {
		select {
		case chunk, ok := <-chunks2:
			if !ok {
				break Loop2
			}
			response2.WriteString(chunk)
			t.Logf("Chunk2: %q", chunk)
		case err := <-done2:
			if err != nil {
				t.Fatalf("error in follow-up: %v", err)
			}
			break Loop2
		case <-timeout2:
			t.Fatal("timeout waiting for follow-up response")
		}
	}

	t.Logf("Follow-up response: %q", response2.String())

	// Verify responses
	if response.Len() == 0 {
		t.Error("initial response was empty")
	}
	if response2.Len() == 0 {
		t.Error("follow-up response was empty")
	}

	// Check for "4" in the math response (should contain the answer)
	if !strings.Contains(response2.String(), "4") {
		t.Logf("Warning: expected '4' in response, got: %q", response2.String())
	}

	t.Log("E2E test completed successfully")
}
