# Continuity Ledger: Chorus

**Date:** 2026-01-10
**Status:** Master Plan Review Complete - Ready for Implementation

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**MVP:** Semi-auto mode → **Autopilot (F32 Ralph Loop)**

---

## Current State

```
Done: Master Plan Review complete, All 90 tasks in Beads
Now:  [→] Ready to start implementation
Next: Pick tasks from `bd ready` and implement with TDD
```

**Tasks:** 95 total (32 ready, 63 blocked including 3 deferred)

**Architecture:**
- Beads CLI = single source of truth (no feature plan files)
- `bd show <id>` = full spec for any task
- `bd ready` = next available tasks
- Master plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (design only)

---

## Milestones

| # | Milestone | Features | Status |
|---|-----------|----------|--------|
| M1 | Infrastructure | F01-F06 | Ready to start |
| M2 | Agent Prep | F07-F09 | F07 blocked by F01a |
| M3 | Task Mgmt | F10-F13, F63e | Partially ready |
| M4 | Orchestration | F14-F20, F63c | Blocked |
| M5 | Merge Service | F24-F31, F63i | F24 ready |
| M6 | Parallelism | F22 | Ready |
| M7 | Autopilot | F32a-b | Blocked |
| M8 | Memory System | F39-F42b | F39a ready |
| M9 | Intervention | F43-F46c | F43a ready |
| M10 | Rollback | F47-F51 | F47 ready |
| M11 | Hooks | F52-F54 | F52 ready |
| M12 | TUI + Shortcuts | F55-F63 | 14 ready |

---

## Ready Tasks (29)

```bash
bd ready -n 0
```

### Core (15)
| ID | Feature | Milestone |
|----|---------|-----------|
| ch-2n6 | F01a Config Types | M1 |
| ch-ah6 | F02a State Types | M1 |
| ch-0z7 | F03a Init Prerequisites | M1 |
| ch-glq | F04 Worktree Create | M1 |
| ch-mpl | F08 Signal Parser | M2 |
| ch-3y0 | F09 Agent-Task Linking | M2 |
| ch-k3d | F10 Test Runner | M3 |
| ch-zqi | F12 Task Claimer | M3 |
| ch-8j3 | F19 Orchestration Store | M4 |
| ch-i9i | F22 Slot Manager | M6 |
| ch-glf | F24 Merge Queue | M5 |
| ch-uxk | F39a Learning Types | M8 |
| ch-ahq | F43a Intervention Types | M9 |
| ch-2r5 | F47 Rollback Types | M10 |
| ch-b5x | F52 Hook Types | M11 |

### TUI (14 - NEW)
| ID | Feature | Tests |
|----|---------|-------|
| ch-mnd | F55a ModeIndicator | 6 |
| ch-3na | F55b AgentSlotsCounter | 6 |
| ch-8vk | F56a ProgressBar | 10 |
| ch-aap | F56b DurationDisplay | 8 |
| ch-8w5 | F58a TaskSummaryStats | 8 |
| ch-105 | F58b MergeQueueIndicator | 6 |
| ch-if9 | F59a EmptySlot | 5 |
| ch-j0z | F59b AgentTileHeader | 6 |
| ch-49w | F59d AgentTileOutput | 6 |
| ch-70p | F60b useAgentGrid | 10 |
| ch-73t | F61a TwoColumnLayout | 8 |
| ch-0ok | F61b ShortcutCategory | 5 |
| ch-sl9 | F62a BlockedTaskInfo | 6 |
| ch-gk7 | F62b TaskIterationDisplay | 6 |
| ch-dff | F63j TaskFailedStatus | 3 |
| ch-tdt | F63k AgentPausedStatus | 4 |
| ch-96v | F63l PriorityBadgeColors | 5 |

