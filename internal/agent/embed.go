// Package agent provides agent-related functionality including prompt templates.
package agent

import _ "embed"

// AvaPromptTemplate contains the embedded Ava prompt template.
//
//go:embed prompts/ava.md.tmpl
var AvaPromptTemplate string
