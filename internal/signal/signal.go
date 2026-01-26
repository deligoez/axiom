// Package signal handles parsing of AXIOM signals from agent output.
package signal

import (
	"regexp"
)

// Signal types used by AXIOM agents.
const (
	AvaComplete = "AVA_COMPLETE"
)

// Signal represents an AXIOM signal extracted from agent output.
type Signal struct {
	Type    string
	Payload string
}

// signalRegex matches <axiom>TYPE</axiom> or <axiom>TYPE:payload</axiom>
var signalRegex = regexp.MustCompile(`<axiom>([A-Z_]+)(?::([^<]+))?</axiom>`)

// Parse extracts all AXIOM signals from the given output text.
// Returns a slice of Signal structs in the order they appear.
func Parse(output string) []Signal {
	matches := signalRegex.FindAllStringSubmatch(output, -1)

	signals := make([]Signal, 0, len(matches))
	for _, match := range matches {
		s := Signal{
			Type: match[1],
		}
		if len(match) > 2 {
			s.Payload = match[2]
		}
		signals = append(signals, s)
	}

	return signals
}
