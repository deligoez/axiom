// Package agent provides agent spawning and management for AXIOM.
package agent

import (
	"strings"
)

// StreamCleaner processes raw PTY output and produces clean text.
// It combines ANSI stripping and UI element filtering.
type StreamCleaner struct {
	buffer strings.Builder
}

// NewStreamCleaner creates a new StreamCleaner instance.
func NewStreamCleaner() *StreamCleaner {
	return &StreamCleaner{}
}

// Process takes raw PTY output and returns clean text.
// Partial lines are buffered until a newline is received.
// Returns empty string if all content was UI noise or partial.
func (c *StreamCleaner) Process(chunk string) string {
	// Step 1: Strip ANSI codes
	cleaned := StripANSI(chunk)

	// Step 2: Add to buffer
	c.buffer.WriteString(cleaned)

	// Step 3: Process complete lines
	content := c.buffer.String()

	// Find last newline
	lastNewline := strings.LastIndex(content, "\n")
	if lastNewline == -1 {
		// No complete lines yet, keep buffering
		return ""
	}

	// Split into complete lines and remaining partial
	completeLines := content[:lastNewline+1]
	remaining := content[lastNewline+1:]

	// Reset buffer with remaining partial line
	c.buffer.Reset()
	c.buffer.WriteString(remaining)

	// Step 4: Filter UI elements from complete lines
	return filterLines(completeLines)
}

// Flush returns any remaining buffered content.
// Call this when the stream ends to get any partial line.
func (c *StreamCleaner) Flush() string {
	if c.buffer.Len() == 0 {
		return ""
	}

	content := c.buffer.String()
	c.buffer.Reset()

	// Don't filter the last partial line - it might be incomplete
	// and we want to preserve whatever content is there
	return content
}

// filterLines removes UI element lines from the input.
func filterLines(input string) string {
	lines := strings.Split(input, "\n")
	var result strings.Builder

	for i, line := range lines {
		// Skip empty split artifact at end
		if i == len(lines)-1 && line == "" {
			continue
		}

		// Classify and filter
		if ClassifyLine(line) == LineContent {
			result.WriteString(line)
			result.WriteString("\n")
		}
	}

	return result.String()
}
