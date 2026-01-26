package signal

import (
	"testing"
)

func TestParse_NoSignals(t *testing.T) {
	output := "Just some regular text without any signals"
	signals := Parse(output)

	if len(signals) != 0 {
		t.Errorf("expected 0 signals, got %d", len(signals))
	}
}

func TestParse_SingleSignalNoPayload(t *testing.T) {
	output := "Starting work... <axiom>AVA_COMPLETE</axiom> done"
	signals := Parse(output)

	if len(signals) != 1 {
		t.Fatalf("expected 1 signal, got %d", len(signals))
	}
	if signals[0].Type != "AVA_COMPLETE" {
		t.Errorf("expected type AVA_COMPLETE, got %s", signals[0].Type)
	}
	if signals[0].Payload != "" {
		t.Errorf("expected empty payload, got %s", signals[0].Payload)
	}
}

func TestParse_SingleSignalWithPayload(t *testing.T) {
	output := "<axiom>BLOCKED:Database connection failed</axiom>"
	signals := Parse(output)

	if len(signals) != 1 {
		t.Fatalf("expected 1 signal, got %d", len(signals))
	}
	if signals[0].Type != "BLOCKED" {
		t.Errorf("expected type BLOCKED, got %s", signals[0].Type)
	}
	if signals[0].Payload != "Database connection failed" {
		t.Errorf("expected payload 'Database connection failed', got %s", signals[0].Payload)
	}
}

func TestParse_MultipleSignals(t *testing.T) {
	output := `
Starting Ava...
<axiom>PROGRESS:25</axiom>
Scanning project...
<axiom>PROGRESS:75</axiom>
Done!
<axiom>AVA_COMPLETE</axiom>
`
	signals := Parse(output)

	if len(signals) != 3 {
		t.Fatalf("expected 3 signals, got %d", len(signals))
	}

	// Check order and content
	if signals[0].Type != "PROGRESS" || signals[0].Payload != "25" {
		t.Errorf("signal 0: expected PROGRESS:25, got %s:%s", signals[0].Type, signals[0].Payload)
	}
	if signals[1].Type != "PROGRESS" || signals[1].Payload != "75" {
		t.Errorf("signal 1: expected PROGRESS:75, got %s:%s", signals[1].Type, signals[1].Payload)
	}
	if signals[2].Type != "AVA_COMPLETE" {
		t.Errorf("signal 2: expected AVA_COMPLETE, got %s", signals[2].Type)
	}
}

func TestSignalType_AvaComplete(t *testing.T) {
	// Verify the constant is defined correctly
	if AvaComplete != "AVA_COMPLETE" {
		t.Errorf("expected AvaComplete to be 'AVA_COMPLETE', got %s", AvaComplete)
	}
}
