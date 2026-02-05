package agent

import (
	"testing"

	"github.com/dotcommander/agent-sdk-go/claude"
)

func TestNewClient_CreatesClient(t *testing.T) {
	client, err := claude.NewClient(
		claude.WithModel("claude-sonnet-4-20250514"),
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}
