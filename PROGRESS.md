# AXIOM Development Progress

## How to Use
- Check this file at session start
- Update after completing each milestone (Grey task)
- `bd ready -n 0` for immediate next task

---

## Current Work

Next milestone to be determined. Run `bd ready -n 0` for available tasks.

---

## Completed Milestones

### MVP-07: Persistent Tmux Agent ✓
- **Goal:** Single persistent Claude process for multi-turn conversation
- **Status:** DONE
- **Problem solved:**
  - Claude CLI uses ink-based custom input widget
  - PTY stdin writes appear but don't submit (ink limitation)
  - Solution: Use tmux send-keys (based on Gastown's production pattern)
- **What was built:**
  - Tmux package: Session management for Claude CLI (internal/tmux/tmux.go)
  - ClaudeSession: High-level API for Claude interaction
  - InteractiveAgent rewrite: Tmux-based instead of PTY spawning
- **Key insight:**
  - GitHub issue #15553 documents the same problem
  - Gastown uses `tmux send-keys -l` + debounce + `Enter` successfully
  - This is production-tested and works with ink-based CLIs
- **Pattern:**
  ```go
  // Send text using literal mode
  tmux.run("send-keys", "-t", session, "-l", message)
  // Debounce (100ms)
  time.Sleep(100 * time.Millisecond)
  // Send Enter separately
  tmux.run("send-keys", "-t", session, "Enter")
  ```
- **Key files:**
  - internal/tmux/tmux.go (tmux operations)
  - internal/agent/interactive.go (rewritten for tmux)

### MVP-06: Interactive Agent Mode ✓
- **Goal:** Real-time streaming for agent output (character-by-character)
- **Status:** DONE
- **Problem solved:**
  - `--print` mode had no real-time streaming (all output at once)
  - Switched to PTY-based approach with output filtering
- **What was built:**
  - PTYAgent: Process management with pseudo-terminal (internal/agent/pty.go)
  - ANSI Filter: Strip escape sequences (internal/agent/ansi.go)
  - UI Detector: Classify CLI UI elements vs content (internal/agent/uidetect.go)
  - StreamCleaner: Combine filters for clean output (internal/agent/cleaner.go)
  - InteractiveAgent rewrite: PTY + StreamCleaner integration
- **Tasks completed:**
  - ax-7or.1: F01: PTY Agent Spawn
  - ax-7or.2: F02: ANSI Filter
  - ax-7or.3: F03: CLI UI Detector
  - ax-7or.4: F04: Stream Cleaner
  - ax-7or.5: F05: SSE Integration
  - ax-7or.6: F06: Multi-turn Support
- **Key files:**
  - internal/agent/pty.go (PTY process management)
  - internal/agent/ansi.go (ANSI escape stripping)
  - internal/agent/uidetect.go (UI element detection)
  - internal/agent/cleaner.go (stream cleaning)
  - internal/agent/interactive.go (rewritten for PTY)

### MVP-05: Init Mode Web UI ✓
- **Goal:** Ava runs in browser with streaming output
- **Status:** DONE (streaming fixed in MVP-06)
- **What was built:**
  - SSE infrastructure for agent output
  - Init Mode UI (/init page with Ava modal)
  - Config state detection (new/incomplete/complete)
  - Session-based logging (.axiom/agents/ava/logs/)
- **Key files:**
  - internal/agent/interactive.go
  - internal/web/server.go
  - internal/web/templates/layout.html
  - internal/scaffold/scaffold.go

### MVP-04: Ava Init System ✓
- **Goal:** First run spawns Ava for project setup
- **Status:** DONE
- **What was built:**
  - Scaffold system (.axiom/, config.json, ava/prompt.md)
  - Agent spawner (claude --print --system-prompt)
  - Signal parser (<axiom>TYPE:payload</axiom>)
  - Main integration (scaffold → spawn Ava → AVA_COMPLETE)
- **Tasks completed:**
  - ax-tgh: MVP Scaffold System
  - ax-rf9: Signal Format Standardization
  - ax-ab3: Agent Spawner
  - ax-urm: Signal Parser
  - ax-9ik: Main Spawn Ava
  - ax-d0r: Docs Update
- **Key files:**
  - internal/scaffold/scaffold.go
  - internal/agent/spawner.go
  - internal/signal/signal.go
  - cmd/axiom/main.go

### m0-bootstrap: Project Setup ✓
- **Status:** DONE

### MVP-01: Walking Skeleton ✓
- **Goal:** See a web page with header/footer
- **Status:** DONE

### MVP-02: Task List UI ✓
- **Goal:** See a task list in UI with hardcoded data
- **Status:** DONE

### MVP-03: Tasks from Storage ✓
- **Goal:** Read tasks from JSONL file
- **Status:** DONE

### Refactor: Task to Case Migration ✓
- **Goal:** Align implementation with docs/04-cases.md
- **Status:** DONE

---

## Architecture Summary

### Startup Flow
```
axiom command
     ↓
.axiom/ exists? ─No─→ Scaffold → Init Mode
     ↓                              ↓
    Yes                    Server starts (/init)
     ↓                              ↓
Server starts (/)          Browser opens /init
                                    ↓
                           SSE spawns Ava (streaming)
                                    ↓
                           AVA_COMPLETE → redirect /
```

### Agent Spawning (Tmux-Based)
```go
// Create persistent session
session := tmux.NewClaudeSession("agent-name", workDir)
session.Start(systemPrompt)
session.WaitForPrompt(30 * time.Second)

// Send messages (multi-turn, context preserved)
session.SendMessage("First question")
session.SendMessage("Follow-up question")

// Cleanup
session.Stop()
```

### Signal Format
```
<axiom>TYPE</axiom>
<axiom>TYPE:payload</axiom>
```

---

## Infrastructure Reference

- `docs/04-cases.md` - Case types, CaseStore API
- `docs/01-configuration.md` - Config system
- `docs/05-agents.md` - Agent system
- `docs/06-integration.md` - Merge service
- `docs/07-execution.md` - Execution loop
- `docs/10-interface.md` - Web UI

---

## Session Continuity

After `/clear` or new session:
1. `cat PROGRESS.md` - Where are we?
2. `bd ready -n 0` - What's next?
3. Continue from Current Work section
