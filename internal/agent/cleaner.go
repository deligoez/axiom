// Package agent provides agent spawning and management for AXIOM.
package agent

import (
	"regexp"
	"strings"
)

// CleanerStage represents a single cleaning operation in the pipeline.
type CleanerStage func(input string) string

// StreamCleaner processes raw terminal output through a pipeline of cleaning stages.
// It's designed to be extensible for future cleaning requirements.
type StreamCleaner struct {
	buffer     strings.Builder
	stages     []CleanerStage
	response   strings.Builder // Accumulates extracted response content
	inResponse bool            // Tracks if we're inside a response block (for extractResponse)
}

// NewStreamCleaner creates a new StreamCleaner with default cleaning stages.
// Default pipeline: ANSI strip → UI filter (passes all non-UI content).
func NewStreamCleaner() *StreamCleaner {
	c := &StreamCleaner{}
	// Default pipeline: ANSI → UI Filter (content passes through)
	c.stages = []CleanerStage{
		StripANSI,
		filterUILines,
	}
	return c
}

// NewStreamCleanerWithResponseExtraction creates a StreamCleaner that extracts
// only Claude's response content (marked with ⏺).
// Use this for interactive Claude CLI sessions where response boundaries matter.
func NewStreamCleanerWithResponseExtraction() *StreamCleaner {
	c := &StreamCleaner{}
	// Extended pipeline: ANSI → Response Extract → UI Filter
	// Note: extractResponse must come BEFORE filterUILines so it can see ❯ markers
	c.stages = []CleanerStage{
		StripANSI,
		c.extractResponse,
		filterUILines,
	}
	return c
}

// NewStreamCleanerWithStages creates a StreamCleaner with custom stages.
func NewStreamCleanerWithStages(stages ...CleanerStage) *StreamCleaner {
	return &StreamCleaner{
		stages: stages,
	}
}

// AddStage appends a cleaning stage to the pipeline.
func (c *StreamCleaner) AddStage(stage CleanerStage) {
	c.stages = append(c.stages, stage)
}

// Process takes raw terminal output and returns clean text.
// Partial lines are buffered until a newline is received.
func (c *StreamCleaner) Process(chunk string) string {
	// Add chunk to buffer
	c.buffer.WriteString(chunk)

	// Get complete content
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

	// Run through pipeline
	result := completeLines
	for _, stage := range c.stages {
		result = stage(result)
	}

	return result
}

// Flush returns any remaining buffered content after processing.
func (c *StreamCleaner) Flush() string {
	if c.buffer.Len() == 0 {
		return ""
	}

	content := c.buffer.String()
	c.buffer.Reset()

	// Run through pipeline
	result := content
	for _, stage := range c.stages {
		result = stage(result)
	}

	return result
}

// GetFullResponse returns the complete accumulated response.
func (c *StreamCleaner) GetFullResponse() string {
	return c.response.String()
}

// Reset clears all buffers for a new message.
func (c *StreamCleaner) Reset() {
	c.buffer.Reset()
	c.response.Reset()
	c.inResponse = false
}

// ============================================================================
// Built-in Cleaning Stages
// ============================================================================

// filterUILines removes UI element lines from the input.
func filterUILines(input string) string {
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

// Claude response marker patterns
var (
	// ⏺ marks the start of Claude's response
	responseMarker = "⏺"
	// ❯ marks the input prompt
	promptMarker = "❯"
	// Lines that are definitely not content
	noisePatterns = []*regexp.Regexp{
		regexp.MustCompile(`^\s*$`),                    // Empty/whitespace only
		regexp.MustCompile(`^[-─━═]+$`),                // Horizontal lines
		regexp.MustCompile(`Press.*to.*`),              // Key hints
		regexp.MustCompile(`\(.*to (cycle|interrupt)`), // Mode hints
	}
)

// extractResponse extracts actual Claude response content.
// It identifies response blocks that start with ⏺ and end with ❯.
// State (inResponse) is preserved across calls.
func (c *StreamCleaner) extractResponse(input string) string {
	lines := strings.Split(input, "\n")
	var result strings.Builder

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty split artifact at end
		if i == len(lines)-1 && trimmed == "" {
			continue
		}

		// Check for response marker (start of response)
		if strings.HasPrefix(trimmed, responseMarker) {
			c.inResponse = true
			// Extract content after marker
			content := strings.TrimPrefix(trimmed, responseMarker)
			content = strings.TrimSpace(content)
			if content != "" {
				result.WriteString(content)
				result.WriteString("\n")
				c.response.WriteString(content)
				c.response.WriteString("\n")
			}
			continue
		}

		// Check for prompt marker (end of response)
		if strings.HasPrefix(trimmed, promptMarker) {
			c.inResponse = false
			continue
		}

		// If we're in a response block, include the line
		if c.inResponse {
			// Skip noise patterns
			isNoise := false
			for _, pattern := range noisePatterns {
				if pattern.MatchString(trimmed) {
					isNoise = true
					break
				}
			}

			if !isNoise && trimmed != "" {
				result.WriteString(line)
				result.WriteString("\n")
				c.response.WriteString(line)
				c.response.WriteString("\n")
			}
		}
	}

	return result.String()
}

// ============================================================================
// Additional Cleaning Utilities
// ============================================================================

// NormalizeWhitespace collapses multiple spaces and trims lines.
func NormalizeWhitespace(input string) string {
	lines := strings.Split(input, "\n")
	var result strings.Builder

	for _, line := range lines {
		// Collapse multiple spaces
		normalized := regexp.MustCompile(`\s+`).ReplaceAllString(line, " ")
		normalized = strings.TrimSpace(normalized)
		if normalized != "" {
			result.WriteString(normalized)
			result.WriteString("\n")
		}
	}

	return result.String()
}

// RemoveDuplicateLines removes consecutive duplicate lines.
func RemoveDuplicateLines(input string) string {
	lines := strings.Split(input, "\n")
	var result strings.Builder
	var lastLine string

	for _, line := range lines {
		if line != lastLine {
			result.WriteString(line)
			result.WriteString("\n")
			lastLine = line
		}
	}

	return result.String()
}

// TrimTerminalArtifacts removes common terminal rendering artifacts.
func TrimTerminalArtifacts(input string) string {
	// Remove cursor positioning artifacts
	result := regexp.MustCompile(`\x1b\[\d*[ABCDK]`).ReplaceAllString(input, "")
	// Remove carriage returns (overwrites)
	result = strings.ReplaceAll(result, "\r", "")
	return result
}
