# AXIOM Development Progress

## How to Use
- Check this file at session start
- Update after completing each milestone (Grey task)
- `bd ready -n 0` for immediate next task

---

## Current Work

**No active tasks** - Clean slate!

Next steps to consider:
- Test Ava end-to-end (manual integration test)
- Implement Axel (planning agent)
- Implement Echo (implementation agent)

---

## Completed Milestones

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
.axiom/ exists? ─No─→ Scaffold
     ↓                    ↓
    Yes              Spawn Ava
     ↓                    ↓
Start server      AVA_COMPLETE?
                       ↓
                  Start server
```

### Agent Spawning
```bash
claude --print --dangerously-skip-permissions --system-prompt "$(cat prompt.md)"
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
