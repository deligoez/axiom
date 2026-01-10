# Chorus Phase 4 Master Plan

**Date:** 2026-01-10
**Status:** Planning Complete
**Dependency Analysis:** `2026-01-10-feature-dependency-analysis.md`

---

## Overview

Phase 4 implements full orchestration for Chorus - from semi-auto mode (user assigns tasks) to full autopilot (autonomous task completion).

**Current State:** 176 tests (Phase 3 complete)
**Target State:** ~540 tests (Production ready)

---

## Milestones

| # | Milestone | Features | Tests | Status |
|---|-----------|----------|-------|--------|
| 0 | Phase 3 Complete | - | 176 | ✅ Done |
| 1 | Infrastructure + Worktree | F01-F06 | +30 | [ ] |
| 2 | Agent Preparation | F07-F09 | +23 | [ ] |
| 3 | Task Management | F10-F13 | +28 | [ ] |
| 4 | Core Orchestration | F15-F20 | +57 | [ ] **Semi-Auto** |
| 5 | Merge Service | F24-F31 | +49 | [ ] |
| 6 | Parallelism | F21-F23 | +25 | [ ] |
| 7 | Autopilot | F32-F38 | +43 | [ ] **Autopilot** |
| 8 | Memory System | F39-F42 | +23 | [ ] |
| 9 | Human Intervention | F43-F46 | +21 | [ ] |
| 10 | Rollback | F47-F51 | +22 | [ ] |
| 11 | Hooks | F52-F54 | +18 | [ ] |
| 12 | Recovery + Init | F03, F55-F57 | +25 | [ ] **Production** |

---

## Feature Tracking

### Milestone 1: Infrastructure + Worktree

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F01 | Config System | [plan](./features/F01-config-system.md) | 8 | [ ] |
| F02 | State System | [plan](./features/F02-state-system.md) | 8 | [ ] |
| F04 | Worktree Create | [plan](./features/F04-worktree-create.md) | 5 | [ ] |
| F05 | Worktree Cleanup | [plan](./features/F05-worktree-cleanup.md) | 5 | [ ] |
| F06 | Worktree Service | [plan](./features/F06-worktree-service.md) | 4 | [ ] |

### Milestone 2: Agent Preparation

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F07 | Task Prompt Builder | [plan](./features/F07-prompt-builder.md) | 8 | [ ] |
| F08 | Signal Parser | [plan](./features/F08-signal-parser.md) | 10 | [ ] |
| F09 | Agent-Task Linking | [plan](./features/F09-agent-task-linking.md) | 5 | [ ] |

### Milestone 3: Task Management

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F10 | Test Runner | [plan](./features/F10-test-runner.md) | 8 | [ ] |
| F11 | Completion Checker | [plan](./features/F11-completion-checker.md) | 10 | [ ] |
| F12 | Task Claimer | [plan](./features/F12-task-claimer.md) | 5 | [ ] |
| F13 | Task Closer | [plan](./features/F13-task-closer.md) | 5 | [ ] |

### Milestone 4: Core Orchestration (Semi-Auto)

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F14 | Dependency Resolver | [plan](./features/F14-dependency-resolver.md) | 8 | [ ] |
| F15 | Orchestrator Core | [plan](./features/F15-orchestrator-core.md) | 15 | [ ] |
| F16 | Single Task Completion | [plan](./features/F16-single-task-completion.md) | 10 | [ ] |
| F17 | Semi-Auto Mode | [plan](./features/F17-semi-auto-mode.md) | 8 | [ ] |
| F18 | Task Selection UI | [plan](./features/F18-task-selection-ui.md) | 8 | [ ] |
| F19 | Orchestration Store | [plan](./features/F19-orchestration-store.md) | 8 | [ ] |
| F20 | useOrchestration Hook | [plan](./features/F20-use-orchestration.md) | 8 | [ ] |

### Milestone 5: Merge Service

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F24 | Merge Queue | [plan](./features/F24-merge-queue.md) | 8 | [ ] |
| F25 | Merge Worker | [plan](./features/F25-merge-worker.md) | 8 | [ ] |
| F26 | Conflict Classifier | [plan](./features/F26-conflict-classifier.md) | 10 | [ ] |
| F27 | Auto-Resolver | [plan](./features/F27-auto-resolver.md) | 5 | [ ] |
| F28 | Rebase-Retry | [plan](./features/F28-rebase-retry.md) | 5 | [ ] |
| F29 | Resolver Agent | [plan](./features/F29-resolver-agent.md) | 8 | [ ] |
| F30 | Human Escalation | [plan](./features/F30-human-escalation.md) | 5 | [ ] |
| F31 | Merge Service | [plan](./features/F31-merge-service.md) | 0 | [ ] |

