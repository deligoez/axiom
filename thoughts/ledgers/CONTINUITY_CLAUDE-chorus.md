# Continuity Ledger: Chorus

**Date:** 2026-01-11
**Updated:** 2026-01-11T23:30:00Z
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
      [x] M-1 milestone created (8 tasks)
      [x] 54 task dependencies updated to block on M-1
      [x] ch-8j3 deferred (replaced by XState)
      [x] Committed: df50432
Now:  [→] Ready for TDD implementation
Next: Start ch-lxxb (FX01: XState Setup) - ONLY READY TASK
```

**Master Plan:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v4.0)
**XState Plan:** `thoughts/shared/plans/2026-01-11-xstate-migration.md`
**Commit:** `df50432` feat: migrate to XState v5 actor model architecture

---

## XState Migration (2026-01-11 23:00)

### Architecture Decision

**APPROVED:** Full migration to XState v5 actor model.

| Aspect | Before (Zustand) | After (XState) |
|--------|-----------------|----------------|
| State stores | taskStore + agentStore (fragmented) | Single ChorusMachine (unified) |
| Agent lifecycle | Manual process management | Spawned child actors |
| Crash recovery | Manual `recover()` function | Deep persistence + event sourcing |
| Type safety | Partial | Full (XState v5 TypeScript) |
| Debugging | Console logs | Stately.ai inspector |

### New Milestone: M-1 (XState Foundation)

Inserted BEFORE M0. All other milestones depend on M-1.

| Feature | Description | Tests |
|---------|-------------|-------|
| FX01 | XState Setup | 4 |
| FX02 | XState Types | 8 |
| FX03 | Root Machine (ChorusMachine) | 12 |
| FX04 | Agent Machine (child actor) | 10 |
| FX05 | Persistence Layer | 8 |
| FX06 | Event Sourcing (backup) | 6 |
| FX07 | React Integration | 6 |
| FX08 | Migration Bridge | 4 |

**Total: 8 tasks, ~58 tests**

### Affected Existing Tasks

| Task | Change |
|------|--------|
| ch-8j3 (F19: OrchestrationStore) | **DELETE** - Replaced by XState |
| ch-g6z (F20: useOrchestration) | **MODIFY** - Use `useMachine` |
| ch-0e7 (F15: Orchestrator) | **MODIFY** - Machine transitions |
| ch-7jw (F16a: CompletionHandler) | **MODIFY** - XState action |
| ch-i9i (F22: Slot Manager) | **MODIFY** - Orchestration region |

### Key Files

- Migration Plan: `thoughts/shared/plans/2026-01-11-xstate-migration.md`
- Root Machine: `src/machines/chorus.machine.ts` (to create)
- Agent Machine: `src/machines/agent.machine.ts` (to create)

---

## Historical: Task Audits (Summary)

> **7 audits completed (2026-01-10 to 2026-01-11)**
> - 119 cumulative fixes applied
> - Key conflicts resolved ('L', 'a', 'r' keys)
> - All dependency issues fixed
> - Final count before XState: 164 tasks, 52 ready

---

## Key Decisions (Current)

| # | Decision | Choice |
|---|----------|--------|
| 27 | **State Management** | **XState v5 actor model** |
| 28 | **Crash Recovery** | **Snapshot + event sourcing fallback** |
| 29 | **Agent Model** | **Spawned child actors** |
| 30 | **M-1 Milestone** | **XState Foundation blocks all** |
| 26 | Learning Storage | `.claude/rules/learnings.md` |
| 17 | Worktree Path | `.worktrees/` |
| 10 | MVP Scope | Claude-only |

> Full decision history: See master plan v4.0

---

## Task Statistics

```
Total Tasks:     172 (164 existing + 8 new M-1)
Active:          168 (non-deferred)
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
| FX07 React Integration | ch-vskx | ch-134l,ch-5gxg | blocked |
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
bd list -l m-1-xstate -n 0              # M-1 tasks
bd ready -n 0 | grep -v deferred        # What's ready next
```

---

## Key Files

| File | Purpose |
|------|---------|
| Master Plan | `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v4.0) |
| XState Plan | `thoughts/shared/plans/2026-01-11-xstate-migration.md` |
| Task Rules | `.claude/rules/beads-task-tracking.md` |

---

## Resume Instructions

After `/clear`:
1. Ledger auto-loads (SessionStart hook)
2. **Start:** `bd update ch-lxxb --status=in_progress`
3. **TDD:** `npm install xstate @xstate/react` → Write tests → Implement
4. **Commit** → `bd close ch-lxxb`
5. **Repeat** for ch-j321, ch-kjae, etc.
