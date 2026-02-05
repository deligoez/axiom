// Package agent provides AXIOM agent spawning and management.
package agent

import (
	"context"
	"fmt"

	"github.com/dotcommander/agent-sdk-go/claude"

	"github.com/deligoez/axiom/internal/signal"
)

// AgentConfig holds configuration for creating an AgentClient.
type AgentConfig struct {
	// Model specifies the Claude model to use (e.g., "claude-sonnet-4-20250514").
	Model string

	// SystemPrompt is the persona prompt injected as system context.
	SystemPrompt string

	// WorkDir is the working directory for the agent (typically a git worktree).
	WorkDir string

	// AllowedTools lists tools to auto-approve (e.g., "Bash", "Read", "Edit").
	AllowedTools []string

	// Timeout is the maximum duration for a single query (e.g., "30m").
	Timeout string

	// TaskID is the AXIOM task identifier for this agent.
	TaskID string

	// AgentID is the unique agent identifier.
	AgentID string

	// Verbose enables verbose CLI output.
	Verbose bool

	// SkipPermissions bypasses all permission prompts.
	SkipPermissions bool
}

// AgentMessage represents a message from the agent with extracted signals.
type AgentMessage struct {
	// Raw is the original SDK message.
	Raw claude.Message

	// Text is the extracted text content from the message.
	Text string

	// Signals contains any AXIOM signals extracted from the text.
	Signals []signal.Signal
}

// AgentClient wraps the Go SDK client with AXIOM-specific configuration.
type AgentClient struct {
	client claude.Client
	config AgentConfig
}

// NewAgentClient creates a new AgentClient with the given configuration.
func NewAgentClient(config *AgentConfig) (*AgentClient, error) {
	opts := buildClientOptions(config)

	client, err := claude.NewClient(opts...)
	if err != nil {
		return nil, fmt.Errorf("create SDK client: %w", err)
	}

	return &AgentClient{
		client: client,
		config: *config,
	}, nil
}

// buildClientOptions converts AgentConfig to SDK ClientOptions.
func buildClientOptions(config *AgentConfig) []claude.ClientOption {
	var opts []claude.ClientOption

	if config.Model != "" {
		opts = append(opts, claude.WithModel(config.Model))
	}

	if config.Timeout != "" {
		opts = append(opts, claude.WithTimeout(config.Timeout))
	}

	// Build custom args
	var customArgs []string
	if config.Verbose {
		customArgs = append(customArgs, "--verbose")
	}
	if config.SkipPermissions {
		customArgs = append(customArgs, "--dangerously-skip-permissions")
	}
	if len(customArgs) > 0 {
		opts = append(opts, claude.WithCustomArgs(customArgs...))
	}

	// Build environment variables
	env := make(map[string]string)
	if config.TaskID != "" {
		env["AXIOM_TASK_ID"] = config.TaskID
	}
	if config.AgentID != "" {
		env["AXIOM_AGENT_ID"] = config.AgentID
	}
	if len(env) > 0 {
		opts = append(opts, claude.WithEnv(env))
	}

	return opts
}

// Execute sends a prompt to the agent and returns a channel of messages.
// The channel is closed when the agent finishes or an error occurs.
func (a *AgentClient) Execute(ctx context.Context, prompt string) (messages <-chan AgentMessage, errors <-chan error) {
	msgChan := make(chan AgentMessage)
	errChan := make(chan error, 1)

	go func() {
		defer close(msgChan)
		defer close(errChan)

		sdkMsgChan, sdkErrChan := a.client.QueryStream(ctx, prompt)

		for {
			select {
			case msg, ok := <-sdkMsgChan:
				if !ok {
					return
				}

				// Extract text content
				text := claude.GetContentText(msg)

				// Extract AXIOM signals from text
				signals := signal.Parse(text)

				agentMsg := AgentMessage{
					Raw:     msg,
					Text:    text,
					Signals: signals,
				}

				select {
				case msgChan <- agentMsg:
				case <-ctx.Done():
					errChan <- ctx.Err()
					return
				}

			case err, ok := <-sdkErrChan:
				if ok && err != nil {
					errChan <- err
				}
				return

			case <-ctx.Done():
				errChan <- ctx.Err()
				return
			}
		}
	}()

	return msgChan, errChan
}

// Close releases resources associated with the agent client.
func (a *AgentClient) Close() error {
	if a.client != nil {
		return a.client.Disconnect()
	}
	return nil
}

// Config returns the agent configuration.
func (a *AgentClient) Config() AgentConfig {
	return a.config
}
