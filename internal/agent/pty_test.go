package agent

import (
	"strings"
	"testing"
	"time"
)

func TestPTYAgent_SpawnEcho(t *testing.T) {
	// Test: Can spawn a simple command and read output
	agent := NewPTYAgent()

	output, err := agent.Run("echo", "hello world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(output, "hello world") {
		t.Errorf("expected output to contain 'hello world', got: %q", output)
	}
}

func TestPTYAgent_SpawnWithTimeout(t *testing.T) {
	// Test: Command that takes too long times out
	agent := NewPTYAgent()
	agent.Timeout = 100 * time.Millisecond

	_, err := agent.Run("sleep", "10")
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}

	if !strings.Contains(err.Error(), "timeout") {
		t.Errorf("expected timeout error, got: %v", err)
	}
}

func TestPTYAgent_StreamOutput(t *testing.T) {
	// Test: Can stream output character by character
	agent := NewPTYAgent()

	chunks := make(chan string, 100)
	done := make(chan error, 1)

	go agent.RunStreaming("echo", []string{"line1\nline2\nline3"}, chunks, done)

	var output strings.Builder
	for chunk := range chunks {
		output.WriteString(chunk)
	}

	err := <-done
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	result := output.String()
	if !strings.Contains(result, "line1") {
		t.Errorf("expected output to contain 'line1', got: %q", result)
	}
}

func TestPTYAgent_GracefulShutdown(t *testing.T) {
	// Test: Can stop a running process gracefully
	agent := NewPTYAgent()

	chunks := make(chan string, 100)
	done := make(chan error, 1)

	go agent.RunStreaming("sleep", []string{"30"}, chunks, done)

	// Give it time to start
	time.Sleep(50 * time.Millisecond)

	// Stop it
	err := agent.Stop()
	if err != nil {
		t.Fatalf("unexpected error stopping: %v", err)
	}

	// Should complete quickly
	select {
	case err := <-done:
		// Expect either nil or a "signal" error (normal for killed process)
		if err != nil && !strings.Contains(err.Error(), "signal") {
			t.Logf("process stopped with: %v (expected)", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("process did not stop within timeout")
	}
}

func TestPTYAgent_WriteToStdin(t *testing.T) {
	// Test: Can write to stdin of running process
	agent := NewPTYAgent()

	chunks := make(chan string, 100)
	done := make(chan error, 1)

	// Use cat which echoes stdin to stdout
	go agent.RunStreaming("cat", nil, chunks, done)

	// Give it time to start
	time.Sleep(50 * time.Millisecond)

	// Write to stdin
	err := agent.Write("hello from stdin\n")
	if err != nil {
		t.Fatalf("unexpected error writing: %v", err)
	}

	// Read output
	var output strings.Builder
	timeout := time.After(2 * time.Second)

readLoop:
	for {
		select {
		case chunk, ok := <-chunks:
			if !ok {
				break readLoop
			}
			output.WriteString(chunk)
			if strings.Contains(output.String(), "hello from stdin") {
				// Got what we wanted, stop the process
				_ = agent.Stop()
				break readLoop
			}
		case <-timeout:
			_ = agent.Stop()
			break readLoop
		}
	}

	// Drain remaining
	for range chunks {
	}
	<-done

	if !strings.Contains(output.String(), "hello from stdin") {
		t.Errorf("expected output to contain 'hello from stdin', got: %q", output.String())
	}
}
