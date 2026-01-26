// Package scaffold handles .axiom/ directory creation on first run.
package scaffold

import (
	"fmt"
	"os"
	"path/filepath"
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
