package task

import (
	"bufio"
	"encoding/json"
	"os"
)

// TaskStore handles task persistence.
type TaskStore struct{}

// NewTaskStore creates a new TaskStore.
func NewTaskStore() *TaskStore {
	return &TaskStore{}
}

// Load reads tasks from a JSONL file.
func (s *TaskStore) Load(path string) ([]Task, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = file.Close() }()

	var tasks []Task
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var t Task
		if err := json.Unmarshal([]byte(line), &t); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}
