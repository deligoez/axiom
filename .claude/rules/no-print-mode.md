# No Print Mode Rule

**CRITICAL: NEVER use `-p` or `--print` flag when spawning Claude CLI.**

## Why

The `-p`/`--print` flag causes:
1. **No real-time streaming** - All output arrives at once after CLI completes
2. **Process exit after response** - Can't maintain persistent conversation
3. **Poor UX** - Users can't see live agent thinking/output

## Correct Approach

Use **PTY-based interactive mode**:
- Start Claude without `-p` flag
- Write messages to stdin via PTY
- Read output via PTY (real-time, character-by-character)
- Filter ANSI codes and UI elements using StreamCleaner

## Code Pattern

```go
// WRONG - spawns new process, no streaming
args := []string{"-p", message}

// RIGHT - persistent process, real-time streaming
args := []string{"--dangerously-skip-permissions"}
// Then use pty.Write(message + "\n") to send messages
```

## Files to Check

If modifying agent spawning code, ensure:
- `internal/agent/interactive.go` - NO `-p` flag
- `internal/agent/pty.go` - Use Write() for messages
- Any new agent code - Follow PTY pattern

## Historical Context

MVP-06 discovered that `--print` mode (with `--output-format stream-json --verbose`)
does NOT provide real-time streaming despite the "stream" in the name. All output
arrives as a batch after the CLI completes. This breaks the multi-agent orchestration
UX where users expect to see live agent output.

The solution was to switch to PTY-based approach:
1. PTYAgent manages pseudo-terminal process
2. StreamCleaner filters ANSI codes and UI elements
3. Real-time output reaches the user character-by-character
