# Chorus Feature Dependency Analysis

**Date:** 2026-01-10
**Purpose:** Map all features needed for full autopilot mode with dependencies

---

## Feature Categories

| Category | Features | Purpose |
|----------|----------|---------|
| Infrastructure | F01-F03 | Config, state, init |
| Worktree | F04-F06 | Git worktree management |
| Agent | F07-F09 | Prompt building, signals, linking |
| Completion | F10-F11 | Tests, completion detection |
| Task Mgmt | F12-F14 | Claim, close, dependencies |
| Orchestration | F15-F17 | Core coordination |
| TUI | F18-F20 | UI integration |
| Parallelism | F21-F23 | Multi-agent |
| Merge | F24-F31 | Merge service |
| Autopilot | F32-F38 | Ralph loop |
| Memory | F39-F42 | Learning system |
| Intervention | F43-F46 | Human control |
| Rollback | F47-F51 | Recovery |
| Hooks | F52-F54 | Lifecycle events |
| Recovery | F55-F57 | Crash recovery |

---

## Complete Feature List with Dependencies

### Infrastructure (Layer 0 - No Dependencies)

#### F01: Config System
- **What:** Read/write `.chorus/config.json`
- **Dependencies:** None
- **Files:**
  - `src/services/ConfigService.ts`
  - `src/types/config.ts`
  - `tests/services/ConfigService.test.ts`
- **Tests:** ~8

#### F02: State System
- **What:** Runtime state in `.chorus/state.json`
- **Dependencies:** None
- **Files:**
  - `src/services/StateService.ts`
  - `src/types/state.ts`
  - `tests/services/StateService.test.ts`
- **Tests:** ~8

#### F03: Init Command
- **What:** `chorus init` wizard
- **Dependencies:** F01, F02
- **Files:**
  - `src/services/InitService.ts`
  - `src/cli.ts` (update)
  - `tests/services/InitService.test.ts`
- **Tests:** ~10

---

### Worktree (Layer 0-1)

#### F04: Worktree Create
- **What:** `git worktree add .worktrees/{agent}-{task} -b agent/{agent}/{task}`
- **Dependencies:** None
- **Files:**
  - `src/services/WorktreeService.ts` (partial)
- **Tests:** ~5

#### F05: Worktree Cleanup
- **What:** `git worktree remove`, delete branch if merged
- **Dependencies:** F04
- **Files:**
  - `src/services/WorktreeService.ts` (extend)
- **Tests:** ~5

#### F06: Worktree Service (Complete)
- **What:** Full worktree lifecycle management
- **Dependencies:** F04, F05
- **Files:**
  - `src/services/WorktreeService.ts`
  - `tests/services/WorktreeService.test.ts`
- **Tests:** ~12 total

---

### Agent (Layer 0-1)

#### F07: Task Prompt Builder
- **What:** Build agent prompt with task context, acceptance criteria, signal protocol
- **Dependencies:** None (uses existing Bead type)
- **Files:**
  - `src/services/PromptBuilder.ts`
  - `tests/services/PromptBuilder.test.ts`
- **Tests:** ~8

#### F08: Signal Parser
- **What:** Parse `<chorus>COMPLETE</chorus>`, `<chorus>BLOCKED: reason</chorus>`
- **Dependencies:** None
- **Files:**
  - `src/services/SignalParser.ts`
  - `tests/services/SignalParser.test.ts`
- **Tests:** ~10

#### F09: Agent-Task Linking
- **What:** Associate spawned agent with task ID, track in state
- **Dependencies:** Existing AgentManager, F02
- **Files:**
  - `src/stores/agentStore.ts` (extend with taskId)
  - `src/types/agent.ts` (extend)
- **Tests:** ~5

---

### Completion (Layer 1-2)

#### F10: Test Runner
- **What:** Run `testCommand` from config, capture exit code
- **Dependencies:** F01 (needs config for testCommand)
- **Files:**
  - `src/services/TestRunner.ts`
  - `tests/services/TestRunner.test.ts`
- **Tests:** ~8

#### F11: Completion Checker
- **What:** Signal + Tests (AND logic)
- **Dependencies:** F08, F10
- **Files:**
  - `src/services/CompletionChecker.ts`
  - `tests/services/CompletionChecker.test.ts`
