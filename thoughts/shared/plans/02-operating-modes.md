# Chorus Operating Modes

**Module:** 02-operating-modes.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [07-ralph-loop.md](./07-ralph-loop.md), [04-task-management.md](./04-task-management.md)

---

## Overview

Chorus supports two operating modes:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **semi-auto** | User selects tasks, agent completes one, stops | Learning, careful work |
| **autopilot** | Runs until no ready tasks remain | Batch processing, overnight |

---

## Semi-Auto Mode (Default)

User-controlled workflow for careful, supervised operation.

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEMI-AUTO MODE                              │
└─────────────────────────────────────────────────────────────────┘

User Flow:
1. View tasks in TaskPanel
2. Select task (arrow keys)
3. Press Enter → assign to agent
4. Watch agent work in AgentTile
5. Agent completes → outputs <chorus>COMPLETE</chorus>
6. Task marked closed
7. Agent STOPS (does not pick new task)
8. User decides next action

Key Behaviors:
├── Agent completes one task then stops
├── User explicitly starts each task
├── Task panel updates in real-time
├── Multiple agents can run in parallel
└── User maintains full control

Signal Handling (Semi-Auto):
├── COMPLETE → Task closed, agent stops, user decides next
├── BLOCKED → Task marked blocked, agent stops, user notified
├── NEEDS_HELP → Agent pauses, user can respond or redirect
└── No signal → Continue iterations until max or timeout
```

### When to Use Semi-Auto

- **Learning a new codebase** - Want to see what agents do
- **Critical changes** - Need human verification at each step
- **Debugging workflows** - Step-by-step execution
- **Training/demos** - Show Chorus operation to others

---

## Autopilot Mode

Fully autonomous operation until all tasks complete.

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTOPILOT MODE                              │
└─────────────────────────────────────────────────────────────────┘

Behavior:
1. Get ready tasks from TaskStore
2. Sort by intelligent selection algorithm
3. While running_agents < maxAgents AND tasks_available:
   - Pick next task by selection algorithm
   - Spawn agent in worktree
4. On agent completion:
   - Queue branch for merge
   - Close task
   - Pick next ready task (if any)
5. Continue until no ready tasks remain

Key Behaviors:
├── Runs until queue empty
├── Respects dependency chains
├── Auto-spawns new agents when slots free
├── Can be paused/resumed
└── Safeguards prevent runaway (max iterations, timeout)

Signal Handling (Autopilot):
├── COMPLETE → Task closed, merge queued, pick next ready task
├── BLOCKED → Task stays blocked, agent freed, pick different task
├── NEEDS_HELP → Alert user, agent pauses, autopilot continues others
└── No signal → Continue iterations until max or timeout
```

### When to Use Autopilot

- **Overnight batch processing** - Run while you sleep
- **Well-defined task queues** - Clear, independent tasks
- **High confidence changes** - Good test coverage
- **Post-planning cleanup** - Execute validated plan

---

## Mode Switching

### TUI Toggle

Press `m` to toggle between modes.

### Configuration

```json
// .chorus/config.json
{
  "mode": "semi-auto"  // or "autopilot"
}
```

---

## Mode State Hierarchy

| Location | Field | Purpose | Precedence |
|----------|-------|---------|------------|
| `planning-state.json` | `chosenMode` | User's choice after planning review | 1 (highest) |
| `state/snapshot.json` | `context.mode` | Current runtime mode (XState snapshot) | 2 |
| `config.json` | `mode` | Project default | 3 (lowest) |

### Mode Resolution Flow

1. If `planning-state.json` has `chosenMode` → use that (first run after planning)
2. Else if `state/snapshot.json` has `context.mode` → use that (survives TUI restarts)
3. Else use `config.json` default

### TUI 'm' Toggle Behavior

- Toggles between `semi-auto` ↔ `autopilot`
- Updates XState context immediately (persisted to `state/snapshot.json`)
- Does NOT update `config.json` (project default unchanged)
- Does NOT update `planning-state.json` (initial choice preserved)

---

## Mode Comparison

| Feature | Semi-Auto | Autopilot |
|---------|-----------|-----------|
| Task selection | User picks | Automatic |
| Agent spawn | On Enter key | On slot available |
| After completion | Agent stops | Picks next task |
| Human intervention | Always available | Available (pauses that agent) |
| Best for | Learning, critical work | Batch processing |

---

## Signal Protocol Summary

Both modes use the same signal protocol from agents:

| Signal | Semi-Auto Behavior | Autopilot Behavior |
|--------|-------------------|-------------------|
| `<chorus>COMPLETE</chorus>` | Close task, stop agent | Close task, pick next |
| `<chorus>BLOCKED:reason</chorus>` | Mark blocked, stop agent | Mark blocked, pick different |
| `<chorus>NEEDS_HELP:reason</chorus>` | Pause, notify user | Pause this agent, continue others |
| `<chorus>PROGRESS:N</chorus>` | Update progress UI | Update progress UI |
| No signal (timeout) | Retry or fail | Retry or fail, continue others |

See [07-ralph-loop.md](./07-ralph-loop.md) for detailed signal protocol specification.

---

