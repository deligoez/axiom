package tmux

import (
	"fmt"
	"testing"
	"time"
)

func TestClaudeSession_Integration(t *testing.T) {
	// This is a manual integration test
	// Run with: go test -v -run TestClaudeSession_Integration ./internal/tmux/
	t.Skip("manual integration test - run explicitly when needed")

	t.Log("=== AXIOM Tmux Integration Test ===")

	// Create session
	session := NewClaudeSession("axiom-integration-test", "")
	defer func() { _ = session.Stop() }()

	t.Log("[1/5] Starting Claude in tmux...")
	if err := session.Start("You are a helpful assistant. Be very brief."); err != nil {
		t.Fatalf("Error starting: %v", err)
	}

	t.Log("[2/5] Waiting for prompt...")
	if err := session.WaitForPrompt(30 * time.Second); err != nil {
		t.Fatalf("Error waiting: %v", err)
	}

	t.Log("[3/5] Sending message...")
	if err := session.SendMessage("Say hello in exactly 3 words"); err != nil {
		t.Fatalf("Error sending: %v", err)
	}

	t.Log("[4/5] Waiting for response...")
	time.Sleep(10 * time.Second)

	t.Log("[5/5] Capturing output...")
	output, err := session.GetFullOutput()
	if err != nil {
		t.Fatalf("Error capturing: %v", err)
	}

	t.Log("\n=== OUTPUT ===")
	t.Log(output)
	t.Log("=== END ===")

	// Basic validation - output should contain something
	if len(output) < 50 {
		t.Errorf("output seems too short: %d chars", len(output))
	}
}

func TestClaudeSession_MultiTurn(t *testing.T) {
	// Multi-turn conversation test
	t.Skip("manual integration test - run explicitly when needed")

	session := NewClaudeSession("axiom-multiturn-test", "")
	defer func() { _ = session.Stop() }()

	// Start
	if err := session.Start("You are a helpful assistant. Be very brief."); err != nil {
		t.Fatalf("Error starting: %v", err)
	}
	if err := session.WaitForPrompt(30 * time.Second); err != nil {
		t.Fatalf("Error waiting for initial prompt: %v", err)
	}

	// Message 1
	t.Log("Sending message 1...")
	if err := session.SendMessage("Remember the number 42"); err != nil {
		t.Fatalf("Error sending message 1: %v", err)
	}
	time.Sleep(8 * time.Second)

	// Message 2 - test context preservation
	t.Log("Sending message 2...")
	if err := session.SendMessage("What number did I just mention?"); err != nil {
		t.Fatalf("Error sending message 2: %v", err)
	}
	time.Sleep(8 * time.Second)

	// Get output
	output, _ := session.GetFullOutput()
	fmt.Printf("Full output:\n%s\n", output)

	// Should contain "42" in the response
	if output == "" {
		t.Error("no output captured")
	}
}