**Note:** F07 (ch-wk8) blocked by F01a (uses ChorusConfig)

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| TUI Framework | Ink 6.x (React) |
| State | Zustand |
| Task Management | Beads CLI |
| Beads Access | **BeadsCLI service only** (no direct bd calls) |
| Deferred Tasks | `deferred` label excludes from ready |
| Operating Mode | Semi-auto first, then autopilot |
| Completion | Signal `<chorus>` + Tests (AND) |
| Agent Isolation | Git worktrees |
| Commit Messages | `[ch-xxx]` suffix required for rollback |

---

## Commands

```bash
npm test          # 176 tests
bd ready -n 0     # All ready tasks (29)
bd show <id>      # Full task spec
bd blocked        # Blocked tasks with deps
bd list -n 0      # All 81 tasks
bd list -n 0 | grep m12-tui  # TUI tasks only
```

---

## Audit Log

### 2026-01-10: Non-Claude Agent Support Split to Deferred

**Goal:** MVP supports Claude only. Non-Claude agent support deferred.

**Tasks Split:**

| Original | Claude-Only | New Deferred |
|----------|-------------|--------------|
| F07 Prompt Builder | ch-wk8 (8 tests) | ch-q1j F07b (6 tests) |
| F03a Init Prerequisites | ch-0z7 (10 tests) | ch-jbe F03c (4 tests) |
| F42 Learning Injector | - | ch-eyd (entire task, 6 tests) |

**Changes Applied:**

| Task | Change |
|------|--------|
| ch-wk8 (F07) | Removed non-Claude injection, 10→8 tests |
| ch-0z7 (F03a) | Claude CLI only, 11→10 tests |
| ch-2n6 (F01a) | Added MVP Claude-only note |
| ch-q1j (F07b) | NEW - Non-Claude context injection (deferred) |
| ch-jbe (F03c) | NEW - Non-Claude CLI detection (deferred) |
| ch-eyd (F42) | Marked deferred (entire task) |

**beads-task-tracking.md Updated:**
- Added `deferred` label documentation
- Workflow now uses `grep -v "deferred"` for ready tasks
- Listed current deferred tasks

**Master Plan Updated:**
- Key Decisions #10: MVP Scope = Claude-only
- Multi-Agent Support section: Added MVP scope note with deferred task references

**Deferred Tasks (3):**
- ch-q1j (F07b) - Non-Claude Context Injection
- ch-jbe (F03c) - Non-Claude CLI Detection
- ch-eyd (F42) - Learning Injector

**Tasks:** 93 → 95 (+2 new deferred)

---

### 2026-01-10: BeadsCLI Centralization & Deferred Task Filtering

**Problem:**
- Master plan showed direct `bd` CLI calls
- No mechanism for deferring tasks (non-Claude agent support, v2 features)
- Multiple components would need independent filtering logic

**Solution: BeadsCLI as Single Access Point**

All Chorus components MUST access Beads through `BeadsCLI` service:

```typescript
// Label filtering added to getReadyTasks()
interface GetReadyOptions {
  excludeLabels?: string[];  // ['deferred', 'v2']
  includeLabels?: string[];  // ['m1-infrastructure']
}
```

**Master Plan Updated:**
- Section 6: "bd CLI Integration" → "BeadsCLI Integration"
- Added "Deferred Tasks" subsection

**Tasks Updated:**

| Task | Change | Tests |
|------|--------|-------|
| ch-zqi (F12) | +excludeLabels, +includeLabels filtering | 14→17 |
| ch-0e7 (F15) | Uses BeadsCLI.getReadyTasks({ excludeLabels: ['deferred'] }) | unchanged |
| ch-3pa (F32b) | +deferred filtering test | 17→18 |
| ch-9fq (F18a) | +deferredTasks list, +canAssign deferred check | 6→10 |
| ch-ddk (F45) | +deferred validation in canRedirect | 8→10 |

**Key Decisions:**
- `deferred` label excludes tasks from active development
- TUI shows deferred tasks grayed out (informational only)
- Deferred tasks remain in dependency graph

**Total Test Change:** +8 tests across 5 tasks

---