- **Tests:** ~10

---

### Task Management (Layer 0-2)

#### F12: Task Claimer
- **What:** `bd update {id} --status=in_progress --assignee={agent}`
- **Dependencies:** None (calls bd CLI)
- **Files:**
  - `src/services/BeadsCLI.ts`
- **Tests:** ~5

#### F13: Task Closer
- **What:** `bd close {id}` after completion
- **Dependencies:** F11 (needs completion check first)
- **Files:**
  - `src/services/BeadsCLI.ts` (extend)
- **Tests:** ~5

#### F14: Dependency Resolver
- **What:** Check if task's dependencies are satisfied (all closed)
- **Dependencies:** Existing BeadsService
- **Files:**
  - `src/services/DependencyResolver.ts`
  - `tests/services/DependencyResolver.test.ts`
- **Tests:** ~8

---

### Orchestration (Layer 2-3) - CRITICAL

#### F15: Orchestrator Core
- **What:** Coordinate: select task → create worktree → build prompt → spawn agent → track
- **Dependencies:** F04, F07, F09, F12
- **Files:**
  - `src/services/Orchestrator.ts`
  - `src/types/orchestration.ts`
  - `tests/services/Orchestrator.test.ts`
- **Tests:** ~15

#### F16: Single Task Completion
- **What:** Wait for signal → check tests → close task → cleanup
- **Dependencies:** F15, F11, F13, F05
- **Files:**
  - `src/services/Orchestrator.ts` (extend)
- **Tests:** ~10

#### F17: Semi-Auto Mode
- **What:** User assigns → agent completes → STOPS (no next task)
- **Dependencies:** F16, F18
- **Files:**
  - `src/services/Orchestrator.ts` (extend)
- **Tests:** ~8

---

### TUI Integration (Layer 1-3)

#### F18: Task Selection UI
- **What:** Arrow keys in TaskPanel, Enter to assign, visual feedback
- **Dependencies:** Existing TaskPanel
- **Files:**
  - `src/components/TaskPanel.tsx` (extend)
  - `src/hooks/useKeyboard.ts` (extend)
- **Tests:** ~8

#### F19: Orchestration Store
- **What:** Zustand store for mode, current task, merge queue status
- **Dependencies:** None
- **Files:**
  - `src/stores/orchestrationStore.ts`
  - `tests/stores/orchestrationStore.test.ts`
- **Tests:** ~8

#### F20: useOrchestration Hook
- **What:** React hook to connect Orchestrator ↔ Components
- **Dependencies:** F15, F19
- **Files:**
  - `src/hooks/useOrchestration.ts`
  - `tests/hooks/useOrchestration.test.ts`
- **Tests:** ~8

---

### Parallelism (Layer 3-4)

#### F21: Multi-Agent Spawning
- **What:** Spawn N agents in parallel, each in own worktree
- **Dependencies:** F16, F06
- **Files:**
  - `src/services/Orchestrator.ts` (extend)
- **Tests:** ~10

#### F22: Agent Slot Manager
- **What:** Track available slots (maxParallel - running)
- **Dependencies:** F01 (maxParallel from config)
- **Files:**
  - `src/services/SlotManager.ts`
- **Tests:** ~5

#### F23: Tiling View Refactor
- **What:** Dynamic grid (1x2, 2x2, 2x3) based on terminal size and agent count
- **Dependencies:** Existing MainContent
- **Files:**
  - `src/components/AgentTilingView.tsx`
  - `src/hooks/useAgentGrid.ts`
  - `tests/components/AgentTilingView.test.ts`
- **Tests:** ~10

---

### Merge Service (Layer 2-4) - CRITICAL FOR PARALLEL

#### F24: Merge Queue
- **What:** Queue of branches to merge (FIFO + priority)
- **Dependencies:** None
- **Files:**
  - `src/services/MergeQueue.ts`
  - `tests/services/MergeQueue.test.ts`
- **Tests:** ~8

#### F25: Merge Worker
- **What:** `git checkout main && git merge {branch}`
- **Dependencies:** F24
- **Files:**
  - `src/services/MergeWorker.ts`
- **Tests:** ~8

