package casestore

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCaseStore_Load_ReturnsCasesFromFile(t *testing.T) {
	// Arrange
	dir := t.TempDir()
	path := filepath.Join(dir, "cases.jsonl")

	content := `{"id":"task-001","type":"task","status":"done","content":"First task","createdAt":"2026-01-26T10:00:00Z"}
{"id":"task-002","type":"task","status":"active","content":"Second task","createdAt":"2026-01-26T11:00:00Z"}
{"id":"op-001","type":"operation","status":"pending","content":"Feature op","createdAt":"2026-01-26T12:00:00Z"}
`
	err := os.WriteFile(path, []byte(content), 0o644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	store := NewCaseStore()

	// Act
	cases, err := store.Load(path)

	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(cases) != 3 {
		t.Fatalf("got %d cases, want 3", len(cases))
	}

	// Check first case
	if cases[0].ID != "task-001" {
		t.Errorf("got ID %q, want %q", cases[0].ID, "task-001")
	}
	if cases[0].Type != CaseTypeTask {
		t.Errorf("got Type %v, want %v", cases[0].Type, CaseTypeTask)
	}
	if cases[0].Status != StatusDone {
		t.Errorf("got Status %v, want %v", cases[0].Status, StatusDone)
	}
	if cases[0].Content != "First task" {
		t.Errorf("got Content %q, want %q", cases[0].Content, "First task")
	}

	// Check third case (operation type)
	if cases[2].Type != CaseTypeOperation {
		t.Errorf("got Type %v, want %v", cases[2].Type, CaseTypeOperation)
	}
}

func TestCaseStore_Load_MissingFile_ReturnsError(t *testing.T) {
	// Arrange
	store := NewCaseStore()
	path := "/nonexistent/path/cases.jsonl"

	// Act
	cases, err := store.Load(path)

	// Assert
	if err == nil {
		t.Error("expected error for missing file, got nil")
	}
	if cases != nil {
		t.Errorf("expected nil cases, got %v", cases)
	}
}
