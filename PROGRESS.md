# AXIOM Development Progress

## How to Use
- Check this file at session start
- Update after completing each milestone (Grey task)
- `bd ready -n 0` for immediate next task

---

## Current Work

**MVP-06: Interactive Agent Mode**

Goal: Real-time streaming for agent output (character-by-character)

Problem discovered:
- `--print` mode gives clean JSON but NO real-time streaming
- All output arrives at once after CLI completes
- This breaks "live output" UX for multi-agent orchestration

Solution:
- Use full interactive mode (PTY) with output filtering
- Filter out CLI UI garbage (status bars, ANSI codes, etc.)
- Keep real-time character streaming

Next steps:
1. Create atomic tasks for interactive mode implementation
2. Implement PTY-based agent with filtering
3. Test with Ava and longer-running agents

---

## Completed Milestones

### MVP-05: Init Mode Web UI ⚠️
- **Goal:** Ava runs in browser with streaming output
- **Status:** PARTIAL - UI works, but no real-time streaming
- **What was built:**
  - SSE infrastructure for agent output
  - InteractiveAgent with --print mode (batch output)
  - Init Mode UI (/init page with Ava modal)
  - Config state detection (new/incomplete/complete)
  - Session-based logging (.axiom/agents/ava/logs/)
- **Issue discovered:**
  - `--print` mode gives all output at once, not streamed
  - Real-time streaming requires interactive mode + filtering
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

### Agent Spawning
```go
// Blocking (for simple use)
output, err := agent.Spawn(promptPath, message)

// Streaming (for UI)
lines, done, err := agent.SpawnStreaming(promptPath, message)
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
