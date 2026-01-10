# Continuity Ledger: Chorus

**Date:** 2026-01-10
**Status:** M5-M7 Plans Complete - Ready to Implement

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**MVP:** Semi-auto mode → **Autopilot (F32 Ralph Loop)**

---

## Current State

```
Done: Phases 1-3 (176 tests), F01-F32 Task Audit
Now:  [→] Ready to implement - pick from bd ready
Next: M1 Infrastructure → M7 Autopilot
```

**Tasks:** 37 total (11 ready, 26 blocked)

**Session Summary (M5-M7 Audit):**
- Created 9 new plans: F22, F24-F31
- Created 10 new tasks for M5-M7
- Audited all M5-M7 features for TDD
- Fixed test counts and dependencies

---

## Ready Tasks

```bash
bd ready
```

| ID | Feature | Milestone |
|----|---------|-----------|
| ch-2n6 | F01a Config Types | M1 |
| ch-ah6 | F02a State Types | M1 |
| ch-glq | F04 Worktree Create | M1 |
| ch-wk8 | F07 Prompt Builder | M2 |
| ch-mpl | F08 Signal Parser | M2 |
| ch-3y0 | F09 Agent-Task Linking | M2 |
| ch-k3d | F10 Test Runner | M3 |
| ch-zqi | F12 Task Claimer | M3 |
| ch-8j3 | F19 Orchestration Store | M4 |
| ch-i9i | F22 Slot Manager | M6 |
| ch-glf | F24 Merge Queue | M5 |

---

## New M5-M7 Tasks

### M5: Merge Service
| Feature | ID | Tests | Deps |
|---------|-----|-------|------|
| F24 Merge Queue | ch-glf | 9 | - |
| F25 Merge Worker | ch-fe5 | 9 | F24 |
| F26 Conflict Classifier | ch-7pb | 11 | F25 |
| F27 Auto-Resolver | ch-t31 | 6 | F26 |
| F28 Rebase-Retry | ch-xn6 | 6 | F26 |
| F29 Resolver Agent | ch-9sj | 9 | F28 |
| F30 Human Escalation | ch-26c | 7 | F29 |
| F31 Merge Service | ch-8ee | 5 | F24-F30 |

### M6: Parallelism
| Feature | ID | Tests | Deps |
|---------|-----|-------|------|
| F22 Slot Manager | ch-i9i | 8 | - |

### M7: Autopilot
| Feature | ID | Tests | Deps |
|---------|-----|-------|------|
| F32 Ralph Loop | ch-5tj | 18 | F15,F16b,F22,F31 |

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

## Commands

```bash
npm test          # 176 tests
bd ready          # Available tasks
bd show <id>      # Task details
bd blocked        # Blocked tasks
```

---

## Audit Log

### 2026-01-10: M5-M7 Plans & Tasks Created

**Session Goal:** Create plans and tasks for F22, F24-F32 (Ralph Loop dependencies)

**New Plans Created:**
- F22-slot-manager.md (8 tests)
- F24-merge-queue.md (9 tests)
- F25-merge-worker.md (9 tests)
- F26-conflict-classifier.md (11 tests)
- F27-auto-resolver.md (6 tests)
- F28-rebase-retry.md (6 tests)
- F29-resolver-agent.md (9 tests)
- F30-human-escalation.md (7 tests)
- F31-merge-service.md (5 tests)

**Test Count Fixes:**
| Feature | Old | New |
|---------|-----|-----|
| F22 | 5 | 8 |
| F24 | 8 | 9 |
| F25 | 8 | 9 |
| F26 | 10 | 11 |
| F27 | 5 | 6 |
| F28 | 5 | 6 |
| F29 | 8 | 9 |
| F30 | 5 | 7 |
| F31 | 0 | 5 |
| F32 | 15 | 18 |

**Dependency Fixes:**
- F32: Added F15 (Orchestrator) - was missing!
- F32 now has 4 deps: F15, F16b, F22, F31

**AUDIT COMPLETE:** F22-F32 verified and TDD-ready
