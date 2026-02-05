# ADR-001: Migrate from PTY/tmux to Go SDK for Agent Spawning

**Status:** Accepted
**Date:** 2026-02-05
**Deciders:** @deligoez

## Context

AXIOM needs to spawn Claude Code CLI agents programmatically and capture their streaming output in real-time. The initial implementation used two approaches:

1. **PTY-based** (`creack/pty`) - Direct pseudo-terminal control
2. **tmux-based** - Using tmux sessions for interactive mode

Both approaches had significant issues:

### PTY Approach Problems
- Claude Code's Ink-based UI doesn't work well with raw PTY
- ANSI escape code filtering is complex and error-prone
- No native JSON streaming support
- Required custom `StreamCleaner`, `UIDetect`, and `ANSI` filtering code

### tmux Approach Problems
- External dependency on tmux binary
- Hacky workaround for Ink UI limitations
- Complex session management
- Not portable across all environments

## Decision

**Migrate to the official Claude Code headless mode with the Go SDK ([dotcommander/agent-sdk-go](https://github.com/dotcommander/agent-sdk-go)).**

### Key Findings from Research

1. **Claude Code has native headless mode** (`-p` flag with `--output-format stream-json`)
2. **The Go SDK wraps Claude Code CLI** (NOT the Claude API) - no API key required
3. **SDK handles critical bugs** like stdin closure that causes process hanging
4. **Full feature support** for AXIOM's requirements

## Comparison

| Requirement | PTY/tmux | Go SDK |
|-------------|----------|--------|
| Multi-turn conversations | ⚠️ Complex | ✅ Native sessions |
| Real-time streaming | ⚠️ ANSI filtering needed | ✅ JSON events |
| Working directory | ✅ Supported | ✅ `WithCWD()` |
| Custom system prompts | ⚠️ Manual injection | ✅ `WithSystemPrompt()` |
| Tool permissions | ⚠️ Manual flags | ✅ `WithAllowedTools()` |
| Signal parsing | ⚠️ Text parsing | ⚠️ Custom parser (same) |
| Buffer management | ⚠️ Manual | ✅ 1-10MB built-in |
| Error handling | ⚠️ Process signals | ✅ Channel-based |
| Process lifecycle | ⚠️ Manual cleanup | ✅ Managed |

## SDK Features Mapping to AXIOM

```go
client, _ := claude.NewClient(
    claude.WithModel("claude-sonnet-4-20250514"),     // Model selection
    claude.WithSystemPrompt(persona.Prompt),          // Persona prompts
    claude.WithCWD(workspace),                        // Git worktree path
    claude.WithAllowedTools("Bash", "Read", "Edit"),  // Auto-approve tools
    claude.WithTimeout("30m"),                        // Iteration timeout
    claude.WithCustomArgs(                            // Additional flags
        "--verbose",
        "--include-partial-messages",
        "--dangerously-skip-permissions",
    ),
    claude.WithEnv(map[string]string{                 // Environment
        "AXIOM_TASK_ID":  taskID,
        "AXIOM_AGENT_ID": agentID,
    }),
)

// Streaming with channels
msgChan, errChan := client.QueryStream(ctx, prompt)
```

## What We Keep

Some existing code remains useful:

| File | Keep? | Reason |
|------|-------|--------|
| `ansi.go` | ❌ | SDK handles JSON, no ANSI |
| `cleaner.go` | ❌ | SDK handles parsing |
| `uidetect.go` | ❌ | No UI elements in JSON stream |
| `pty.go` | ❌ | Replaced by SDK |
| `interactive.go` | ❌ | Replaced by SDK |
| `embed.go` | ✅ | Persona prompts still needed |

## What We Add

1. **Signal Parser** - Extract `<axiom>SIGNAL:payload</axiom>` from text
2. **Event Router** - Route SDK events to AXIOM components
3. **Session Manager** - Track agent sessions for continuation

## Consequences

### Positive
- Simpler, more maintainable code
- Official support from Claude Code team
- Better error handling and resource management
- Native multi-turn conversation support
- No external dependencies (tmux)

### Negative
- Third-party Go SDK dependency (community maintained)
- SDK updates may lag behind Claude Code CLI changes

### Risks
- SDK maintenance - mitigated by simple wrapper design
- Breaking changes - mitigated by pinning versions

## Implementation Plan

1. Add `github.com/dotcommander/agent-sdk-go` to go.mod
2. Create new `internal/agent/sdk.go` with SDK wrapper
3. Create `internal/agent/signal.go` for AXIOM signal parsing
4. Update `internal/agent/` to use new SDK-based client
5. Remove deprecated PTY/tmux code
6. Update tests

## References

- [Claude Code Headless Docs](https://code.claude.com/docs/en/headless)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Go SDK Repository](https://github.com/dotcommander/agent-sdk-go)
- [Process Hanging Bug Fix](https://github.com/anthropics/claude-code/issues/7497)
