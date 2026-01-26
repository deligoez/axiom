package task

import "testing"

func TestTask_Creation(t *testing.T) {
	// Arrange & Act
	task := Task{
		ID:     "task-001",
		Title:  "Setup project",
		Status: StatusDone,
	}

	// Assert
	if task.ID != "task-001" {
		t.Errorf("got ID %q, want %q", task.ID, "task-001")
	}
	if task.Title != "Setup project" {
		t.Errorf("got Title %q, want %q", task.Title, "Setup project")
	}
	if task.Status != StatusDone {
		t.Errorf("got Status %v, want %v", task.Status, StatusDone)
	}
}