### 2026-01-10: Status Indicators Gap Analysis & Tasks

**Gap Analysis (Master Plan Section 14 vs Implementation):**

| Category | Plan | Implementation | Gap |
|----------|------|----------------|-----|
| Task Status | →●✓⊗✗ | →●✓⊗ | `✗ failed` missing |
| Agent Status | ●○⏸✗ | ●○✗ | `⏸ paused` missing (only `stopped`) |
| Priority | P1-P4 colors | P0 only | P1-P4 colors not tested |

**New Tasks Created (F63j-F63l):**

| Task | Feature | Tests |
|------|---------|-------|
| ch-dff | F63j Task Failed Status | 3 |
| ch-tdt | F63k Agent Paused Status | 4 |
| ch-96v | F63l Priority Badge Colors | 5 |

**Type Updates Required:**
- `BeadStatus`: add `'failed'`
- `AgentStatus`: add `'paused'`

**Total:** 3 tasks, 12 tests added
**Tasks:** 90 → 93 (+3)
**Ready:** 29 → 32 (+3)

---

### 2026-01-10: Keyboard Shortcuts Gap Analysis & Tasks

**Missing Shortcuts Identified:**
- Tab, 1-9, m, n, d, f, g, l, M (9 total)

**New Tasks Created (F63a-F63i):**

| Task | Shortcut | Function | Depends On |
|------|----------|----------|------------|
| ch-akb | Tab | Panel switch | F61a |
| ch-4ow | 1-9 | Quick select | F18b |
| ch-3ji | m | Mode toggle | F17, F32a |
| ch-im6 | n | New task | F12 |
| ch-02h | d | Mark done | F13 |
| ch-0vb | f | Fullscreen | F59e |
| ch-kyx | g | Grid settings | F60b |
| ch-555 | l | View logs | F59e |
| ch-4oz | M | Merge queue | F24 |

**Total:** 9 tasks, 51 tests added

---

### 2026-01-10: Implementation Phases Section Removed

- Deleted redundant Section 15 (Implementation Phases) from master plan
- All content migrated to Beads milestones M1-M12
- Master plan now design-only document

---

### 2026-01-10: M12 TUI Task Review & Fix

**Issues Found & Fixed:**

| Issue | Description | Fix Applied |
|-------|-------------|-------------|
| Test file location | Tasks specified `tests/components/` but codebase uses `src/components/` (co-located tests) | Updated all 20 M12 tasks |
| StatusBar migration | No migration path defined for StatusBar → HeaderBar + FooterBar | Added migration notes to F57a, F57b |
| Layout clarification | Unclear relationship between Layout and TwoColumnLayout | Added architecture note to F61a |

**Tasks Updated (20):**
- F55a-F62b: All test file paths changed from `tests/components/` to `src/components/`
- F57a HeaderBar: Added StatusBar migration note
- F57b FooterBar: Added StatusBar migration note
- F61a TwoColumnLayout: Added Layout architecture clarification

**Architecture Clarification:**
```
Layout (outer shell - existing)
├── HeaderBar (replaces StatusBar top)
├── TwoColumnLayout (content area)
│   ├── TaskPanel (left 30%)
│   └── AgentGrid (right 70%)
└── FooterBar (new bottom bar)
```

---

### 2026-01-10: Master Plan Review (Section 14: TUI Visualization)

**Sections Reviewed:**
- ✓ Main Layout with Tiling Agent View
- ✓ Tiling Configuration
- ✓ Status Indicators
- ✓ Keyboard Shortcuts

**Gap Analysis (Current vs Master Plan):**

| Component | Current | Master Plan | Gap |
|-----------|---------|-------------|-----|
| Header | Basic title | version, mode, slots | Major |
| Footer | None | task stats, merge status | Missing |
| Agent Tile | Basic output | +progress, iter, duration | Major |
| Agent Grid | Row layout | Tiling grid + empty slots | Major |
| Layout | Single pane | Two-column (30/70) | Missing |
| Help Panel | 5 shortcuts | ~25 shortcuts | Major |

