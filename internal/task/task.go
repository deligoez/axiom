// Package task provides task-related types and functions.
package task

// Status represents the status of a task.
type Status string

const (
	StatusPending Status = "pending"
	StatusActive  Status = "active"
	StatusDone    Status = "done"
)

// Task represents a work item in AXIOM.
type Task struct {
	ID     string
	Title  string
	Status Status
}

// GetTasks returns hardcoded sample tasks.
func GetTasks() []Task {
	return []Task{
		{ID: "task-001", Title: "Setup project structure", Status: StatusDone},
		{ID: "task-002", Title: "Add web server", Status: StatusDone},
		{ID: "task-003", Title: "Implement task list", Status: StatusActive},
		{ID: "task-004", Title: "Add persistence", Status: StatusPending},
		{ID: "task-005", Title: "Implement planning", Status: StatusPending},
	}
}
