// Package scaffold handles .axiom/ directory creation on first run.
package scaffold

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/deligoez/axiom/internal/agent"
)

// Scaffold creates the .axiom/ directory structure.
// It creates:
//   - .axiom/
//   - .axiom/agents/ava/
func Scaffold(projectDir string) error {
	axiomDir := filepath.Join(projectDir, ".axiom")
	avaDir := filepath.Join(axiomDir, "agents", "ava")

	if err := os.MkdirAll(avaDir, 0o755); err != nil {
		return fmt.Errorf("create directories: %w", err)
	}

	return nil
}

// Exists checks if .axiom/ directory already exists.
func Exists(projectDir string) bool {
	axiomDir := filepath.Join(projectDir, ".axiom")
	_, err := os.Stat(axiomDir)
	return err == nil
}

// WriteConfig creates a minimal config.json in the .axiom/ directory.
func WriteConfig(axiomDir string) error {
	configPath := filepath.Join(axiomDir, "config.json")
	config := []byte(`{"version":"1.0.0"}`)

	if err := os.WriteFile(configPath, config, 0o644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

// WriteAvaPrompt writes the Ava prompt template to .axiom/agents/ava/prompt.md.
func WriteAvaPrompt(axiomDir string) error {
	promptPath := filepath.Join(axiomDir, "agents", "ava", "prompt.md")

	if err := os.WriteFile(promptPath, []byte(agent.AvaPromptTemplate), 0o644); err != nil {
		return fmt.Errorf("write ava prompt: %w", err)
	}

	return nil
}

// ConfigState represents the state of AXIOM configuration.
type ConfigState int

const (
	// ConfigNew means no .axiom/ directory exists.
	ConfigNew ConfigState = iota
	// ConfigIncomplete means .axiom/ exists but config lacks verification commands.
	ConfigIncomplete
	// ConfigComplete means config has verification commands.
	ConfigComplete
)

// CheckConfigState determines the configuration state for Ava's initial prompt.
func CheckConfigState(projectDir string) ConfigState {
	axiomDir := filepath.Join(projectDir, ".axiom")
	configPath := filepath.Join(axiomDir, "config.json")

	// Check if .axiom/ exists
	if _, err := os.Stat(axiomDir); os.IsNotExist(err) {
		return ConfigNew
	}

	// Check if config.json exists
	data, err := os.ReadFile(configPath)
	if err != nil {
		return ConfigIncomplete
	}

	// Check if config has verification commands (simple check for "verification" key with array)
	// A complete config has: {"version":"1.0.0","verification":["go test ./...",...]}
	// An incomplete config has: {"version":"1.0.0"} (only version)
	configStr := string(data)
	if !strings.Contains(configStr, `"verification"`) {
		return ConfigIncomplete
	}

	return ConfigComplete
}
