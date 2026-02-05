package agent

import (
	"testing"
)

func TestNewAgentClient_CreatesClient(t *testing.T) {
	config := &AgentConfig{
		Model:   "claude-sonnet-4-20250514",
		Timeout: "30m",
	}

	client, err := NewAgentClient(config)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client == nil {
		t.Fatal("expected non-nil client")
	}
	defer func() { _ = client.Close() }()

	// Verify config is stored
	if client.Config().Model != config.Model {
		t.Errorf("expected model %s, got %s", config.Model, client.Config().Model)
	}
}

func TestNewAgentClient_WithFullConfig(t *testing.T) {
	config := &AgentConfig{
		Model:           "claude-sonnet-4-20250514",
		SystemPrompt:    "You are a helpful assistant",
		WorkDir:         "/tmp/test",
		AllowedTools:    []string{"Bash", "Read", "Edit"},
		Timeout:         "30m",
		TaskID:          "ax-001",
		AgentID:         "agent-1",
		Verbose:         true,
		SkipPermissions: true,
	}

	client, err := NewAgentClient(config)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client == nil {
		t.Fatal("expected non-nil client")
	}
	defer func() { _ = client.Close() }()

	// Verify full config is stored
	storedConfig := client.Config()
	if storedConfig.TaskID != config.TaskID {
		t.Errorf("expected TaskID %s, got %s", config.TaskID, storedConfig.TaskID)
	}
	if storedConfig.AgentID != config.AgentID {
		t.Errorf("expected AgentID %s, got %s", config.AgentID, storedConfig.AgentID)
	}
}

func TestAgentClient_Close_NoError(t *testing.T) {
	config := &AgentConfig{
		Model: "claude-sonnet-4-20250514",
	}

	client, err := NewAgentClient(config)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Close should not error even when not connected
	err = client.Close()
	if err != nil {
		t.Errorf("unexpected error on close: %v", err)
	}
}

func TestBuildClientOptions_Empty(t *testing.T) {
	config := &AgentConfig{}
	opts := buildClientOptions(config)

	// Empty config should produce no options
	if len(opts) != 0 {
		t.Errorf("expected 0 options for empty config, got %d", len(opts))
	}
}

func TestBuildClientOptions_WithModel(t *testing.T) {
	config := &AgentConfig{
		Model: "claude-sonnet-4-20250514",
	}
	opts := buildClientOptions(config)

	// Should have 1 option (model)
	if len(opts) != 1 {
		t.Errorf("expected 1 option, got %d", len(opts))
	}
}

func TestBuildClientOptions_WithCustomArgs(t *testing.T) {
	config := &AgentConfig{
		Verbose:         true,
		SkipPermissions: true,
	}
	opts := buildClientOptions(config)

	// Should have 1 option (custom args containing both flags)
	if len(opts) != 1 {
		t.Errorf("expected 1 option for custom args, got %d", len(opts))
	}
}

func TestBuildClientOptions_WithEnv(t *testing.T) {
	config := &AgentConfig{
		TaskID:  "ax-001",
		AgentID: "agent-1",
	}
	opts := buildClientOptions(config)

	// Should have 1 option (env)
	if len(opts) != 1 {
		t.Errorf("expected 1 option for env, got %d", len(opts))
	}
}
