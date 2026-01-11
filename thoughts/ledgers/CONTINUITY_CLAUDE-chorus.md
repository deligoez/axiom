# Continuity Ledger: Chorus

**Date:** 2026-01-11
**Updated:** 2026-01-11T21:30:00Z
**Status:** Memory Daemon Pattern Adaptation COMPLETE

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**Architecture:** Planning-first (Ralph-inspired) → Implementation

---

## Current State

```
Done: [x] Master plan v3.11 complete
      [x] First-Seventh Task Audits (cumulative 119 fixes)
      [x] Memory Daemon pattern analysis (from Continuous-Claude)
      [x] Learning path decision: .agent/ → .claude/rules/
      [x] ch-7jw dependency fix (added ch-9yl)
      [x] ch-a6h (LearningStore) path updated
Now:  [→] TDD implementation ready to begin
Next: Pick first ready task from `bd ready -n 0 | grep -v deferred`
```

**Master Plan:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v3.11)

---

## Memory Daemon Pattern Adaptation (2026-01-11 21:30)

Analyzed Continuous-Claude v3 for architectural ideas applicable to Chorus.

### Key Insight: Memory Daemon → Event-Driven

| Continuous-Claude | Chorus Adaptation |
|-------------------|-------------------|
| Polling daemon (60s) | CompletionHandler event |
| JSONL thinking blocks | Scratchpad learnings |
| pgvector embeddings | File-based store |
| Semantic recall | Claude native read |

### Changes Applied

| # | Change | Rationale |
|---|--------|-----------|
| 1 | ch-7jw → ch-9yl dependency | BUG FIX: CompletionHandler uses LearningExtractor |
| 2 | `.agent/learnings.md` → `.claude/rules/learnings.md` | Claude reads `.claude/rules/` natively |
| 3 | ch-a6h paths updated | Reflect new storage location |
| 4 | Master plan v3.11 | Document daemon pattern adaptation |

### Architecture Decision

**Why `.claude/rules/` instead of `.agent/`?**
- Claude Code auto-loads `.claude/rules/*.md`
- No injection needed for Claude agents (MVP scope)
- ch-eyd (Learning Injector) stays deferred - only needed for non-Claude

### New Key Decision

| # | Decision | Choice |
|---|----------|--------|
| **26** | **Learning Storage Path** | **`.claude/rules/learnings.md`** (Claude reads natively) |

---

## Seventh Task Audit (2026-01-11 19:00)

Deep M8-M12 review with 7 parallel review agents + 6 parallel fix agents.

### Review Statistics

| Milestone | Tasks | OK | Issues |
|-----------|-------|-----|--------|
| M8: Memory | 18 | 17 | 1 (key conflict) |
| M9: Intervention | 10 | 10 | 0 |
| M10: Rollback | 7 | 7 | 0 |
| M11: Hooks | 3 | 3 | 0 |
| M12 TUI Part 1 | 20 | 20 | 0 |
| M12 TUI Part 2 | 27 | 26 | 1 (key conflict) |
| M12 TUI Part 3 | 7 | 6 | 1 (wrong deps) |
| **Total** | **92** | **89** | **3** |

### Fixes Applied (3)

| # | Task | Fix |
|---|------|-----|
| 1 | ch-s8u | `L` → `Ctrl+L` shortcut (master plan compliance) |
| 2 | ch-89dk | Fixed dep direction: now depends on ch-8j3, blocks 10 handlers |
| 3 | Test counts | Verified already correct from previous audit |

### Key Findings

**Key Conflict Resolution:**
- **'L' key conflict FIXED**: ch-u5j (View Learnings) uses 'L' read-only, ch-s8u (Learning Review) now uses 'Ctrl+L'
- **'a' key NO CONFLICT**: ch-jx9 (Autopilot) and ch-6ta (Approve Merge) are context-dependent (handled by Keyboard Router)

**Dependency Architecture Fixed:**
- ch-89dk (Keyboard Router) now correctly:
  - Depends on: ch-8j3 (OrchestrationStore) - for mode/pause context
  - Blocks: 10 key handlers + Full TUI Integration
  - No longer incorrectly depends on individual handlers

**Verified Ready Tasks:** All 52 ready tasks have correct dependencies satisfied. No phantom dependencies found.

---

## Previous Session: Fifth Task Audit (2026-01-11 17:30)

Focused review of M5-M12 milestones with 6 parallel review agents + 6 parallel fix agents.

### Review Statistics

| Milestone | Tasks | OK | Issues |
|-----------|-------|-----|--------|
| M5-M7 | 15 | 14 | 1 (dead deps) |
| M8-M9 | 35 | 35 | 0 (all compliant) |
| M10-M11 | 9 | 8 | 1 (wrong dep) |
| M12 TUI Part 1 | 20 | 16 | 4 (test counts) |
| M12 TUI Part 2 | 19 | 16 | 3 (duplicate, deps, key) |
| M12 TUI Part 3 | 4 | 4 | 0 (all pass) |
| **Total** | **102** | **93** | **9** |

### Fixes Applied (10)

