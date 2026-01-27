// Package agent provides agent spawning and management for AXIOM.
package agent

import (
	"regexp"
)

// ANSI escape sequence patterns
var (
	// CSI sequences: ESC [ ... <final byte>
	// Handles colors, cursor movement, erase, etc.
	// Pattern: \x1b\[ followed by optional params and intermediate bytes, ending with a letter
	csiPattern = regexp.MustCompile(`\x1b\[[0-9;?]*[A-Za-z]`)

	// OSC sequences: ESC ] ... (BEL | ST)
	// Handles window title, hyperlinks, etc.
	// BEL = \a = \x07, ST = ESC \ = \x1b\\
	oscPatternBEL = regexp.MustCompile(`\x1b\][^\a]*\a`)
	oscPatternST  = regexp.MustCompile(`\x1b\][^\x1b]*\x1b\\`)
)

// StripANSI removes all ANSI escape sequences from the input string.
// This includes:
// - CSI sequences (colors, cursor movement, erase)
// - OSC sequences (window title, hyperlinks)
// - SGR codes (text styling)
// - Private mode sequences (cursor visibility, bracketed paste)
func StripANSI(input string) string {
	if input == "" {
		return ""
	}

	result := input

	// Remove CSI sequences (most common)
	result = csiPattern.ReplaceAllString(result, "")

	// Remove OSC sequences with BEL terminator
	result = oscPatternBEL.ReplaceAllString(result, "")

	// Remove OSC sequences with ST terminator
	result = oscPatternST.ReplaceAllString(result, "")

	return result
}
