# Continuity Ledger: Chorus

**Updated:** 2026-01-12T04:00:00Z
**Status:** Ready for TDD - Start ch-lxxb (FX01)

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**Architecture:** XState v5 Actor Model (crash recovery enabled)

---

## Current State

```
Done: [x] Planning complete (9 audits, 175 tasks created)
      [x] XState migration plan finalized
      [x] M-1 milestone blocks all other milestones
      [x] Quality tools setup (Biome + Knip)
Now:  [→] Ready for TDD implementation
Next: Start ch-lxxb (FX01: XState Setup)
```

**Latest Commit:** `e433863` chore: add Knip for dead code detection

---

## Quality Pipeline

```bash
npm run quality   # Runs all checks below:
# 1. npm run test:run   - Vitest (176 tests)
# 2. npm run typecheck  - TypeScript strict
# 3. npm run lint       - Biome
# 4. npm run knip       - Dead code detection
```

TDD Pattern: `RED → GREEN → npm run quality → COMMIT`

---

## XState Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHORUS ROOT MACHINE                              │
│                           type: 'parallel'                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ orchestration│  │  mergeQueue  │  │  monitoring  │  │     TUI      │ │
│  │    region    │  │    region    │  │    region    │  │    region    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                       SPAWNED CHILD ACTORS                               │
│  AgentMachine × n                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Files to Create:**
- `src/machines/chorus.machine.ts` (Root Machine)
- `src/machines/agent.machine.ts` (Agent Machine)

---

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | State Management | XState v5 actor model |
| 2 | Crash Recovery | Snapshot + event sourcing fallback |
| 3 | Agent Model | Spawned child actors |
| 4 | TUI State | Minimal region (focus + modal only) |
| 5 | Test Pattern | AAA (Arrange-Act-Assert) MANDATORY |
| 6 | XState Testing | createActor + getSnapshot |
| 7 | MVP Scope | Claude-only |

---

## M-1 Task IDs (XState Foundation)

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| FX01 XState Setup | **ch-lxxb** | - | **READY** |
| FX02 XState Types | ch-j321 | ch-lxxb | blocked |
| FX03 Root Machine | ch-kjae | ch-j321 | blocked |
| FX04 Agent Machine | ch-qz9m | ch-j321 | blocked |
| FX05 Persistence | ch-134l | ch-kjae,ch-qz9m | blocked |
| FX06 Event Sourcing | ch-5gxg | ch-kjae | blocked |
| FX09 TUI Machine | ch-g3of | ch-kjae | blocked |
| FX07 React Integration | ch-vskx | ch-134l,ch-5gxg,ch-g3of | blocked |
| FX08 Migration Bridge | ch-mzi3 | ch-vskx | blocked |
| FX10 RalphLoop Machine | ch-lbe7 | ch-vskx | blocked |
| CHORE: Zustand Cleanup | ch-gzhj | ch-mzi3 | blocked |

**Total:** 11 tasks, ~88 tests
**ch-mzi3 blocks:** 47 tasks (all M0+ root tasks)

---

## Task Statistics

```
Total:    175 tasks
Active:   171 (non-deferred)
Deferred: 4 (ch-q1j, ch-jbe, ch-eyd, ch-8j3)
Ready:    1 (ch-lxxb)
```

---

## Commands

```bash
# Start implementation
bd update ch-lxxb --status=in_progress

# Check progress
bd list -l m-1-xstate -n 0
bd ready -n 0 | grep -v deferred
```

---

## Key Files

| File | Purpose |
|------|---------|
| Master Plan | `thoughts/shared/plans/2026-01-09-chorus-workflow.md` |
| XState Plan | `thoughts/shared/plans/2026-01-11-xstate-migration.md` |
| Task Rules | `.claude/rules/beads-task-tracking.md` |

---

## Resume Instructions

After `/clear`:
1. Ledger auto-loads
2. `bd update ch-lxxb --status=in_progress`
3. TDD: Write tests → Implement → Commit
4. `bd close ch-lxxb` → Unblocks FX02, FX03, FX04
