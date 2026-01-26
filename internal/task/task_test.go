package task

import "testing"

func TestGetTasks_ReturnsNonEmpty(t *testing.T) {
	// Act
	tasks := GetTasks()

	// Assert
	if len(tasks) < 3 {
		t.Errorf("got %d tasks, want at least 3", len(tasks))
	}
}

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
