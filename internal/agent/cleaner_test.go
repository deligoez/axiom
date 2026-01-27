package agent

import (
	"strings"
	"testing"
)

func TestStreamCleaner_CleanContent(t *testing.T) {
	// Test: Clean content passes through
	cleaner := NewStreamCleaner()

	input := "Hello, this is Claude's response.\n"
	result := cleaner.Process(input)

	if result != input {
		t.Errorf("expected %q, got %q", input, result)
	}
}

func TestStreamCleaner_StripsANSI(t *testing.T) {
	// Test: ANSI codes are stripped
	cleaner := NewStreamCleaner()

	input := "\x1b[32mGreen text\x1b[0m\n"
	expected := "Green text\n"

	result := cleaner.Process(input)
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestStreamCleaner_FiltersUIElements(t *testing.T) {
	// Test: UI elements are filtered out
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "spinner line",
			input:    "✻ Nucleating…\n",
			expected: "",
		},
		{
			name:     "status bar",
			input:    "Tokens: 500/8000 | Cost: $0.02\n",
			expected: "",
		},
		{
			name:     "mixed content and UI",
			input:    "Hello\n✻ Nucleating…\nWorld\n",
			expected: "Hello\nWorld\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleaner := NewStreamCleaner()
			result := cleaner.Process(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestStreamCleaner_BuffersPartialLines(t *testing.T) {
	// Test: Partial lines are buffered until newline
	cleaner := NewStreamCleaner()

	// First chunk: partial line
	result1 := cleaner.Process("Hello, this is ")
	if result1 != "" {
		t.Errorf("expected empty for partial line, got %q", result1)
	}

	// Second chunk: completes the line
	result2 := cleaner.Process("a complete line.\n")
	expected := "Hello, this is a complete line.\n"
	if result2 != expected {
		t.Errorf("expected %q, got %q", expected, result2)
	}
}

func TestStreamCleaner_FlushesRemaining(t *testing.T) {
	// Test: Flush() returns any buffered content
	cleaner := NewStreamCleaner()

	// Partial line without newline
	_ = cleaner.Process("Partial content")

	// Flush should return it
	result := cleaner.Flush()
	if result != "Partial content" {
		t.Errorf("expected 'Partial content', got %q", result)
	}
}

func TestStreamCleaner_ComplexMixed(t *testing.T) {
	// Test: Complex real-world output
	cleaner := NewStreamCleaner()

	// Simulated Claude CLI output (each UI line ends with newline)
	input := strings.Join([]string{
		"\x1b[?25l", // Hide cursor (no newline - inline)
		"\x1b[38;2;215;119;87m✻\x1b[39m Nucleating…\n", // Spinner line
		"\x1b[6A",                    // Cursor up (no newline - inline)
		"Here is my response:\n",     // Actual content
		"\x1b[32msome code\x1b[0m\n", // Colored content
		"Tokens: 100/8000\n",         // Status bar
		"More content here.\n",       // Actual content
		"\x1b[?25h",                  // Show cursor (no newline - inline)
	}, "")

	result := cleaner.Process(input)

	// Should only contain the actual content
	if !strings.Contains(result, "Here is my response:") {
		t.Errorf("expected content to include 'Here is my response:', got %q", result)
	}
	if !strings.Contains(result, "some code") {
		t.Errorf("expected content to include 'some code', got %q", result)
	}
	if !strings.Contains(result, "More content here.") {
		t.Errorf("expected content to include 'More content here.', got %q", result)
	}
	if strings.Contains(result, "Nucleating") {
		t.Errorf("expected spinner to be filtered, got %q", result)
	}
	if strings.Contains(result, "Tokens:") {
		t.Errorf("expected status bar to be filtered, got %q", result)
	}
}
