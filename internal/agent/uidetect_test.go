package agent

import (
	"testing"
)

func TestClassifyLine_Content(t *testing.T) {
	// Test: Normal content returns CONTENT
	tests := []struct {
		name  string
		input string
	}{
		{"plain text", "Hello, this is Claude's response."},
		{"code output", "func main() {"},
		{"markdown", "## Heading"},
		{"empty line", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineContent {
				t.Errorf("expected LineContent, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_StatusBar(t *testing.T) {
	// Test: Status bar patterns are detected
	tests := []struct {
		name  string
		input string
	}{
		{"token count", "Tokens: 1234/8000"},
		{"cost", "Cost: $0.05"},
		{"model", "Model: claude-3-opus"},
		{"combined", "Tokens: 500/8000 | Cost: $0.02 | Model: claude-3-opus"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_Spinner(t *testing.T) {
	// Test: Spinner/progress indicators are detected
	tests := []struct {
		name  string
		input string
	}{
		{"nucleating", "✻ Nucleating…"},
		{"thinking", "· Thinking…"},
		{"processing", "✳ Processing…"},
		{"spinner symbols", "✢ Working"},
		{"percentage", "50% complete"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_IDEStatus(t *testing.T) {
	// Test: IDE status lines are detected
	tests := []struct {
		name  string
		input string
	}{
		{"ctrl-c", "Press Ctrl+C to cancel"},
		{"bypass permissions", "⏵⏵ bypass permissions on"},
		{"ide hint", "◯ /ide for PhpStorm"},
		{"shift tab", "(shift+Tab to cycle)"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_ToolExecution(t *testing.T) {
	// Test: Tool execution headers are detected
	tests := []struct {
		name  string
		input string
	}{
		{"running bash", "Running Bash..."},
		{"executing", "Executing command..."},
		{"reading file", "Reading file.go..."},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_InputPrompt(t *testing.T) {
	// Test: Input prompts are detected
	tests := []struct {
		name  string
		input string
	}{
		{"prompt symbol", "❯ "},
		{"prompt with text", "❯ Try asking something"},
		{"greater than", "> "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}

func TestClassifyLine_HeaderBranding(t *testing.T) {
	// Test: CLI header and branding lines are detected
	tests := []struct {
		name  string
		input string
	}{
		{"claude code version", "Claude Code v2.1.20"},
		{"welcome message", "Welcome back Emre!"},
		{"tips header", "Tips for getting started"},
		{"recent activity", "Recent activity"},
		{"no activity", "No recent activity"},
		{"organization", "ye@deligoz.me's Organization"},
		{"opus model", "Opus 4.5 · Claude Max"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyLine(tt.input)
			if result != LineUIElement {
				t.Errorf("expected LineUIElement, got %v for %q", result, tt.input)
			}
		})
	}
}