#### F26: Conflict Classifier
- **What:** Analyze conflict (simple/medium/complex)
- **Dependencies:** F25
- **Files:**
  - `src/services/ConflictClassifier.ts`
  - `tests/services/ConflictClassifier.test.ts`
- **Tests:** ~10

#### F27: Auto-Resolver (Simple)
- **What:** Merge drivers for .beads/, package-lock.json, etc.
- **Dependencies:** F26
- **Files:**
  - `src/services/AutoResolver.ts`
- **Tests:** ~5

#### F28: Rebase-Retry (Medium)
- **What:** `git rebase main` and retry merge
- **Dependencies:** F26
- **Files:**
  - `src/services/RebaseRetry.ts`
- **Tests:** ~5

#### F29: Resolver Agent (Complex)
- **What:** Spawn agent to analyze and resolve conflict
- **Dependencies:** F26, F15
- **Files:**
  - `src/services/ResolverAgent.ts`
- **Tests:** ~8

#### F30: Human Escalation
- **What:** Alert user, show conflict details, allow manual resolution
- **Dependencies:** F26
- **Files:**
  - `src/services/HumanEscalation.ts`
  - `src/components/ConflictPanel.tsx`
- **Tests:** ~5

#### F31: Merge Service (Complete)
- **What:** Full merge orchestration: queue → classify → resolve → cleanup
- **Dependencies:** F24-F30
- **Files:**
  - `src/services/MergeService.ts`
  - `tests/services/MergeService.test.ts`
- **Tests:** ~15 total

---

### Autopilot (Layer 4-5) - THE GOAL

#### F32: Ralph Loop Core
- **What:** Pick ready task → spawn agent → wait complete → merge → repeat
- **Dependencies:** F16, F31, F22
- **Files:**
  - `src/services/RalphLoop.ts`
  - `tests/services/RalphLoop.test.ts`
- **Tests:** ~15

#### F33: Iteration Counter
- **What:** Track iterations per agent, stored in state
- **Dependencies:** F15 (tracks in Orchestrator)
- **Files:**
  - `src/types/orchestration.ts` (extend)
- **Tests:** ~5

#### F34: Timeout Manager
- **What:** Kill agent if exceeds taskTimeout
- **Dependencies:** F33
- **Files:**
  - `src/services/TimeoutManager.ts`
- **Tests:** ~5

#### F35: Stuck Detection
- **What:** Alert if no commits in N iterations
- **Dependencies:** F33
- **Files:**
  - `src/services/StuckDetector.ts`
- **Tests:** ~5

#### F36: Safeguards
- **What:** Max iterations, error threshold (3 consecutive → pause)
- **Dependencies:** F33, F34, F35
- **Files:**
  - `src/services/Safeguards.ts`
  - `tests/services/Safeguards.test.ts`
- **Tests:** ~8

#### F37: Mode Toggle
- **What:** Switch semi-auto ↔ autopilot (m key)
- **Dependencies:** F17, F32
- **Files:**
  - `src/hooks/useKeyboard.ts` (extend)
  - `src/stores/orchestrationStore.ts` (extend)
- **Tests:** ~5

#### F38: Pause/Resume
- **What:** Spacebar to pause, current agents finish, no new spawns
- **Dependencies:** F32
- **Files:**
  - `src/services/RalphLoop.ts` (extend)
- **Tests:** ~5

---

### Memory System (Layer 4-5)

#### F39: Scratchpad Manager
- **What:** Create `.agent/scratchpad.md` in worktree
- **Dependencies:** F06
- **Files:**
  - `src/services/ScratchpadManager.ts`
- **Tests:** ~5

#### F40: Learning Extractor
- **What:** Parse `## Learnings` section from scratchpad on completion
- **Dependencies:** F39, F11
- **Files:**
  - `src/services/LearningExtractor.ts`
  - `tests/services/LearningExtractor.test.ts`
- **Tests:** ~8

#### F41: Learning Injector
- **What:** Inject relevant learnings into agent prompt (non-Claude)
- **Dependencies:** F40, F07
- **Files:**
  - `src/services/PromptBuilder.ts` (extend)
- **Tests:** ~5

#### F42: Memory Service (Complete)
- **What:** Full memory lifecycle
- **Dependencies:** F39, F40, F41
- **Files:**
  - `src/services/MemoryService.ts`
  - `tests/services/MemoryService.test.ts`
