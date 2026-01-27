package agent

import (
	"testing"
)

func TestStripANSI_PlainText(t *testing.T) {
	// Test: Plain text without ANSI codes passes through unchanged
	input := "Hello, World!"
	expected := "Hello, World!"

	result := StripANSI(input)
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestStripANSI_CSIColorCodes(t *testing.T) {
	// Test: SGR color codes are stripped
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple color",
			input:    "\x1b[31mRed Text\x1b[0m",
			expected: "Red Text",
		},
		{
			name:     "RGB color",
			input:    "\x1b[38;2;215;119;87mOrange\x1b[0m",
			expected: "Orange",
		},
		{
			name:     "multiple colors",
			input:    "\x1b[1m\x1b[32mBold Green\x1b[0m",
			expected: "Bold Green",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StripANSI(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestStripANSI_CursorMovement(t *testing.T) {
	// Test: Cursor movement codes are stripped
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "cursor up",
			input:    "\x1b[6AText",
			expected: "Text",
		},
		{
			name:     "cursor forward",
			input:    "\x1b[11CText",
			expected: "Text",
		},
		{
			name:     "cursor position",
			input:    "\x1b[10;20HText",
			expected: "Text",
		},
		{
			name:     "erase line",
			input:    "\x1b[2KText",
			expected: "Text",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StripANSI(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestStripANSI_OSCSequences(t *testing.T) {
	// Test: OSC sequences (window title, etc.) are stripped
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "window title with BEL",
			input:    "\x1b]0;Claude Code\aText",
			expected: "Text",
		},
		{
			name:     "window title with ST",
			input:    "\x1b]0;Claude Code\x1b\\Text",
			expected: "Text",
		},
		{
			name:     "hyperlink",
			input:    "\x1b]8;;https://example.com\aLink\x1b]8;;\a",
			expected: "Link",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StripANSI(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestStripANSI_ModeSequences(t *testing.T) {
	// Test: Private mode sequences are stripped
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "bracketed paste mode",
			input:    "\x1b[?2004hText\x1b[?2004l",
			expected: "Text",
		},
		{
			name:     "hide cursor",
			input:    "\x1b[?25lText\x1b[?25h",
			expected: "Text",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StripANSI(tt.input)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestStripANSI_MixedContent(t *testing.T) {
	// Test: Real-world mixed content from Claude CLI
	input := "\x1b[?25l\x1b[38;2;215;119;87m✻\x1b[39m Nucleating…\x1b[6A\x1b[11C\x1b[?25h"
	expected := "✻ Nucleating…"

	result := StripANSI(input)
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestStripANSI_PreservesNewlines(t *testing.T) {
	// Test: Newlines and normal whitespace are preserved
	input := "Line 1\nLine 2\n\x1b[32mGreen\x1b[0m\nLine 4"
	expected := "Line 1\nLine 2\nGreen\nLine 4"

	result := StripANSI(input)
	if result != expected {
		t.Errorf("expected %q, got %q", expected, result)
	}
}

func TestStripANSI_EmptyString(t *testing.T) {
	// Test: Empty string returns empty string
	result := StripANSI("")
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}
