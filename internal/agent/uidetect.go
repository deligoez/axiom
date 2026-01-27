// Package agent provides agent spawning and management for AXIOM.
package agent

import (
	"regexp"
	"strings"
)

// LineType represents the classification of a line of output.
type LineType int

const (
	// LineContent is normal assistant output that should be displayed.
	LineContent LineType = iota
	// LineUIElement is CLI UI noise that should be filtered out.
	LineUIElement
)

// UI detection patterns
var (
	// Status bar patterns
	tokenPattern = regexp.MustCompile(`Tokens:\s*\d+`)
	costPattern  = regexp.MustCompile(`Cost:\s*\$[\d.]+`)
	modelPattern = regexp.MustCompile(`Model:\s*claude-`)

	// Spinner/progress patterns
	spinnerSymbols  = []string{"·", "✢", "✳", "✶", "✻", "*"}
	progressPattern = regexp.MustCompile(`\d+%\s*(complete|done)?`)

	// Tool execution patterns
	toolRunPattern = regexp.MustCompile(`^(Running|Executing|Reading|Writing)\s+\w+`)

	// IDE/status keywords
	ideKeywords = []string{
		"Ctrl+C",
		"bypass permissions",
		"/ide for",
		"shift+Tab",
		"Tab to cycle",
	}

	// Progress indicator words (with ellipsis)
	progressWords = []string{
		"Nucleating",
		"Thinking",
		"Processing",
		"Working",
	}
)

// ClassifyLine determines if a line is UI noise or actual content.
func ClassifyLine(line string) LineType {
	// Empty lines are content (preserve formatting)
	if line == "" {
		return LineContent
	}

	// Check for status bar patterns
	if tokenPattern.MatchString(line) ||
		costPattern.MatchString(line) ||
		modelPattern.MatchString(line) {
		return LineUIElement
	}

	// Check for spinner symbols at start of line
	trimmed := strings.TrimSpace(line)
	for _, sym := range spinnerSymbols {
		if strings.HasPrefix(trimmed, sym) {
			return LineUIElement
		}
	}

	// Check for progress percentage
	if progressPattern.MatchString(line) {
		return LineUIElement
	}

	// Check for progress indicator words
	for _, word := range progressWords {
		if strings.Contains(line, word) {
			return LineUIElement
		}
	}

	// Check for IDE/status keywords
	for _, keyword := range ideKeywords {
		if strings.Contains(line, keyword) {
			return LineUIElement
		}
	}

	// Check for tool execution headers
	if toolRunPattern.MatchString(trimmed) {
		return LineUIElement
	}

	// Check for input prompts
	if strings.HasPrefix(trimmed, "❯") || trimmed == ">" {
		return LineUIElement
	}

	return LineContent
}