- **Tests:** ~10 total

---

### Human Intervention (Layer 3-4)

#### F43: Agent Stop
- **What:** x key to kill agent, task→pending, stash changes
- **Dependencies:** Existing AgentManager
- **Files:**
  - `src/hooks/useKeyboard.ts` (extend)
- **Tests:** ~5

#### F44: Agent Redirect
- **What:** r key to reassign agent to different task
- **Dependencies:** F15
- **Files:**
  - `src/services/Orchestrator.ts` (extend)
- **Tests:** ~5

#### F45: Task Block
- **What:** b key to manually block task
- **Dependencies:** F12
- **Files:**
  - `src/services/BeadsCLI.ts` (extend)
- **Tests:** ~3

#### F46: Intervention Dialog
- **What:** i key opens intervention menu
- **Dependencies:** F43, F44, F45
- **Files:**
  - `src/components/InterventionPanel.tsx`
  - `tests/components/InterventionPanel.test.ts`
- **Tests:** ~8

---

### Rollback (Layer 3-4)

#### F47: Iteration Rollback
- **What:** Undo last iteration's commits
- **Dependencies:** None (git commands)
- **Files:**
  - `src/services/RollbackService.ts` (partial)
- **Tests:** ~5

#### F48: Task Rollback
- **What:** Revert all commits with [task-id]
- **Dependencies:** F47
- **Files:**
  - `src/services/RollbackService.ts` (extend)
- **Tests:** ~5

#### F49: Checkpoint Create
- **What:** `git tag chorus-checkpoint-{timestamp}`
- **Dependencies:** None
- **Files:**
  - `src/services/CheckpointService.ts`
- **Tests:** ~5

#### F50: Checkpoint Restore
- **What:** `git reset --hard {tag}`
- **Dependencies:** F49
- **Files:**
  - `src/services/CheckpointService.ts` (extend)
- **Tests:** ~5

#### F51: Rollback Service (Complete)
- **What:** Full rollback orchestration
- **Dependencies:** F47-F50
- **Files:**
  - `src/services/RollbackService.ts`
  - `tests/services/RollbackService.test.ts`
- **Tests:** ~12 total

---

### Hooks (Layer 3-5)

#### F52: Hook Runner
- **What:** Execute shell scripts with JSON stdin/stdout
- **Dependencies:** None
- **Files:**
  - `src/services/HookRunner.ts`
- **Tests:** ~5

#### F53: Lifecycle Events
- **What:** pre-agent-start, post-iteration, post-task-complete, etc.
- **Dependencies:** F52, F15
- **Files:**
  - `src/types/hooks.ts`
- **Tests:** ~8

#### F54: Hooks Service (Complete)
- **What:** Full hooks orchestration
- **Dependencies:** F52, F53
- **Files:**
  - `src/services/HooksService.ts`
  - `tests/services/HooksService.test.ts`
- **Tests:** ~10 total

---

### Recovery (Layer 2-3)

#### F55: State Recovery
- **What:** Load state.json on startup, validate, resume
- **Dependencies:** F02
- **Files:**
  - `src/services/RecoveryService.ts`
- **Tests:** ~5

#### F56: Orphan Cleanup
- **What:** Kill processes from previous session
- **Dependencies:** F55
- **Files:**
  - `src/services/RecoveryService.ts` (extend)
- **Tests:** ~5

#### F57: Queue Resume
- **What:** Resume merge queue from saved state
- **Dependencies:** F55, F31
- **Files:**
  - `src/services/RecoveryService.ts` (extend)
- **Tests:** ~5

---

## Dependency Graph (Visual)

