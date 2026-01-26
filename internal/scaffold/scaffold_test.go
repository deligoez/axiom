package scaffold

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScaffold_CreatesAxiomDir(t *testing.T) {
	dir := t.TempDir()

	err := Scaffold(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	axiomDir := filepath.Join(dir, ".axiom")
	if _, err := os.Stat(axiomDir); os.IsNotExist(err) {
		t.Error(".axiom directory was not created")
	}
}

func TestScaffold_CreatesAvaAgentDir(t *testing.T) {
	dir := t.TempDir()

	err := Scaffold(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	avaDir := filepath.Join(dir, ".axiom", "agents", "ava")
	if _, err := os.Stat(avaDir); os.IsNotExist(err) {
		t.Error(".axiom/agents/ava directory was not created")
	}
}

func TestScaffold_ErrorOnPermissionDenied(t *testing.T) {
	// Create a read-only directory
	dir := t.TempDir()
	readOnlyDir := filepath.Join(dir, "readonly")
	if err := os.MkdirAll(readOnlyDir, 0o555); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	err := Scaffold(readOnlyDir)
	if err == nil {
		t.Error("expected error on permission denied, got nil")
	}
}

func TestExists_ReturnsFalseForNewDir(t *testing.T) {
	dir := t.TempDir()

	if Exists(dir) {
		t.Error("expected Exists to return false for new directory")
	}
}

func TestExists_ReturnsTrueAfterScaffold(t *testing.T) {
	dir := t.TempDir()

	if err := Scaffold(dir); err != nil {
		t.Fatalf("scaffold failed: %v", err)
	}

	if !Exists(dir) {
		t.Error("expected Exists to return true after scaffold")
	}
}

func TestWriteConfig_CreatesFile(t *testing.T) {
	dir := t.TempDir()
	axiomDir := filepath.Join(dir, ".axiom")
	if err := os.MkdirAll(axiomDir, 0o755); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	err := WriteConfig(axiomDir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	configPath := filepath.Join(axiomDir, "config.json")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Error("config.json was not created")
	}
}

func TestWriteConfig_ValidJSON(t *testing.T) {
	dir := t.TempDir()
	axiomDir := filepath.Join(dir, ".axiom")
	if err := os.MkdirAll(axiomDir, 0o755); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	if err := WriteConfig(axiomDir); err != nil {
		t.Fatalf("write config failed: %v", err)
	}

	configPath := filepath.Join(axiomDir, "config.json")
	content, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read config failed: %v", err)
	}

	expected := `{"version":"1.0.0"}`
	if string(content) != expected {
		t.Errorf("config content = %q, want %q", string(content), expected)
	}
}