**New Milestone: M12 - TUI Visualization**

Created 20 new tasks with 142 total tests:

| Feature | ID | Tests | Dependencies |
|---------|-----|-------|--------------|
| F55a ModeIndicator | ch-mnd | 6 | - |
| F55b AgentSlotsCounter | ch-3na | 6 | - |
| F56a ProgressBar | ch-8vk | 10 | - |
| F56b DurationDisplay | ch-aap | 8 | - |
| F57a HeaderBar | ch-amw | 10 | F55a, F55b |
| F57b FooterBar | ch-nvo | 10 | F58a, F58b |
| F58a TaskSummaryStats | ch-8w5 | 8 | - |
| F58b MergeQueueIndicator | ch-105 | 6 | - |
| F59a EmptySlot | ch-if9 | 5 | - |
| F59b AgentTileHeader | ch-j0z | 6 | - |
| F59c AgentTileProgress | ch-7ki | 6 | F56a, F56b |
| F59d AgentTileOutput | ch-49w | 6 | - |
| F59e AgentTile | ch-c2p | 8 | F59b, F59c, F59d |
| F60a AgentGrid | ch-hhh | 12 | F59e, F59a, F60b |
| F60b useAgentGrid | ch-70p | 10 | - |
| F61a TwoColumnLayout | ch-73t | 8 | - |
| F61b ShortcutCategory | ch-0ok | 5 | - |
| F61c HelpPanel Enhanced | ch-2po | 10 | F61b |
| F62a BlockedTaskInfo | ch-sl9 | 6 | - |
| F62b TaskIterationDisplay | ch-gk7 | 6 | - |

**Ready Tasks (14 of 20):**
- F55a, F55b, F56a, F56b (foundation components)
- F58a, F58b (footer components)
- F59a, F59b, F59d (agent tile parts)
- F60b (useAgentGrid hook)
- F61a, F61b (layout + shortcuts)
- F62a, F62b (task info components)

**Blocked Tasks (6):**
- F57a HeaderBar → F55a, F55b
- F57b FooterBar → F58a, F58b
- F59c AgentTileProgress → F56a, F56b
- F59e AgentTile → F59b, F59c, F59d
- F60a AgentGrid → F59e, F59a, F60b
- F61c HelpPanel → F61b

**Dependency Layers (Verified):**
```
Layer 0 (Ready): 14 independent components
Layer 1: F57a, F57b, F59c, F61c (depend on Layer 0)
Layer 2: F59e (depends on Layer 1)
Layer 3: F60a (depends on Layer 2)
```

**Dependencies Verified:** All 6 blocked tasks have correct dependencies
- F59c AgentTileProgress → F56a, F56b
- F59e AgentTile → F59b, F59c, F59d
- F60a AgentGrid → F59e, F59a, F60b
- F61c HelpPanel → F61b

**Keyboard Shortcuts (Master Plan):**

| Category | Keys |
|----------|------|
| Navigation | j/↓, k/↑, Tab, 1-9 |
| Agent Control | s, x, r, Enter |
| Mode Control | m, Space, a |
| Task Management | n, e, b, d |
| View | f, g, l, L |
| Recovery | R, c, u |
| General | ?, q, i, M |

**Tasks:** 61 → 81 (+20)
**Ready:** 15 → 29 (+14)
**Tests planned:** +142

---

### 2026-01-10: Master Plan Review (Section 13: Rollback & Recovery)

**Sections Reviewed:**
- ✓ Rollback Scope Levels (4 levels)
- ✓ Recovery Scenarios (7 scenarios)
- ✓ Checkpointing (3 types + config)
- ✓ Error Handling Matrix

**Master Plan Coverage:**

