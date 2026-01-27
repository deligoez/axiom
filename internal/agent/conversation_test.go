package agent

import (
	"strings"
	"testing"
)

func TestMessage_Format(t *testing.T) {
	msg := Message{Role: "user", Content: "Hello"}
	expected := "User: Hello"
	if msg.Format() != expected {
		t.Errorf("expected %q, got %q", expected, msg.Format())
	}

	msg2 := Message{Role: "assistant", Content: "Hi there"}
	expected2 := "Assistant: Hi there"
	if msg2.Format() != expected2 {
		t.Errorf("expected %q, got %q", expected2, msg2.Format())
	}
}

func TestConversation_AddMessage(t *testing.T) {
	conv := NewConversation()
	conv.AddMessage("user", "Hello")
	conv.AddMessage("assistant", "Hi")

	if len(conv.Messages) != 2 {
		t.Errorf("expected 2 messages, got %d", len(conv.Messages))
	}

	if conv.Messages[0].Role != "user" {
		t.Errorf("expected role 'user', got %q", conv.Messages[0].Role)
	}
}

func TestConversation_FormatHistory(t *testing.T) {
	conv := NewConversation()
	conv.AddMessage("user", "Hello")
	conv.AddMessage("assistant", "Hi there")
	conv.AddMessage("user", "How are you?")

	history := conv.FormatHistory()

	if !strings.Contains(history, "User: Hello") {
		t.Error("expected 'User: Hello' in history")
	}
	if !strings.Contains(history, "Assistant: Hi there") {
		t.Error("expected 'Assistant: Hi there' in history")
	}
	if !strings.Contains(history, "User: How are you?") {
		t.Error("expected 'User: How are you?' in history")
	}
}

func TestConversation_EmptyHistory(t *testing.T) {
	conv := NewConversation()
	history := conv.FormatHistory()

	if history != "" {
		t.Errorf("expected empty history, got %q", history)
	}
}
