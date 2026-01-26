// Package casestore provides case management for AXIOM.
package casestore

import "time"

// CaseType represents the type of a case.
type CaseType string

const (
	CaseTypeDirective CaseType = "directive"
	CaseTypeDraft     CaseType = "draft"
	CaseTypeResearch  CaseType = "research"
	CaseTypePending   CaseType = "pending"
	CaseTypeDeferred  CaseType = "deferred"
	CaseTypeOperation CaseType = "operation"
	CaseTypeTask      CaseType = "task"
	CaseTypeDiscovery CaseType = "discovery"
)

// Status represents the status of a case.
type Status string

const (
	StatusPending Status = "pending"
	StatusActive  Status = "active"
	StatusBlocked Status = "blocked"
	StatusDone    Status = "done"
)

// Case represents a work item in AXIOM.
type Case struct {
	ID        string    `json:"id"`
	Type      CaseType  `json:"type"`
	Status    Status    `json:"status"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}