```
Layer 0 (No Dependencies):
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ F01 │ │ F02 │ │ F04 │ │ F07 │ │ F08 │ │ F12 │ │ F14 │ │ F19 │
│Confg│ │State│ │WTCrt│ │Promp│ │Signl│ │Claim│ │DepRs│ │Store│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └─────┘ └──┬──┘
   │       │       │       │       │       │              │
   │       │       │       └───────┴───┬───┴──────────────┘
   │       │       │                   │
Layer 1:  │       │                   │
┌──┴──┐   │    ┌──┴──┐            ┌──┴──┐ ┌─────┐ ┌─────┐
│ F10 │   │    │ F05 │            │ F09 │ │ F24 │ │ F22 │
│TestR│   │    │WTClp│            │Link │ │MrgQu│ │Slots│
└──┬──┘   │    └──┬──┘            └──┬──┘ └──┬──┘ └──┬──┘
   │      │       │                  │       │       │
Layer 2:  │       │                  │       │       │
┌──┴──────┴───────┴──────────────────┴──┐ ┌──┴──┐    │
│              F15: Orchestrator Core    │ │ F25 │    │
│   (Worktree + Prompt + Link + Claim)   │ │MrgWk│    │
└────────────────┬───────────────────────┘ └──┬──┘    │
                 │                            │       │
Layer 3:    ┌────┴────┐                    ┌──┴──┐    │
            │   F16   │                    │ F26 │    │
            │SingComp │←────F11 (Complet)  │Confl│    │
            └────┬────┘     ↑              └──┬──┘    │
                 │          │                 │       │
Layer 4:    ┌────┴────┐   F08+F10         ┌──┴──────┴────┐
            │   F17   │                   │    F31       │
            │SemiAuto │                   │ MergeService │
            └────┬────┘                   └──────┬───────┘
                 │                               │
Layer 5:         └───────────────┬───────────────┘
                                 │
                          ┌──────┴──────┐
                          │    F32      │
                          │ RalphLoop   │←── F22 (Slots)
                          │ (AUTOPILOT) │
                          └─────────────┘
```

---

## Implementation Order (Topological Sort)

### Milestone 1: Infrastructure + Worktree (~30 tests)
**Goal:** Foundation for all other features

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 1 | F01 | Config System | - | 8 |
| 2 | F02 | State System | - | 8 |
| 3 | F04 | Worktree Create | - | 5 |
| 4 | F05 | Worktree Cleanup | F04 | 5 |
| 5 | F06 | Worktree Service | F04,F05 | 4 |

### Milestone 2: Agent Prep (~23 tests)
**Goal:** Agent can receive tasks

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 6 | F07 | Task Prompt Builder | - | 8 |
| 7 | F08 | Signal Parser | - | 10 |
| 8 | F09 | Agent-Task Linking | F02 | 5 |

### Milestone 3: Task Management (~18 tests)
**Goal:** Can claim and close tasks

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 9 | F12 | Task Claimer | - | 5 |
| 10 | F10 | Test Runner | F01 | 8 |
| 11 | F11 | Completion Checker | F08,F10 | 10 |
| 12 | F13 | Task Closer | F11 | 5 |

### Milestone 4: Core Orchestration (~41 tests)
**Goal:** Semi-auto mode works (1 agent, 1 task, manual merge)

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 13 | F19 | Orchestration Store | - | 8 |
| 14 | F15 | Orchestrator Core | F04,F07,F09,F12 | 15 |
| 15 | F16 | Single Task Completion | F15,F11,F13,F05 | 10 |
| 16 | F18 | Task Selection UI | - | 8 |
| 17 | F20 | useOrchestration Hook | F15,F19 | 8 |
| 18 | F17 | Semi-Auto Mode | F16,F18 | 8 |

**CHECKPOINT: Semi-Auto Mode Complete (~112 new tests)**

### Milestone 5: Merge Service (~49 tests)
**Goal:** Auto-merge with conflict resolution

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 19 | F24 | Merge Queue | - | 8 |
| 20 | F25 | Merge Worker | F24 | 8 |
| 21 | F26 | Conflict Classifier | F25 | 10 |
| 22 | F27 | Auto-Resolver | F26 | 5 |
| 23 | F28 | Rebase-Retry | F26 | 5 |
| 24 | F29 | Resolver Agent | F26,F15 | 8 |
| 25 | F30 | Human Escalation | F26 | 5 |
| 26 | F31 | Merge Service | F24-F30 | - |

### Milestone 6: Parallelism (~25 tests)
**Goal:** Multiple agents in parallel

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 27 | F22 | Agent Slot Manager | F01 | 5 |
| 28 | F21 | Multi-Agent Spawning | F16,F06 | 10 |
| 29 | F23 | Tiling View Refactor | - | 10 |

