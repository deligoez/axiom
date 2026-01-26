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