| Feature | Task | Status |
|---------|------|--------|
| Level 1: Iteration Rollback | F49 ch-c8j | ✓ |
| Level 2: Task Rollback | F50 ch-ofm | ✓ |
| Level 3: Task + Dependents | F50 rollbackWithDependents() | ✓ |
| Level 4: Session Reset | F48 ch-k9y restore() | ✓ |
| Checkpointing | F48 ch-k9y | ✓ |
| Session Recovery | F51 ch-jxp | ✓ |
| Agent Timeout | F15 ch-0e7 | Added |

**Task Updates:**

| Task | Change |
|------|--------|
| ch-0e7 (F15) | +timeout handling (30min default), +timeout event, tests 18→23 |
| ch-ofm (F50) | +commit message format doc, +F12 dep, tests 7→9 |
| ch-wk8 (F07) | +buildCommitRulesSection(), tests 8→10 |
| ch-glq (F04) | +CONVENTIONS.md template with commit rules, tests 9→10 |

**Commit Message Convention Cross-Reference:**
- F50: Technical requirement (`git log --grep="[ch-xxx]"`)
- F07: Included in agent prompt via `buildCommitRulesSection()`
- F04: Included in `.agent/CONVENTIONS.md` template

**M10 Dependencies Verified:**

| Task | Dependencies |
|------|-------------|
| F47 | - |
| F48 | F47 |
| F49 | F47 |
| F50 | F47, F12 |
| F51 | F47, F02b, F05, F31 |

**Notes:**
- Agent timeout added to F15 Orchestrator (per-task, 30 min default)
- Beads corruption recovery is manual (`bd rebuild`) - not automated
- F51 depends on F31 (MergeService) for merge queue resume

---

### 2026-01-10: Master Plan Review (Section 12: Human Intervention) - Re-reviewed

**Sections Reviewed:**
- ✓ Section 12: Intervention Points (8 types), Intervention Dialog, User Parallel Worktree

**Master Plan Intervention Points:**

| Intervention | Task | Status |
|-------------|------|--------|
| PAUSE (Spacebar) | F43b ch-fna | ✓ |
| STOP AGENT (x) | F44 ch-cwy | ✓ |
| REDIRECT AGENT (r) | F45 ch-ddk | ✓ |
| EDIT TASK (e) | F46b ch-xe8 | NEW |
| KILL ALL (Ctrl+C) | F44 stopAll() | ✓ |
| ROLLBACK (Shift+R) | M10 (deferred) | ✓ |
| BLOCK TASK (b) | F46 ch-sb7 | ✓ |
| APPROVE MERGE (m) | F30 ch-26c (M5) | ✓ |

**New Tasks:**

| Task | Description | Tests |
|------|-------------|-------|
| ch-xe8 (F46b) | Task Editor - restart after task edit | 8 |
| ch-di6 (F46c) | Intervention Panel - TUI modal for actions | 12 |

**Task Updates (Re-review):**

| Task | Change |
|------|--------|
| ch-zqi (F12) | +releaseTask() method, tests 12→14 |
| ch-cwy (F44) | +stopAgentByTask(), +getAgentForTask(), +F12 dep, tests 9→12 |
| ch-ddk (F45) | Updated API to use BeadsCLI, tests 7→8 |
| ch-sb7 (F46) | +F12 dep for status updates, tests 6→7 |
| ch-xe8 (F46b) | Removed F22 dep (uses F44.getAgentForTask) |
| ch-di6 (F46c) | +F19 dep for agent list, tests 11→12, rollback deferred to M10 |

**Dependency Summary (M9):**

| Task | Dependencies |
|------|-------------|
| F43a | - |
| F43b | F15, F43a |
| F44 | F43a, F22, F12 |
| F45 | F15, F44, F12 |
| F46 | F43a, F44, F12 |
| F46b | F15, F44 |
| F46c | F19, F43a, F43b, F44, F45, F46, F46b |

**Tasks:** 59 → 61 (+2)

---

### 2026-01-10: Master Plan Review (Section 11: Hooks Integration)

**Sections Reviewed:**
- ✓ Section 11: Chorus Hooks System, Hook Events, Input/Output Format

