package agent

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
)

// SpawnStreaming starts a Claude CLI agent and streams its output line-by-line.
// Unlike Spawn(), this function is non-blocking and returns immediately.
//
// Returns:
//   - lines: channel that receives each line of output
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

	// 3. Build command
	cmd := exec.Command(binPath,
		"--print",
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
	lines := make(chan string)
	done := make(chan error, 1)

	// 7. Read stdout in goroutine
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			lines <- scanner.Text()
		}
		close(lines)

		// Wait for process to exit and send result
		err := cmd.Wait()
		done <- err
		close(done)
	}()

	return lines, done, nil
}
