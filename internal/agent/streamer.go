package agent

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
)

// streamEvent represents the JSON structure from Claude CLI stream-json output.
type streamEvent struct {
	Type  string `json:"type"`
	Event *struct {
		Type  string `json:"type"`
		Delta *struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"delta"`
	} `json:"event"`
}

// SpawnStreaming starts a Claude CLI agent and streams its output in real-time.
// Unlike Spawn(), this function is non-blocking and returns immediately.
//
// Uses Claude CLI's stream-json format to get real-time text deltas instead of
// waiting for the entire response.
//
// Returns:
//   - lines: channel that receives each text chunk as it's generated
//   - done: channel that closes when the process completes (receive to get exit error)
//   - err: immediate error (prompt not found, claude not in PATH)
//
// The caller should drain the lines channel and wait on done to avoid goroutine leaks.
//
//nolint:gocritic // named results would conflict with channel direction
func SpawnStreaming(promptPath, message string) (<-chan string, <-chan error, error) {
	// 1. Read prompt file
	content, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, nil, fmt.Errorf("reading prompt %s: %w", promptPath, err)
	}

	// 2. Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		return nil, nil, fmt.Errorf("claude CLI not found: %w\n\nInstall: npm install -g @anthropic-ai/claude-code", err)
	}

	// 3. Build command with streaming flags
	cmd := exec.Command(binPath,
		"--print",
		"--verbose",
		"--output-format", "stream-json",
		"--include-partial-messages",
		"--dangerously-skip-permissions",
		"--system-prompt", string(content),
		message,
	)

	// 4. Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, nil, fmt.Errorf("creating stdout pipe: %w", err)
	}

	// 5. Start process
	if err := cmd.Start(); err != nil {
		return nil, nil, fmt.Errorf("starting agent: %w", err)
	}

	// 6. Create channels
	chunks := make(chan string)
	done := make(chan error, 1)

	// 7. Read and parse JSON stream in goroutine
	go func() {
		scanner := bufio.NewScanner(stdout)
		// Increase buffer for large JSON lines
		buf := make([]byte, 64*1024)
		scanner.Buffer(buf, 1024*1024)

		for scanner.Scan() {
			line := scanner.Bytes()

			// Parse JSON line
			var event streamEvent
			if err := json.Unmarshal(line, &event); err != nil {
				continue // Skip malformed JSON
			}

			// Extract text from stream_event with text_delta
			if event.Type == "stream_event" &&
				event.Event != nil &&
				event.Event.Type == "content_block_delta" &&
				event.Event.Delta != nil &&
				event.Event.Delta.Type == "text_delta" &&
				event.Event.Delta.Text != "" {
				chunks <- event.Event.Delta.Text
			}
		}
		close(chunks)

		// Wait for process to exit and send result
		err := cmd.Wait()
		done <- err
		close(done)
	}()

	return chunks, done, nil
}
