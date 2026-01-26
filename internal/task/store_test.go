package task

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTaskStore_Load_ReturnsTasksFromFile(t *testing.T) {
	// Arrange
	dir := t.TempDir()
	path := filepath.Join(dir, "tasks.jsonl")

	content := `{"id":"task-001","title":"First task","status":"done"}
{"id":"task-002","title":"Second task","status":"active"}
{"id":"task-003","title":"Third task","status":"pending"}
`
	err := os.WriteFile(path, []byte(content), 0o644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	store := NewTaskStore()

	// Act
	tasks, err := store.Load(path)

	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(tasks) != 3 {
		t.Fatalf("got %d tasks, want 3", len(tasks))
	}

	if tasks[0].ID != "task-001" {
		t.Errorf("got ID %q, want %q", tasks[0].ID, "task-001")
	}
	if tasks[0].Title != "First task" {
		t.Errorf("got Title %q, want %q", tasks[0].Title, "First task")
	}
	if tasks[0].Status != StatusDone {
		t.Errorf("got Status %v, want %v", tasks[0].Status, StatusDone)
	}

	if tasks[1].Status != StatusActive {
		t.Errorf("got Status %v, want %v", tasks[1].Status, StatusActive)
	}

	if tasks[2].Status != StatusPending {
		t.Errorf("got Status %v, want %v", tasks[2].Status, StatusPending)
	}
}