## Mode-Specific UI Indicators

### Header Bar (Mode Display)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ semi-auto │ ⚙️ 2/3 agents │ 12 tasks                      │ ? help   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ autopilot │ ⚙️ 3/3 agents │ 8 tasks                       │ ? help   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Footer Bar (Mode Indicator)

```
Semi-Auto:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✓5 ●2 →4 ⊗1 │ Merge: 1 queued │ Runtime: 23m             │ semi-auto ● [m] Toggle │
└─────────────────────────────────────────────────────────────────────────────────┘

Autopilot:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✓5 ●3 →3 ⊗1 │ Merge: 2 queued │ Runtime: 45m            │ autopilot ● [m] Toggle │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Mode Toggle Confirmation (Press 'm')

When switching from semi-auto to autopilot:

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ SWITCH TO AUTOPILOT?                                        │
│ ──────────────────────────────────────────────────────────────│
│                                                                │
│ Autopilot will:                                                │
│ • Automatically assign tasks to available agents               │
│ • Continue until all ready tasks are complete                  │
│ • Respect task dependencies and quality gates                  │
│                                                                │
│ Ready tasks: 4                                                 │
│ Max parallel agents: 3                                         │
│                                                                │
│                        [Enter] Confirm    [ESC] Cancel         │
└────────────────────────────────────────────────────────────────┘
```

When switching from autopilot to semi-auto:

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ SWITCH TO SEMI-AUTO?                                        │
│ ──────────────────────────────────────────────────────────────│
│                                                                │
│ Currently running: 3 agents                                    │
│                                                                │
│ Semi-Auto will:                                                │
│ • Let running agents finish their current tasks                │
│ • NOT start new agents automatically                           │
│ • Require manual task selection for next tasks                 │
│                                                                │
│                        [Enter] Confirm    [ESC] Cancel         │
└────────────────────────────────────────────────────────────────┘
```

### Task Panel States by Mode

**Semi-Auto - User Selects Tasks:**

```
┌─────────────── Tasks (12) ───────────────┐
│                                          │
│  ▸ → ch-001 Setup authentication      ○  │  ← Selected (▸), ready (→)
│    → ch-003 Add validation            ○  │  ← Ready, no agent
│    ● ch-004 Create API endpoint       ●  │  ← Running (●)
│    ⊗ ch-005 Database migration        ○  │  ← Blocked (⊗)
│    ✓ ch-002 Add logging               ○  │  ← Done (✓)
│                                          │
│ ─────────────────────────────────────────│
│ [Enter] Start task  [j/k] Navigate       │
└──────────────────────────────────────────┘
```

**Autopilot - Auto-Assigning Tasks:**

```
┌─────────────── Tasks (12) ───────────────┐
│                                          │
│    ● ch-001 Setup authentication      Ed │  ← Auto-assigned to Ed
│    ● ch-003 Add validation            Ed │  ← Auto-assigned to Ed
│    ● ch-004 Create API endpoint       Ed │  ← Auto-assigned to Ed
│    → ch-006 Add tests              queue │  ← Queued (waiting for slot)
│    ⊗ ch-005 Database migration        ○  │  ← Blocked (skipped)
│    ✓ ch-002 Add logging               ○  │  ← Done
│                                          │
│ ─────────────────────────────────────────│
│ 3/3 agents running │ 1 queued            │
└──────────────────────────────────────────┘
```

### Mode Transition States

```
                          ┌──────────────┐
         ┌───────────────▶│  semi-auto   │◀───────────────┐
         │                └───────┬──────┘                │
         │                        │                       │
         │                   [m] toggle                   │
         │                        │                       │
         │                        ▼                       │
         │                ┌──────────────┐                │
         │                │   confirm    │                │
         │                │    dialog    │                │
         │                └───────┬──────┘                │
         │                        │                       │
      [ESC]                  [Enter]                   [ESC]
         │                        │                       │
         │                        ▼                       │
         │                ┌──────────────┐                │
         └────────────────│  autopilot   │────────────────┘
                          └──────────────┘
```

---

## Safety Limits

Both modes respect safety limits to prevent runaway:

| Config Path | Default | Purpose |
|-------------|---------|---------|
| `agents.maxParallel` | 3 | Concurrent agent slots |
| `agents.timeoutMinutes` | 30 | Per-task timeout |
| `completion.maxIterations` | 50 | Per-task iteration cap |
| `qualityCommands` | Tests, typecheck, lint | Must pass before merge |

```json
// .chorus/config.json (relevant sections)
{
  "agents": {
    "maxParallel": 3,
    "timeoutMinutes": 30
  },
  "completion": {
    "signal": "<chorus>COMPLETE</chorus>",
    "maxIterations": 50
  }
}
```

> **See:** [03-planning-phase.md](./03-planning-phase.md#config-file-chorusconfigurejson) for the complete config structure.

---

## References

- [07-ralph-loop.md](./07-ralph-loop.md) - Autopilot iteration control
- [04-task-management.md](./04-task-management.md) - Task selection algorithm
- [09-intervention-rollback.md](./09-intervention-rollback.md) - Pausing and intervention

---

**End of Operating Modes Module**
