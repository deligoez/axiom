# Continuity Ledger: Chorus

**Date:** 2026-01-10
**Status:** Phase 4 Implementation Ready (176 tests, 26 tasks)

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**MVP:** Semi-auto mode - user selects task, agent completes, stops.

---

## Current State

```
Done: Phases 1-3 (176 tests)
Now:  Phase 4 via Beads tasks
Next: M1 Infrastructure → M4 Semi-Auto
```

**Tasks:** 26 total (8 ready, 18 blocked)

---

## Ready Tasks

```bash
bd ready
```

| ID | Feature | Milestone |
|----|---------|-----------|
| ch-2n6 | F01a Config Types | M1 ← START |
| ch-ah6 | F02a State Types | M1 |
| ch-glq | F04 Worktree Create | M1 |
| ch-wk8 | F07 Prompt Builder | M2 |
| ch-mpl | F08 Signal Parser | M2 |
| ch-3y0 | F09 Agent-Task Linking | M2 |
| ch-zqi | F12 Task Claimer | M3 |
| ch-8j3 | F19 Orchestration Store | M4 |

---

## Workflow

```bash
# 1. Pick task
bd ready
bd update ch-2n6 --status=in_progress

# 2. TDD
# Write tests (RED) → Implement (GREEN) → Commit

# 3. Close
bd close ch-2n6

# 4. Next
bd ready
```

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| TUI Framework | Ink 6.x (React) |
| State | Zustand |
| Task Management | Beads CLI |
| Operating Mode | Semi-auto first, then autopilot |
| Completion | Signal `<chorus>` + Tests (AND) |
| Agent Isolation | Git worktrees |

---

## Architecture

```
ChorusApp (Ink)
    ├── TaskPanel ── beadsStore
    ├── AgentTilingView ── agentStore
    └── StatusBar
            │
    ┌───────┴───────┐
Orchestrator    MergeService
    │
┌───┼───┐
bd  git  agent
```

---

## Milestones

| # | Name | Features | Tests | Status |
|---|------|----------|-------|--------|
| 1 | Infrastructure | F01-F06 | ~30 | [ ] ← NOW |
| 2 | Agent Prep | F07-F09 | ~23 | [ ] |
| 3 | Task Mgmt | F10-F13 | ~28 | [ ] |
| 4 | Orchestration | F14-F20 | ~50 | [ ] **Semi-Auto** |
| 5 | Merge Service | F24-F31 | ~49 | [ ] |
| 6 | Parallelism | F21-F23 | ~25 | [ ] |
| 7 | Autopilot | F32-F38 | ~43 | [ ] **Goal** |

---

## Files

**Plans:**
- `thoughts/shared/plans/features/` - Feature plans
- `thoughts/shared/plans/2026-01-10-chorus-phase4-master.md` - Master tracker

**Task Tracking:**
- `.claude/rules/beads-task-tracking.md` - All task IDs

**Commands:**
```bash
npm test          # 176 tests
bd ready          # Available tasks
bd show <id>      # Task details
bd blocked        # Blocked tasks
```

---

## Notes

- Use `bd --no-daemon` if changes don't persist
- Task prefix: `ch-` (Chorus)
- Feature codes (F##) map to plan files

---

## Audit Log

### 2026-01-10: Dependency Audit
- Verified all 26 tasks against feature plans
- **Fixed**: F09 (ch-3y0) had incorrect dep on F02b (ch-81x)
  - F09 = Agent type extension (agentStore)
  - F02b = ChorusState init (unrelated)
- All other dependencies verified correct
- All tasks are TDD-suitable (clear test cases, atomic scope)
