package casestore

import (
	"testing"
	"time"
)

func TestCase_Creation(t *testing.T) {
	// Arrange & Act
	now := time.Now()
	c := Case{
		ID:        "task-001",
		Type:      CaseTypeTask,
		Status:    StatusDone,
		Content:   "Setup project structure",
		CreatedAt: now,
	}

	// Assert
	if c.ID != "task-001" {
		t.Errorf("got ID %q, want %q", c.ID, "task-001")
	}
	if c.Type != CaseTypeTask {
		t.Errorf("got Type %v, want %v", c.Type, CaseTypeTask)
	}
	if c.Status != StatusDone {
		t.Errorf("got Status %v, want %v", c.Status, StatusDone)
	}
	if c.Content != "Setup project structure" {
		t.Errorf("got Content %q, want %q", c.Content, "Setup project structure")
	}
	if c.CreatedAt != now {
		t.Errorf("got CreatedAt %v, want %v", c.CreatedAt, now)
	}
}

func TestCaseType_Constants(t *testing.T) {
	// Verify case type constants exist
	types := []CaseType{
		CaseTypeDirective,
		CaseTypeDraft,
		CaseTypeResearch,
		CaseTypePending,
		CaseTypeDeferred,
		CaseTypeOperation,
		CaseTypeTask,
		CaseTypeDiscovery,
	}

	for _, ct := range types {
		if ct == "" {
			t.Error("CaseType constant should not be empty")
		}
	}
}

func TestStatus_Constants(t *testing.T) {
	// Verify status constants exist
	statuses := []Status{
		StatusPending,
		StatusActive,
		StatusBlocked,
		StatusDone,
	}

	for _, s := range statuses {
		if s == "" {
			t.Error("Status constant should not be empty")
		}
	}
}
