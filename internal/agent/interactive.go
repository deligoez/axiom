package agent

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
)

// InteractiveAgent maintains a persistent Claude CLI process for multi-turn conversations.
// Unlike SpawnStreaming which creates a new process per message, this keeps one process
// running and sends messages via stdin.
type InteractiveAgent struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	mu     sync.Mutex

	// Output streaming
	chunks chan string
	done   chan error
}

// NewInteractiveAgent creates and starts a persistent Claude CLI agent.
func NewInteractiveAgent(promptPath string) (*InteractiveAgent, error) {
	// Read prompt file
	content, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("reading prompt %s: %w", promptPath, err)
	}

	// Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		return nil, fmt.Errorf("claude CLI not found: %w", err)
	}

	// Build command for interactive mode
	// Using --output-format stream-json for real-time streaming
	cmd := exec.Command(binPath,
		"--verbose",
		"--output-format", "stream-json",
		"--dangerously-skip-permissions",
		"--system-prompt", string(content),
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("creating stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("creating stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("starting agent: %w", err)
	}

	agent := &InteractiveAgent{
		cmd:    cmd,
		stdin:  stdin,
		stdout: stdout,
		chunks: make(chan string, 100),
		done:   make(chan error, 1),
	}

	// Start reading output in background
	go agent.readOutput()

	return agent, nil
}

// SendMessage sends a message to the agent and returns channels for streaming response.
// The chunks channel receives text as it's generated.
// The done channel receives nil on success or an error.
//
//nolint:gocritic // named results would conflict with channel direction
func (a *InteractiveAgent) SendMessage(message string) (<-chan string, <-chan error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Create fresh channels for this message
	a.chunks = make(chan string, 100)
	a.done = make(chan error, 1)

	// Send message to agent via stdin (with newline to submit)
	_, err := fmt.Fprintln(a.stdin, message)
	if err != nil {
		a.done <- fmt.Errorf("sending message: %w", err)
		close(a.chunks)
		close(a.done)
	}

	return a.chunks, a.done
}

// readOutput continuously reads from stdout and parses stream events.
func (a *InteractiveAgent) readOutput() {
	scanner := bufio.NewScanner(a.stdout)
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()

		var event streamEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}

		// Extract text from text_delta events
		if event.Type == "stream_event" &&
			event.Event != nil &&
			event.Event.Type == "content_block_delta" &&
			event.Event.Delta != nil &&
			event.Event.Delta.Type == "text_delta" &&
			event.Event.Delta.Text != "" {
			a.mu.Lock()
			if a.chunks != nil {
				a.chunks <- event.Event.Delta.Text
			}
			a.mu.Unlock()
		}

		// Check for message completion
		if event.Type == "stream_event" && event.Event != nil && event.Event.Type == "message_stop" {
			a.mu.Lock()
			if a.chunks != nil {
				close(a.chunks)
				a.done <- nil
				close(a.done)
			}
			a.mu.Unlock()
		}
	}

	// Process ended
	a.mu.Lock()
	if a.chunks != nil {
		close(a.chunks)
		a.done <- a.cmd.Wait()
		close(a.done)
	}
	a.mu.Unlock()
}

// Close terminates the agent process.
func (a *InteractiveAgent) Close() error {
	_ = a.stdin.Close()
	return a.cmd.Wait()
}
