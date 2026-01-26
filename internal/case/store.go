package casestore

import (
	"bufio"
	"encoding/json"
	"os"
)

// CaseStore handles case persistence.
type CaseStore struct{}

// NewCaseStore creates a new CaseStore.
func NewCaseStore() *CaseStore {
	return &CaseStore{}
}

// Load reads cases from a JSONL file.
func (s *CaseStore) Load(path string) ([]Case, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = file.Close() }()

	var cases []Case
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var c Case
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			return nil, err
		}
		cases = append(cases, c)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return cases, nil
}