### Milestone 7: Autopilot (~43 tests)
**Goal:** Full autonomous mode

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 30 | F33 | Iteration Counter | F15 | 5 |
| 31 | F34 | Timeout Manager | F33 | 5 |
| 32 | F35 | Stuck Detection | F33 | 5 |
| 33 | F36 | Safeguards | F33,F34,F35 | 8 |
| 34 | F32 | Ralph Loop Core | F16,F31,F22 | 15 |
| 35 | F37 | Mode Toggle | F17,F32 | 5 |
| 36 | F38 | Pause/Resume | F32 | 5 |

**CHECKPOINT: Autopilot Complete (~229 new tests)**

### Milestone 8: Memory System (~23 tests)
**Goal:** Cross-agent learning

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 37 | F39 | Scratchpad Manager | F06 | 5 |
| 38 | F40 | Learning Extractor | F39,F11 | 8 |
| 39 | F41 | Learning Injector | F40,F07 | 5 |
| 40 | F42 | Memory Service | F39-F41 | 5 |

### Milestone 9: Human Intervention (~21 tests)
**Goal:** User can intervene

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 41 | F43 | Agent Stop | - | 5 |
| 42 | F44 | Agent Redirect | F15 | 5 |
| 43 | F45 | Task Block | F12 | 3 |
| 44 | F46 | Intervention Dialog | F43-F45 | 8 |

### Milestone 10: Rollback (~22 tests)
**Goal:** Recovery from errors

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 45 | F47 | Iteration Rollback | - | 5 |
| 46 | F48 | Task Rollback | F47 | 5 |
| 47 | F49 | Checkpoint Create | - | 5 |
| 48 | F50 | Checkpoint Restore | F49 | 5 |
| 49 | F51 | Rollback Service | F47-F50 | 2 |

### Milestone 11: Hooks (~18 tests)
**Goal:** Lifecycle customization

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 50 | F52 | Hook Runner | - | 5 |
| 51 | F53 | Lifecycle Events | F52,F15 | 8 |
| 52 | F54 | Hooks Service | F52,F53 | 5 |

### Milestone 12: Recovery + Init (~25 tests)
**Goal:** Production ready

| Order | ID | Feature | Deps | Tests |
|-------|-----|---------|------|-------|
| 53 | F55 | State Recovery | F02 | 5 |
| 54 | F56 | Orphan Cleanup | F55 | 5 |
| 55 | F57 | Queue Resume | F55,F31 | 5 |
| 56 | F03 | Init Command | F01,F02 | 10 |

---

## Summary

| Milestone | Tests | Cumulative | Status |
|-----------|-------|------------|--------|
| Current (Phase 3) | 176 | 176 | ✅ Done |
| M1: Infrastructure | 30 | 206 | |
| M2: Agent Prep | 23 | 229 | |
| M3: Task Mgmt | 28 | 257 | |
| M4: Core Orchestration | 57 | 314 | **Semi-Auto** |
| M5: Merge Service | 49 | 363 | |
| M6: Parallelism | 25 | 388 | |
| M7: Autopilot | 43 | 431 | **Autopilot** |
| M8: Memory | 23 | 454 | |
| M9: Intervention | 21 | 475 | |
| M10: Rollback | 22 | 497 | |
| M11: Hooks | 18 | 515 | |
| M12: Recovery+Init | 25 | 540 | **Production** |

**Total New Tests:** ~364
**Target:** ~540 tests

---

## Critical Path to Autopilot

```
F01 → F10 ─────────────────────────────┐
F04 → F05 → F06 ───────────────────┐   │
F07 ───────────────────────────────┤   │
F08 ─────────────────────────┬─────┤   │
F12 ─────────────────────────┤     │   │
                             │     │   │
                             ▼     │   │
                     F15 Orchestrator  │
                             │     │   │
                             ▼     │   │
              F09 ──► F16 SingleComp ◄─┘
                             │
              F11 ◄──────────┘
                │
         F17 SemiAuto
                │
         F24 → F25 → F26 → F31 MergeService
                             │
         F22 SlotManager ────┤
                             │
                     F32 RalphLoop (AUTOPILOT)
```

**Minimum path: 16 features (F01,F04,F05,F06,F07,F08,F09,F10,F11,F12,F15,F16,F17,F22,F24-F31,F32)**