**Task Updates:**

| Task | Change |
|------|--------|
| ch-n6d (F53) | +hook discovery convention (filename=event), tests 8→11 |

**Non-Claude Agent Analysis:**
- HookInput includes `agent.type: AgentType` - sufficient for agent-specific behavior
- No special infrastructure needed

**Note:** Hook integration into services (F15, F16, F31, F32) is optional - hooks are for user customization.

---

### 2026-01-10: Master Plan Review (Section 10: Memory System)

**Sections Reviewed:**
- ✓ Section 10: Memory Architecture, Cross-Agent Sharing, Learning Extraction

**Gap Found:**
- F16a missing learning extraction in success path
- No LearningsPanel TUI component

**Task Updates:**

| Task | Change |
|------|--------|
| ch-7jw (F16a) | +learning extraction flow, +F39b/F41 deps, tests 5→9 |
| ch-g2h (F42b) | NEW - LearningsPanel TUI component, 6 tests |

**Dependency Fixes:**
- F42 (ch-eyd): Removed incorrect F07 dependency

**Tasks:** 58 → 59 (+1)

---

### 2026-01-10: Master Plan Review Session Summary (Sections 4-9)

**Sections Completed:** 4, 5, 6, 7, 8, 9 (6 sections)

**All Task Updates This Session:**

| Task | Feature | Change | Tests |
|------|---------|--------|-------|
| ch-7gx | F17 | +parallel agents, +F22 dep | 11→15 |
| ch-3pa | F32b | +safeguards, +progress, +errors | 10→17 |
| ch-0z7 | F03a | NEW - Prerequisites | 11 |
| ch-mdj | F03b | NEW - Scaffold | 21 |
| ch-zqi | F12 | +createTask, +custom fields | 8→12 |
| ch-glq | F04 | +scratchpad copy | 7→9 |
| ch-lhm | F16b | +BLOCKED, +crash | 6→12 |
| ch-cg0 | F02c | +iteration mgmt | 4→8 |
| ch-glf | F24 | +dep ordering, +defer | 9→13 |
| ch-t31 | F27 | +special files | 6→10 |

**New Dependencies Added:**
- F17 → F22 (SlotManager)
- F03b → F03a, F01c

**Totals:** +2 new tasks, ~50 new tests across updates

---

### 2026-01-10: Master Plan Review (Section 9: Automatic Mode)

**Sections Reviewed:**
- ✓ Section 9: Core Loop, Signal Protocol, Completion Check, Safeguards

**Task Updates:**

| Task | Change |
|------|--------|
| ch-3pa (F32b) | +progress detection (5 iter no commit), +error threshold (3 errors), tests 13→17 |

---

### 2026-01-10: Master Plan Review (Section 8: Background Merge Service)

**Sections Reviewed:**
- ✓ Section 8: MergeQueue, MergeWorker, Conflict Resolution, Merge Ordering

**Task Updates:**

| Task | Change |
|------|--------|
| ch-glf (F24) | +dependency ordering, +deferToEnd, +max retries, tests 9→13 |
| ch-t31 (F27) | +special files (beads, package-lock, learnings), tests 6→10 |

---

### 2026-01-10: Master Plan Review (Section 7: Agent Lifecycle)

**Sections Reviewed:**
- ✓ Section 7: Spawn Sequence (6 steps), Exit Handling (7 conditions)

**Task Updates:**

| Task | Change |
|------|--------|
| ch-glq (F04) | Added scratchpad template copy, tests 7→9 |
| ch-lhm (F16b) | Added BLOCKED/crash handling, tests 6→12 |
| ch-cg0 (F02c) | Added incrementIteration, setStatus, tests 4→8 |

---

### 2026-01-10: Master Plan Review (Section 6: Task Creation & Management)

**Sections Reviewed:**
- ✓ Section 6: Task Sources, bd CLI Integration, Custom Fields, Circular Detection