| # | Task | Fix |
|---|------|-----|
| 1 | ch-3pa | Removed dead deps (ch-19o, ch-cu1) |
| 2 | ch-mnd | Test count: 7→8 |
| 3 | ch-3na | Test count: 8→9 |
| 4 | ch-nvo | Test count: 9→10 |
| 5 | ch-hhh | Test count: 12→11 |
| 6 | ch-oifw | **Closed as duplicate** of ch-bny |
| 7 | ch-89dk | Updated dep: ch-oifw→ch-bny |
| 8 | ch-b8l | Added missing dep: ch-akb |
| 9 | ch-ozc | Removed wrong dep ch-zqi (now READY!) |
| 10 | ch-6ta | Key changed: 'm'→'a' (conflict fix) |

### Design Decisions Verified

- **'r' key context-dependent**: Keyboard Router handles correctly
  - failed/timeout task → retry (ch-kns, priority 100)
  - normal task → redirect (ch-nggj, priority 50)
- **'M' vs 'm'**: No conflict - M (shift) = merge view, m = mode toggle
- **'a' for approve**: Changed from 'm' to avoid mode toggle conflict

---

## Sixth Task Audit (2026-01-11 18:15)

Comprehensive M5-M12 review with 5 parallel review agents + 6 parallel fix agents.

### Review Statistics

| Milestone | Tasks | OK | Issues |
|-----------|-------|-----|--------|
| M5: Merge Service | 10 | 10 | 0 |
| M6: Parallelism | 1 | 1 | 0 |
| M7: Autopilot | 4 | 4 | 0 |
| M8: Memory | 18 | 16 | 2 |
| M9: Intervention | 12 | 11 | 1 |
| M10: Rollback | 6 | 6 | 0 |
| M11: Hooks | 3 | 3 | 0 |
| M12: TUI | 35 | 30 | 5 |
| **Total** | **89** | **81** | **8** |

### Fixes Applied (6)

| # | Task | Fix |
|---|------|-----|
| 1 | ch-cjf | `LearningCategory` → `LearningScope` |
| 2 | ch-s8u | `Ctrl+L` → `L` shortcut |
| 3 | ch-6ta | Key 'm' → 'a', added acceptance criteria, label → m12-tui |
| 4 | ch-3ji | Removed ch-mnd dep, added state.json test (5→6 tests) |
| 5 | ch-bny | Label m9-intervention → m12-tui |
| 6 | ch-oifw | Confirmed closed (duplicate of ch-bny) |

### New Tasks Created (2)

| Task | Feature | Milestone |
|------|---------|-----------|
| ch-v31l | F51c: Disk Space Monitor (ENOSPC) | M10 |
| ch-zi33 | F42c: TUI Pattern Review Dialog | M12 |

### Missing Task Analysis

| Feature | Status |
|---------|--------|
| Agent Stuck Detection | ✅ Already covered by ch-1hq (F32d) |
| Disk Space Monitor | ✅ Created ch-v31l |
| Pattern Review Dialog | ✅ Created ch-zi33 |

---

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 10 | MVP Scope | Claude-only (codex/opencode deferred) |
| 11 | Architecture | Planning-first (Ralph-inspired) |
| 12 | Config format | JSON (config) + Markdown (rules, patterns) |
| 13 | Quality gates | Flexible qualityCommands[] |
| 14 | Context strategy | MVP: Claude compact; Post-MVP: custom ledger |
| 15 | Planning strategy | Incremental (just-in-time) with manual triggers |
| 16 | Post-task ordering | Plan Review → Task Creation (no race condition) |
| 17 | Worktree Path | `.worktrees/` at project root (canonical) |
| 18 | Conflict Classification | SIMPLE/MEDIUM/COMPLEX (not trivial/semantic) |
| 19 | State Extensions | paused, priority, enqueuedAt, totalIterations |
| 20 | Iteration Boundaries | State-based tracking in ChorusState.agents |
| 21 | Phantom Dependencies | ch-999 (F15b) is valid task |
| 22 | Focus State | TwoColumnLayout owns focus, exposes callback |
| 23 | Merge Approve Key | 'a' (not 'm' to avoid mode toggle conflict) |
| **24** | **Learning Review Key** | **'Ctrl+L' (not 'L' - 'L' is view-only)** |
| **25** | **Keyboard Router Deps** | **Router depends on OrchestrationStore, handlers depend on Router** |
| **26** | **Learning Storage Path** | **`.claude/rules/learnings.md` (Claude reads natively)** |

---

## Task Statistics

```
Total Tasks:     164
Active:          161 (non-deferred)
Deferred:        3   (non-Claude agent support)
Ready:           52  (dependencies satisfied)
```

### Deferred Tasks
- ch-q1j (F07b) - Non-Claude Context Injection
- ch-jbe (F03c) - Non-Claude CLI Detection
- ch-eyd (F42) - Learning Injector

---

## Commands

```bash
# Task management
bd list -n 0                          # All tasks (164)
bd ready -n 0 | grep -v deferred      # Ready tasks (52)
bd show <id>                          # View task spec

# Start implementation
bd update <id> --status=in_progress   # Start task
bd close <id>                         # Complete task

# Verify counts
bd list -n 0 --status=open | wc -l    # Should be 164
```

---

## Key Files

- Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md`
- Task Rules: `.claude/rules/beads-task-tracking.md`
- This Ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-chorus.md`

---

## Resume Instructions

After `/clear`:
1. Read this ledger (auto-loaded by hook)
2. Seven audits complete - 164 tasks, 52 ready for TDD implementation
3. Pick first ready task: `bd ready -n 0 | grep -v deferred | head -5`
4. Start with: `bd update <id> --status=in_progress`
5. Follow TDD: RED → GREEN → COMMIT
6. Close task: `bd close <id>`
