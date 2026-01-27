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

	// Flush should return it (filterUILines adds newline)
	result := cleaner.Flush()
	if result != "Partial content\n" {
		t.Errorf("expected 'Partial content\\n', got %q", result)
	}
}

func TestStreamCleaner_ResponseExtraction(t *testing.T) {
	// Test: Response extraction with ⏺ marker
	cleaner := NewStreamCleanerWithResponseExtraction()

	input := "⏺ Hello, this is my response.\n" +
		"Some follow-up content.\n" +
		"❯ \n" + // Prompt marker ends response
		"More text outside response.\n"

	result := cleaner.Process(input)

	// Should include response content
	if !strings.Contains(result, "Hello, this is my response.") {
		t.Errorf("expected response content, got %q", result)
	}
	if !strings.Contains(result, "Some follow-up content.") {
		t.Errorf("expected follow-up content, got %q", result)
	}
	// Should NOT include text after prompt marker
	if strings.Contains(result, "More text outside response") {
		t.Errorf("should not include text after prompt marker, got %q", result)
	}
}

func TestStreamCleaner_GetFullResponse(t *testing.T) {
	// Test: GetFullResponse accumulates all response content
	cleaner := NewStreamCleanerWithResponseExtraction()

	// First chunk
	_ = cleaner.Process("⏺ First part.\n")
	// Second chunk
	_ = cleaner.Process("Second part.\n")

	full := cleaner.GetFullResponse()
	if !strings.Contains(full, "First part.") {
		t.Errorf("expected 'First part.' in full response, got %q", full)
	}
	if !strings.Contains(full, "Second part.") {
		t.Errorf("expected 'Second part.' in full response, got %q", full)
	}
}

func TestStreamCleaner_Reset(t *testing.T) {
	// Test: Reset clears all buffers
	cleaner := NewStreamCleanerWithResponseExtraction()

	_ = cleaner.Process("⏺ Some response.\n")
	if cleaner.GetFullResponse() == "" {
		t.Error("response should not be empty before reset")
	}

	cleaner.Reset()

	if cleaner.GetFullResponse() != "" {
		t.Errorf("response should be empty after reset, got %q", cleaner.GetFullResponse())
	}
}

func TestStreamCleaner_CustomStages(t *testing.T) {
	// Test: Custom stages work correctly
	cleaner := NewStreamCleanerWithStages(strings.ToUpper)

	result := cleaner.Process("hello world\n")
	if result != "HELLO WORLD\n" {
		t.Errorf("expected uppercase, got %q", result)
	}
}

func TestStreamCleaner_AddStage(t *testing.T) {
	// Test: Adding stages dynamically
	cleaner := NewStreamCleaner()

	// Add a stage that prefixes each line
	prefixStage := func(input string) string {
		lines := strings.Split(input, "\n")
		var result strings.Builder
		for _, line := range lines {
			if line != "" {
				result.WriteString("[PREFIX] " + line + "\n")
			}
		}
		return result.String()
	}

	cleaner.AddStage(prefixStage)

	result := cleaner.Process("test line\n")
	if !strings.Contains(result, "[PREFIX]") {
		t.Errorf("expected prefix, got %q", result)
	}
}

func TestNormalizeWhitespace(t *testing.T) {
	input := "  hello    world  \n  foo   bar  \n"
	result := NormalizeWhitespace(input)

	if strings.Contains(result, "    ") {
		t.Errorf("should collapse multiple spaces, got %q", result)
	}
	if strings.HasPrefix(result, " ") || strings.HasSuffix(strings.TrimRight(result, "\n"), " ") {
		t.Errorf("should trim leading/trailing spaces from lines, got %q", result)
	}
}

func TestRemoveDuplicateLines(t *testing.T) {
	input := "line1\nline1\nline2\nline2\nline2\nline3\n"
	result := RemoveDuplicateLines(input)

	// Function adds trailing newline after last non-empty line
	if !strings.Contains(result, "line1\nline2\nline3") {
		t.Errorf("expected deduplicated lines, got %q", result)
	}
	// Check that duplicates are removed
	if strings.Count(result, "line1") != 1 {
		t.Errorf("expected single line1, got %q", result)
	}
	if strings.Count(result, "line2") != 1 {
		t.Errorf("expected single line2, got %q", result)
	}
}

func TestTrimTerminalArtifacts(t *testing.T) {
	input := "hello\x1b[2Aworld\r\ntest\r"
	result := TrimTerminalArtifacts(input)

	if strings.Contains(result, "\x1b") {
		t.Errorf("should remove ANSI cursor commands, got %q", result)
	}
	if strings.Contains(result, "\r") {
		t.Errorf("should remove carriage returns, got %q", result)
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