### Milestone 6: Parallelism

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F21 | Multi-Agent Spawning | [plan](./features/F21-multi-agent.md) | 10 | [ ] |
| F22 | Agent Slot Manager | [plan](./features/F22-slot-manager.md) | 5 | [ ] |
| F23 | Tiling View Refactor | [plan](./features/F23-tiling-view.md) | 10 | [ ] |

### Milestone 7: Autopilot

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F32 | Ralph Loop Core | [plan](./features/F32-ralph-loop.md) | 18 | [ ] |
| F33 | Iteration Counter | [plan](./features/F33-iteration-counter.md) | 5 | [ ] |
| F34 | Timeout Manager | [plan](./features/F34-timeout-manager.md) | 5 | [ ] |
| F35 | Stuck Detection | [plan](./features/F35-stuck-detection.md) | 5 | [ ] |
| F36 | Safeguards | [plan](./features/F36-safeguards.md) | 8 | [ ] |
| F37 | Mode Toggle | [plan](./features/F37-mode-toggle.md) | 5 | [ ] |
| F38 | Pause/Resume | [plan](./features/F38-pause-resume.md) | 5 | [ ] |

### Milestone 8: Memory System

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F39 | Scratchpad Manager | [plan](./features/F39-scratchpad.md) | 5 | [ ] |
| F40 | Learning Extractor | [plan](./features/F40-learning-extractor.md) | 8 | [ ] |
| F41 | Learning Injector | [plan](./features/F41-learning-injector.md) | 5 | [ ] |
| F42 | Memory Service | [plan](./features/F42-memory-service.md) | 5 | [ ] |

### Milestone 9: Human Intervention

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F43 | Agent Stop | [plan](./features/F43-agent-stop.md) | 5 | [ ] |
| F44 | Agent Redirect | [plan](./features/F44-agent-redirect.md) | 5 | [ ] |
| F45 | Task Block | [plan](./features/F45-task-block.md) | 3 | [ ] |
| F46 | Intervention Dialog | [plan](./features/F46-intervention-dialog.md) | 8 | [ ] |

### Milestone 10: Rollback

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F47 | Iteration Rollback | [plan](./features/F47-iteration-rollback.md) | 5 | [ ] |
| F48 | Task Rollback | [plan](./features/F48-task-rollback.md) | 5 | [ ] |
| F49 | Checkpoint Create | [plan](./features/F49-checkpoint-create.md) | 5 | [ ] |
| F50 | Checkpoint Restore | [plan](./features/F50-checkpoint-restore.md) | 5 | [ ] |
| F51 | Rollback Service | [plan](./features/F51-rollback-service.md) | 2 | [ ] |

### Milestone 11: Hooks

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F52 | Hook Runner | [plan](./features/F52-hook-runner.md) | 5 | [ ] |
| F53 | Lifecycle Events | [plan](./features/F53-lifecycle-events.md) | 8 | [ ] |
| F54 | Hooks Service | [plan](./features/F54-hooks-service.md) | 5 | [ ] |

### Milestone 12: Recovery + Init

| ID | Feature | Plan | Tests | Status |
|----|---------|------|-------|--------|
| F03 | Init Command | [plan](./features/F03-init-command.md) | 10 | [ ] |
| F55 | State Recovery | [plan](./features/F55-state-recovery.md) | 5 | [ ] |
| F56 | Orphan Cleanup | [plan](./features/F56-orphan-cleanup.md) | 5 | [ ] |
| F57 | Queue Resume | [plan](./features/F57-queue-resume.md) | 5 | [ ] |

---

## Critical Path

Minimum features to reach Autopilot:

```
M1: F01 → F04 → F05 → F06
M2: F07, F08, F09
M3: F10 → F11 → F12 → F13
M4: F15 → F16 → F17, F18, F19, F20
M5: F24 → F25 → F26 → F27-F31
M6: F21, F22
M7: F32-F38
```

**16 core features + dependencies = Autopilot**

---

## Implementation Strategy

### TDD Approach
1. Write tests first (RED)
2. Implement feature (GREEN)
3. Commit immediately
4. Refactor if needed
5. Update this tracking doc

### Feature Plan Template
Each feature plan includes:
- What it does
- Why it's needed
- Dependencies (must be done first)
- Files to create/modify
- Test cases
- Acceptance criteria

### Progress Updates
After each feature:
1. Mark status as ✅ in this doc
2. Update test count
3. Update ledger
4. Commit

---

## Notes

- **Skip F14 (Dependency Resolver)** for MVP - add in M4 if needed
- **F31 (Merge Service)** is integration only - no new tests
- **F03 (Init Command)** moved to end - can use manual setup initially

---

## References

- [Feature Dependency Analysis](./2026-01-10-feature-dependency-analysis.md)
- [Original Workflow Plan](./2026-01-09-chorus-workflow.md)
- [Continuity Ledger](../../ledgers/CONTINUITY_CLAUDE-chorus.md)
