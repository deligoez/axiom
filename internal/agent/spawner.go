package agent

import (
	"fmt"
	"os"
	"os/exec"
)

// Spawn starts a Claude CLI agent with the given prompt file and initial message.
// It runs claude in non-interactive mode and returns the agent's output.
//
// The prompt file content is passed via --system-prompt flag.
// The message is the initial user message that triggers the agent.
// Returns the agent's stdout output or an error.
func Spawn(promptPath, message string) (string, error) {
	// 1. Read prompt file
	content, err := os.ReadFile(promptPath)
	if err != nil {
		return "", fmt.Errorf("reading prompt %s: %w", promptPath, err)
	}

	// 2. Find claude binary
	binPath, err := exec.LookPath("claude")
	if err != nil {
		return "", fmt.Errorf("claude CLI not found: %w\n\nInstall: npm install -g @anthropic-ai/claude-code", err)
	}

	// 3. Build and run command
	cmd := exec.Command(binPath,
		"--print",
		"--dangerously-skip-permissions",
		"--system-prompt", string(content),
		message,
	)

	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("agent crashed (exit %d): %s", exitErr.ExitCode(), string(exitErr.Stderr))
		}
		return "", fmt.Errorf("running agent: %w", err)
	}

	return string(output), nil
}
