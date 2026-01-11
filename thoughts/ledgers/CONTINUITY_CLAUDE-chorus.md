# Continuity Ledger: Chorus

**Date:** 2026-01-11
**Updated:** 2026-01-12T00:30:00Z
**Status:** XState Migration COMPLETE - Ready for TDD

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**Architecture:** XState v5 Actor Model (crash recovery enabled)

---

## Current State

```
Done: [x] Master plan v4.0 complete (XState architecture)
      [x] First-Seventh Task Audits (cumulative 119 fixes)
      [x] XState migration plan created
      [x] M-1 milestone created (9 tasks including FX09 TUI Machine)
      [x] 54 task dependencies updated to block on M-1
      [x] ch-8j3 deferred + dependency removed from 7 tasks
      [x] Zustand references updated to XState in all tasks
      [x] FX09 TUI Machine added (ch-g3of)
      [x] Committed: 2a36045
Now:  [→] Ready for TDD implementation
Next: Start ch-lxxb (FX01: XState Setup) - ONLY READY TASK
```

**Master Plan:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v4.0)
**XState Plan:** `thoughts/shared/plans/2026-01-11-xstate-migration.md` (v1.1)
**Latest Commit:** `2a36045` feat: add TUI Machine (FX09) to XState architecture

---

## XState Migration (2026-01-11 23:00 → 2026-01-12 00:30)

### Architecture Decision

**APPROVED:** Full migration to XState v5 actor model.

| Aspect | Before (Zustand) | After (XState) |
|--------|-----------------|----------------|
| State stores | taskStore + agentStore (fragmented) | Single ChorusMachine (unified) |
| Agent lifecycle | Manual process management | Spawned child actors |
| Crash recovery | Manual `recover()` function | Deep persistence + event sourcing |
| Type safety | Partial | Full (XState v5 TypeScript) |
| Debugging | Console logs | Stately.ai inspector |
| **TUI State** | Individual hooks | **TUI region in machine** |

### Root Machine Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHORUS ROOT MACHINE                              │
│                           type: 'parallel'                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ orchestration│  │  mergeQueue  │  │  monitoring  │  │     TUI      │ │
│  │    region    │  │    region    │  │    region    │  │    region    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  TUI Region (parallel): focus | modal | selection                        │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                       SPAWNED CHILD ACTORS                               │
│  AgentMachine × n                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### New Milestone: M-1 (XState Foundation)

Inserted BEFORE M0. All other milestones depend on M-1.

| Feature | ID | Description | Tests |
|---------|-----|-------------|-------|
| FX01 | ch-lxxb | XState Setup | 4 |
| FX02 | ch-j321 | XState Types | 8 |
| FX03 | ch-kjae | Root Machine (ChorusMachine) | 12 |
| FX04 | ch-qz9m | Agent Machine (child actor) | 10 |
| FX05 | ch-134l | Persistence Layer | 8 |
| FX06 | ch-5gxg | Event Sourcing (backup) | 6 |
| FX07 | ch-vskx | React Integration | 6 |
| FX08 | ch-mzi3 | Migration Bridge | 4 |
| **FX09** | **ch-g3of** | **TUI Machine** | **14** |

**Total: 9 tasks, ~72 tests**

### TUI Machine Benefits

- Centralized keyboard routing (guards check modal/focus state)
- UI state persisted with app state (crash recovery)
- Predictable modal transitions (no race conditions)
- Easy to visualize in Stately.ai inspector

### Key Files

- Migration Plan: `thoughts/shared/plans/2026-01-11-xstate-migration.md`
- Root Machine: `src/machines/chorus.machine.ts` (to create)
- Agent Machine: `src/machines/agent.machine.ts` (to create)

---

## Session Changes (2026-01-12)

### 1. Fixed ch-8j3 Dependency Issue
Removed ch-8j3 as dependency from 7 tasks that were incorrectly blocked:
- ch-89dk, ch-g6z, ch-3ji, ch-555, ch-di6, ch-jx9, ch-zsn

### 2. Updated Zustand References
5 tasks updated to reference XState instead of Zustand:
- ch-9fq: useTaskSelection → XState selectors
- ch-zsn: Undo Key → XState machine context
- ch-1gi, ch-9yl, ch-wk8: Example learning text updated

### 3. Added FX09 TUI Machine
Created ch-g3of with 14 tests. Key simplifications:
- F64c Keyboard Router: Just sends KEY_PRESS events
- Modal handlers: Send OPEN_*/CLOSE_MODAL events
- Navigation: Sends SELECT_NEXT/PREV events

---

## Key Decisions (Current)

| # | Decision | Choice |
|---|----------|--------|
| 27 | **State Management** | **XState v5 actor model** |
| 28 | **Crash Recovery** | **Snapshot + event sourcing fallback** |
| 29 | **Agent Model** | **Spawned child actors** |
| 30 | **M-1 Milestone** | **XState Foundation blocks all** |
| **31** | **TUI State** | **TUI region in ChorusMachine** |
| 26 | Learning Storage | `.claude/rules/learnings.md` |
| 17 | Worktree Path | `.worktrees/` |
| 10 | MVP Scope | Claude-only |

---

## Task Statistics

```
Total Tasks:     173 (164 existing + 9 new M-1)
Active:          169 (non-deferred)
Deferred:        4   (3 non-Claude + 1 OrchestrationStore replaced)
Ready:           1   (ch-lxxb - FX01: XState Setup)
```

### M-1 Task IDs (XState Foundation)

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| FX01 XState Setup | **ch-lxxb** | - | **READY** |
| FX02 XState Types | ch-j321 | ch-lxxb | blocked |
| FX03 Root Machine | ch-kjae | ch-j321 | blocked |
| FX04 Agent Machine | ch-qz9m | ch-j321 | blocked |
| FX05 Persistence | ch-134l | ch-kjae,ch-qz9m | blocked |
| FX06 Event Sourcing | ch-5gxg | ch-kjae | blocked |
| **FX09 TUI Machine** | **ch-g3of** | **ch-kjae** | **blocked** |
| FX07 React Integration | ch-vskx | ch-134l,ch-5gxg,**ch-g3of** | blocked |
| FX08 Migration Bridge | ch-mzi3 | ch-vskx | blocked |

**ch-mzi3 blocks 47 tasks** (all M0+ root tasks)

### Deferred Tasks
- ch-q1j (F07b) - Non-Claude Context Injection
- ch-jbe (F03c) - Non-Claude CLI Detection
- ch-eyd (F42) - Learning Injector
- ch-8j3 (F19) - OrchestrationStore (REPLACED by XState)

---

## Commands

```bash
# XState implementation
bd update ch-lxxb --status=in_progress  # Start FX01
bd close ch-lxxb                        # Complete FX01 (unblocks FX02)

# Check progress
bd list -l m-1-xstate -n 0              # M-1 tasks (9 total)
bd ready -n 0 | grep -v deferred        # What's ready next
```

---

## Key Files

| File | Purpose |
|------|---------|
| Master Plan | `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v4.0) |
| XState Plan | `thoughts/shared/plans/2026-01-11-xstate-migration.md` (v1.1) |
| Task Rules | `.claude/rules/beads-task-tracking.md` |

---

## Resume Instructions

After `/clear`:
1. Ledger auto-loads (SessionStart hook)
2. **Start:** `bd update ch-lxxb --status=in_progress`
3. **TDD:** `npm install xstate @xstate/react` → Write tests → Implement
4. **Commit** → `bd close ch-lxxb`
5. **Repeat** for ch-j321, ch-kjae, etc.