**Task Updates:**

| Task | Change |
|------|--------|
| ch-zqi (F12) | Added createTask(), custom fields parsing, tests 8→12 |

---

### 2026-01-10: Master Plan Review (Section 5: Initialization Flow)

**Sections Reviewed:**
- ✓ Section 5: Initialization Flow (chorus init, 6-step setup)

**Gap Found:**
- No `chorus init` task existed - created F03a and F03b

**New Tasks:**

| Task | Description | Tests |
|------|-------------|-------|
| ch-0z7 (F03a) | Init Prerequisites - git, Node.js, bd, agent CLIs | 11 |
| ch-mdj (F03b) | Init Scaffold - directories, detect settings, bd init, gitignore | 21 |

**F03b Updated (re-review):**
- Added .chorus/hooks/ directory creation
- Added go.mod detection (go test ./...)
- Added projectType detection (node/python/go/unknown)
- Added `bd init` call for .beads/
- Tests: 15 → 21

**Tasks:** 56 → 58 (+2)
**Ready:** 14 → 15 (+1, F03a ready)

---

### 2026-01-10: Master Plan Review (Section 4: Operating Modes)

**Sections Reviewed:**
- ✓ Section 4: Operating Modes (Semi-Auto, Autopilot, Mode Switching)

**Design Decision:**
- Semi-auto mode supports multiple parallel agents (user confirmed)

**Task Updates:**

| Task | Change |
|------|--------|
| ch-7gx (F17) | Rewrote for parallel agent support: multiple activeTaskIds, SlotManager integration, tests 11→15 |
| ch-3pa (F32b) | Added safeguard tests (maxTotalTasks, idleTimeout) and dependency chain test, tests 10→13 |

**New Dependencies:**
- F17 → F22 (SlotManager for slot claiming)

### Previous Sessions

<details>
<summary>2026-01-10: Sections 2-3 (Key Decisions + Architecture)</summary>

**Task Updates:**

| Task | Change |
|------|--------|
| ch-wk8 (F07) | Added F01a dependency (uses ChorusConfig) |
| ch-2n6 (F01a) | Added AgentType, AgentConfig details |
| ch-ah6 (F02a) | Added AgentStatus, MergeQueueItemStatus enums, tests 2→4 |
| ch-uoa (F11) | Fixed requireTests description |
| ch-jxp (F51) | Added orphan process killing, merge queue resume, F31 dependency, tests 8→11 |

**New Dependencies:**
- F07 → F01a (ChorusConfig type)
- F51 → F31 (MergeService for queue resume)

</details>

<details>
<summary>2026-01-10: Earlier sessions</summary>

#### M8-M11 Tasks & Dependency Review
- Created M8-M11 milestones (18 new tasks)
- Full dependency audit of all 56 tasks
- Removed verbose labels

#### M5-M7 Plans & Tasks Created
- Created F22-F32 tasks with TDD specs
- Fixed test counts and dependencies

#### F32 Deep Audit & Split
- Split F32 into F32a (8 tests) and F32b (10 tests)
- Added missing F15 dependency to F32

#### Migration to Beads-Centric Structure
- Deleted 29 feature plan files
- Beads is now single source of truth

</details>

---

## Next Session

Master plan review complete. Ready to start implementation.

```bash
# Get first task to implement (excludes deferred)
bd ready -n 0 | grep -v "deferred" | head -5

# Recommended starting points:
# - ch-2n6 (F01a) Config Types - foundation
# - ch-ah6 (F02a) State Types - foundation
# - ch-mpl (F08) Signal Parser - standalone
```

**Implementation Approach:**
1. Pick task from `bd ready -n 0 | grep -v "deferred"`
2. Use TDD: Write tests → RED → Implement → GREEN
3. Commit with `[ch-xxx]` suffix
4. Close task: `bd close <id>`

**Key Files:**
- Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md`
- Task Rules: `.claude/rules/beads-task-tracking.md`
- This Ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-chorus.md`
