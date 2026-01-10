# Continuity Ledger: Chorus

**Date:** 2026-01-10
**Status:** Phase 4 Task Audit Complete - Ready to Implement

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**MVP:** Semi-auto mode - user selects task, agent completes, stops.

---

## Current State

```
Done: Phases 1-3 (176 tests), F01-F20 Task Audit
Now:  [→] Ready to implement - pick from bd ready
Next: M1 Infrastructure → M4 Semi-Auto
```

**Tasks:** 27 total (9 ready, 18 blocked)

**Audit Summary:**
- All 20 features (F01-F20) verified against plans
- Test counts corrected (many were underestimated)
- 2 incorrect dependencies removed (F09, F10)
- All tasks now TDD-ready with explicit criteria

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
| ch-k3d | F10 Test Runner | M3 |
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

### 2026-01-10: Feature Plan → Task Alignment Audit

**Session Goal:** Ensure all feature plans are fully represented in Beads tasks

**Verified Features:** F01-F20 (M1-M4) ✅ COMPLETE

**Changes Made:**

1. **F01 Config System**
   - F01b (ch-sro): Added `get()`, `exists()` methods, +1 test
   - F01c (ch-y43): Added `update(partial)`, +2 validation tests

2. **F02 State System**
   - F02b (ch-81x): Added `load() validates structure` test
   - **NEW F02e (ch-tpj)**: Created for merge queue ops
     - `enqueueMerge()`, `dequeueMerge()`, `updateMergeItem()`
     - `incrementStat()`, `update(partial)`
     - 5 tests

3. **F04 Worktree Create**
   - Added `exists()`, `getPath()`, `getBranch()`, `list()` methods
   - Tests: 5 → 7

4. **F05 Worktree Cleanup**
   - Added `isBranchMerged()`, `prune()` methods
   - Tests: 5 → 6

5. **F06 Worktree Query**
   - Added `removeAll()` method
   - Cleaned up overlapping methods (moved to F04/F05)

6. **F07 Prompt Builder**
   - Added explicit API: `buildTaskSection()`, `buildCompletionSection()`, `loadAgentsMd()`, `loadLearnings()`, `needsContextInjection()`

7. **F08 Signal Parser**
   - Added explicit API: `parse()`, `parseAll()`, `hasSignal()`

8. **F09 Agent-Task Linking**
   - Verified complete (no changes needed)

9. **F10 Test Runner**
   - Removed scope creep: "Parses test count if possible"
   - Removed wrong responsibility: "Reads testCommand from ChorusConfig"
   - Fixed: TestRunner receives testCommand as constructor arg (caller provides)
   - Fixed test count: 8 → 6 tests
   - Added missing criteria: duration tracking, exit code 124 on timeout
   - **Removed dependency on F01b** - TestRunner is generic, doesn't need config

10. **F11 Completion Checker**
    - Fixed test count: 10 → 9 tests
    - Added missing method: `hasCompletionSignal()` quick check
    - Added CompletionResult fields to acceptance criteria
    - Dependencies verified correct: F08 + F10

11. **F12 Task Claimer**
    - Fixed test count: 5 → 8 tests
    - Added error handling: `claimTask()` throws on bd error
    - Added edge cases: getTask null, getReadyTasks empty
    - Added `isInitialized()` test (method existed in API but no test)
    - No dependencies (correct)

12. **F13 Task Closer**
    - Fixed test count: 5 → 8 tests
    - Added 4 missing methods: `reopenTask()`, `getTaskStatus()`, `getInProgressTasks()`, `getClosedTasks()`
    - Added error handling: `closeTask()` throws on bd error
    - Removed wrong criteria: "Returns success/failure" (void return)
    - Dependency verified correct: F12

13. **F14 Dependency Resolver**
    - Fixed test count: 8 → 13 tests
    - Added 2 missing methods from API: `isDependencySatisfied()`, `getDependents()`
    - Organized acceptance criteria by method (TDD-friendly)
    - Dependency verified correct: F12

14. **F15 Orchestrator Core** (largest feature)
    - Fixed test count: 15 → 18 tests
    - Added types to criteria: AssignmentResult, OrchestratorConfig, TaskAssignment
    - Organized by method: assignTask (9), canAssign (5), getAgentType (2), helpers (2)
    - Added missing helper tests: getTask, getReadyTasks, getAgentConfig
    - Dependencies verified correct: F06, F07, F09, F12
    - Kept as single task (methods tightly coupled)

15. **F16 Completion Handler** (split into F16a + F16b)
    - F16a (ch-7jw): Added types to criteria, organized by method, 5 tests
    - F16b (ch-lhm): Fixed test count 5 → 6, organized by method
    - Total: 11 tests (5 + 6)
    - Dependencies verified: F16a→F11,F13; F16b→F16a

16. **F17 Semi-Auto Mode**
    - Fixed test count: 8 → 11 tests
    - Added types: SemiAutoConfig, SemiAutoStatus
    - Added missing methods: getStatus(), isIdle()
    - Organized by method: startTask (4), cancelTask (3), completion (4)
    - Dependencies verified: F15, F16b

17. **F18 Task Selection UI** (split into F18a + F18b)
    - F18a (ch-9fq): Fixed test count 4 → 6, added interface + methods
    - F18b (ch-e7f): Adjusted test count, added visual + keyboard + components
    - Total: 10 tests (6 + 4)
    - Dependencies verified: F18a→F17; F18b→F18a

18. **F19 Orchestration Store**
    - Fixed test count: 8 → 12 tests
    - Added types: OperatingMode, OrchestrationStatus, State, Actions
    - Organized by method groups (mode, status, task, stats, autopilot)
    - No dependencies (correct)

19. **F20 useOrchestration Hook**
    - Fixed test count: 8 → 10 tests
    - Added interface: UseOrchestrationResult
    - Organized: initialization, actions, events, derived
    - Dependencies verified: F15, F16b, F17, F19

**AUDIT COMPLETE:** All F01-F20 verified and updated

### 2026-01-10: Dependency Audit
- Verified all 26 tasks against feature plans
- **Fixed**: F09 (ch-3y0) had incorrect dep on F02b (ch-81x)
  - F09 = Agent type extension (agentStore)
  - F02b = ChorusState init (unrelated)
- **Fixed**: F10 (ch-k3d) had incorrect dep on F01b (ch-sro)
  - F10 = Generic TestRunner (receives testCommand as arg)
  - F01b = Config loading (caller's responsibility)
  - Now: 9 ready, 18 blocked
- All tasks are TDD-suitable (clear test cases, atomic scope)
