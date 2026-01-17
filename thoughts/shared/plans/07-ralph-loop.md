# Chorus Ralph Loop (Automatic Mode)

**Module:** 07-ralph-loop.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [02-operating-modes.md](./02-operating-modes.md), [04-task-management.md](./04-task-management.md)

---

## Overview

The Ralph Wiggum Loop is Chorus's autopilot implementation. Named after the "Ralph Wiggum" pattern for AI coding, it enables fully autonomous task execution with intelligent iteration control.

---

## UI Design: Iteration Progress

The Ralph loop iteration progress is displayed in the Agent Tile (see [05-agent-personas.md](./05-agent-personas.md#ui-design-agent-display)) and in the Task Detail View when viewing an in-progress task.

### Iteration Progress Box

Displayed in the agent tile and task detail view:

```
┌────────────────────────────────────────────────────────────┐
│ ITERATION PROGRESS                                          │
│ ────────────────────────────────────────────────────────── │
│                                                              │
│ Iteration: 7/50          Duration: 12m 34s                  │
│ Progress:  ▓▓▓▓▓░░░░░░░░░░░░░░░ 50%                        │
│                                                              │
│ Last Signal: <chorus>PROGRESS:50</chorus>                   │
│ Tests:       4/6 passing                                    │
│ Commits:     2 made this session                            │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Iteration Timeline View (in Logs Panel)

Shows iteration history with signals and outcomes:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ITERATION TIMELINE                                                              │
│ ──────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  #1  ░░░░░░░░░░░░░░░░░░░░  10:00:02  1m 30s  PROGRESS:10                       │
│  #2  ░░░░░░░░░░░░░░░░░░░░  10:01:35  2m 10s  PROGRESS:25                       │
│  #3  ▓▓▓▓░░░░░░░░░░░░░░░░  10:03:50  1m 45s  PROGRESS:35                       │
│  #4  ▓▓▓▓▓▓░░░░░░░░░░░░░░  10:05:40  2m 30s  PROGRESS:40                       │
│  #5  ▓▓▓▓▓▓▓░░░░░░░░░░░░░  10:08:15  2m 00s  PROGRESS:45                       │
│  #6  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  10:10:20  2m 15s  (no signal)                       │
│  #7  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  10:12:40  ───     PROGRESS:50  ← current           │
│                                                                                  │
│  Total: 7 iterations │ 12m 34s elapsed │ 50% complete                           │
│                                                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Signal Indicators in Agent Tile

| Signal | Display | Color |
|--------|---------|-------|
| `PROGRESS:N` | Progress bar updates to N% | Blue |
| `COMPLETE` | ✓ COMPLETE shown | Green |
| `BLOCKED:reason` | ⊗ BLOCKED: reason | Yellow |
| `NEEDS_HELP:question` | ❓ NEEDS_HELP | Cyan |
| No signal | (no signal) in gray | Gray |

### Iteration Warnings

When iteration safeguards trigger, show warnings:

```
┌────────────────────────────────────────┐
│ ⚠ WARNING: No commits in 5 iterations │
│   Agent may be stuck                   │
│   [c] Continue [x] Stop                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⏱ WARNING: 80% of max iterations used │
│   Task: ch-004 Register endpoint       │
│   Iteration: 40/50                     │
│   [c] Continue [+] Increase max        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✗ ERROR THRESHOLD REACHED             │
│   3 consecutive errors detected        │
│   Autopilot paused                     │
│   [r] Review errors [x] Stop task      │
└────────────────────────────────────────┘
```

### Completion States

**Successful Completion:**
```
┌────────────────────────────────────────────────────────────┐
│ ✓ TASK COMPLETE                                            │
│ ────────────────────────────────────────────────────────── │
│                                                              │
│ Task:      ch-004 Register endpoint                         │
│ Agent:     ⚙️ ED-001                                          │
│ Duration:  15m 23s                                          │
│ Iterations: 8                                                │
│                                                              │
│ Quality Checks:                                              │
│   ✓ npm test           8/8 tests passing                    │
│   ✓ npm run typecheck  No errors                            │
│   ✓ npm run lint       No issues                            │
│                                                              │
│ Commit: a1b2c3d "feat: add register endpoint #ch-004 @ed-001"│
│                                                              │
│ → Queued for merge                                          │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Timeout State:**
```
┌────────────────────────────────────────────────────────────┐
│ ⏱ TASK TIMED OUT                                           │
│ ────────────────────────────────────────────────────────── │
│                                                              │
│ Task:      ch-010 Error handling middleware                 │
│ Agent:     ⚙️ ED-003                                          │
│ Duration:  30m 00s (max reached)                            │
│ Iterations: 50/50                                            │
│                                                              │
│ Last Progress: 60%                                          │
│ Last Signal:   PROGRESS:60                                  │
│ Tests Status:  4/6 passing                                  │
│                                                              │
│ Worktree preserved: .worktrees/ed-003-ch-010                  │
│                                                              │
│ [r] Retry [e] Edit task [+] Increase limit [x] Abandon      │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Blocked State:**
```
┌────────────────────────────────────────────────────────────┐
│ ⊗ TASK BLOCKED                                             │
│ ────────────────────────────────────────────────────────── │
│                                                              │
│ Task:      ch-012 Database migration                        │
│ Agent:     ⚙️ ED-002                                          │
│ Iteration: 5                                                 │
│                                                              │
│ Block Reason:                                                │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Cannot proceed - database schema requires admin       │   │
│ │ privileges that are not available in this environment │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Signal: <chorus>BLOCKED:Need admin DB access</chorus>       │
│                                                              │
│ [u] Unblock (mark ready) [e] Edit task [x] Cancel           │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                 RALPH WIGGUM LOOP (AUTOPILOT)                    │
└─────────────────────────────────────────────────────────────────┘

                     START AUTOPILOT
                           │
                           ▼
                 ┌─────────────────┐
                 │  Get ready tasks │
                 │   (TaskStore)   │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              │ No tasks?             │
              │ → Done! Exit autopilot│
              └───────────┬───────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Pick task by   │
                 │  selection algo │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Spawn agent    │
                 │  with task      │
                 └────────┬────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │          ITERATION LOOP             │
         │                                     │
         │  Agent runs → check output          │
         │                                     │
         │    ┌───────────┬───────────┐        │
         │    │           │           │        │
         │    ▼           ▼           ▼        │
         │ COMPLETE    BLOCKED    NO SIGNAL    │
         │    │           │           │        │
         │    │           │     iteration++    │
         │    │           │           │        │
         │    │           │    ┌──────┴─────┐  │
         │    │           │    │ < max?     │  │
         │    │           │    └──────┬─────┘  │
         │    │           │      YES  │  NO    │
         │    │           │           │   │    │
         │    │           │   RESPAWN │ FAIL   │
         └────┼───────────┼───────────┼───┼────┘
              │           │           │   │
              ▼           ▼           │   ▼
        ┌──────────┐ ┌──────────┐    │ ┌──────────┐
        │Close task│ │Block task│    │ │Timeout   │
        │Queue     │ │Alert user│    │ │Alert user│
        │merge     │ │          │    │ │          │
        └────┬─────┘ └──────────┘    │ └──────────┘
             │                       │
             └───────────────────────┘
                         │
                         ▼
               ┌─────────────────┐
               │ Agent slot free │
               │ More tasks?     │
               └────────┬────────┘
                        │
              YES ──────┴────── NO
               │                │
               ▼                ▼
        [Spawn next]      [All done!]
```

---

## Signal Protocol

> **See:** [05-agent-personas.md](./05-agent-personas.md#signal-types-signal-typesmd) for the complete signal protocol definition.

Signals are detected using regex:

```typescript
const SIGNAL_REGEX = /<chorus>(\w+)(?::\s*(.+?))?<\/chorus>/;
```

---

## Completion Check

Completion requires BOTH signal AND required quality commands passing:

```
┌──────────────────┬─────────────────┬─────────────────────────────────┐
│ Signal           │ Quality Commands│ Result                          │
├──────────────────┼─────────────────┼─────────────────────────────────┤
│ COMPLETE         │ All Pass        │ ✓ Task CLOSED, queue merge      │
│ COMPLETE         │ Any Fail        │ Continue iterations             │
│ BLOCKED          │ (any)           │ Task → BLOCKED, agent stops     │
│ NEEDS_HELP       │ (any)           │ Alert user, agent pauses        │
│ No Signal        │ All Pass        │ Continue (agent must signal)    │
│ No Signal        │ Any Fail        │ Continue iterations             │
│ Max Iterations   │ (any)           │ Task → TIMEOUT, agent stops     │
│ Timeout          │ (any)           │ Task → TIMEOUT, agent stops     │
└──────────────────┴─────────────────┴─────────────────────────────────┘
```

### Mode-Specific Behavior

**BLOCKED Signal:**
- Semi-auto: Agent stops, user decides next action
- Autopilot: Agent freed, task stays blocked, picks next ready task

**TIMEOUT State:**
- Task marked as TIMEOUT (distinct from FAILED)
- Worktree preserved for debugging
- User can: (r) retry, (e) edit task, (R) rollback
- Autopilot: Skips task, picks next ready task, alerts user

---

## Iteration Safeguards

```
1. MAX ITERATIONS CAP
   Default: 50 iterations
   Config: completion.maxIterations

2. TIMEOUT PER TASK
   Default: 30 minutes (1800000ms)
   Config: completion.taskTimeout

3. PROGRESS DETECTION
   If 5 iterations with no git commits:
   - Alert user: "Agent may be stuck"
   - Option to continue or stop

4. ERROR THRESHOLD
   If 3 consecutive errors:
   - Pause autopilot
   - Require human review
```

---

## Agent Exit Handling

```
┌──────────────────┬────────────────┬────────────────────────────────┐
│ Exit Condition   │ Task Status    │ Action                         │
├──────────────────┼────────────────┼────────────────────────────────┤
│ 0 + COMPLETE     │ done           │ Queue merge, cleanup           │
│ 0 + COMPLETE     │ (tests fail)   │ Continue iterations            │
│ 0 + no signal    │ doing          │ Increment iteration            │
│ 0 + BLOCKED      │ stuck          │ Log reason, alert user         │
│ != 0             │ failed         │ Keep worktree, alert           │
│ SIGTERM (user)   │ todo           │ Stash changes, release task    │
│ SIGKILL (crash)  │ todo           │ Keep worktree for recovery     │
└──────────────────┴────────────────┴────────────────────────────────┘
```

---

## Task Recovery

### FAILED Recovery

- Press `r` on failed task → Task returns to todo, worktree preserved
- Press `e` to edit task description → Then retry
- Press `R` to rollback → Reverts commits, task → todo
- Press `X` (Shift+x) to cleanup worktree → Removes worktree, task stays failed

### TIMEOUT Recovery

- Press `r` on timed-out task → Fresh iteration counter, retry
- Press `e` to simplify task → Break into smaller tasks
- Press `+` to increase maxIterations for this task
- Distinct from FAILED: No error occurred, agent just couldn't finish in time

---

## Configuration

```json
{
  "completion": {
    "signal": "<chorus>COMPLETE</chorus>",
    "maxIterations": 50
  },
  "agents": {
    "maxParallel": 3,
    "timeoutMinutes": 30
  }
}
```

---

## XState Integration

The Ralph loop is implemented in the orchestration region:

```typescript
orchestration: {
  initial: 'idle',
  states: {
    idle: {
      on: {
        START_AUTOPILOT: 'running',
        START_SEMI_AUTO: 'waiting_user'
      }
    },
    running: {
      invoke: {
        src: 'ralphLoop',
        onDone: 'completed',
        onError: 'paused'
      },
      on: {
        PAUSE: 'paused',
        AGENT_COMPLETED: { actions: 'handleCompletion' },
        AGENT_BLOCKED: { actions: 'handleBlocked' },
        NO_MORE_TASKS: 'completed'
      }
    },
    paused: {
      on: { RESUME: 'running' }
    },
    waiting_user: {
      on: {
        ASSIGN_TASK: { actions: 'spawnAgent' },
        TOGGLE_AUTOPILOT: 'running'
      }
    },
    completed: { type: 'final' }
  }
}
```

---

## Parallel Agent Coordination

When multiple agents work simultaneously in autopilot:

```typescript
async function runRalphLoop(context: ChorusMachineContext): Promise<void> {
  const maxAgents = context.maxAgents;

  while (true) {
    // Fill available slots with agents
    while (context.agents.length < maxAgents) {
      const task = context.taskStore.selectNext({
        excludeIds: context.agents.map(a => a.taskId)
      });

      if (!task) break;

      await spawnAgent(task, context);
    }

    // Wait for any agent to complete
    const result = await Promise.race(
      context.agents.map(a => a.completion)
    );

    handleResult(result, context);

    // Check if done
    const readyCount = context.taskStore.ready().length;
    if (readyCount === 0 && context.agents.length === 0) {
      break;
    }
  }
}
```

---

## References

- [02-operating-modes.md](./02-operating-modes.md) - Autopilot mode details
- [04-task-management.md](./04-task-management.md) - Task selection algorithm
- [06-merge-service.md](./06-merge-service.md) - Post-completion merge queue

---

**End of Ralph Loop Module**
