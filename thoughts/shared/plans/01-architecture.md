# Chorus Architecture

**Module:** 01-architecture.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [02-operating-modes.md](./02-operating-modes.md), [09-intervention-rollback.md](./09-intervention-rollback.md)

---

## Overview

Chorus uses an XState v5 actor model for state management. This architectural choice enables:

- **Single state tree** - All state in one machine, always consistent
- **Actor isolation** - Each agent is a spawned child actor with own lifecycle
- **Crash recovery** - Deep persistence of entire actor hierarchy
- **Type safety** - XState v5's TypeScript-first design
- **Visualization** - Stately.ai inspector for debugging

---

## XState-Based Actor Architecture

> **Major Change (v4.0):** Migrated from Zustand stores to XState v5 actor model.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHORUS ARCHITECTURE                           │
│                      XState Actor Model                          │
└─────────────────────────────────────────────────────────────────┘

                      ┌─────────────────┐
                      │   ChorusApp     │
                      │   (Ink root)    │
                      └────────┬────────┘
                               │
                      useMachine(chorusMachine)
                               │
                               ▼
         ┌─────────────────────────────────────────────┐
         │              CHORUS MACHINE                  │
         │              type: 'parallel'                │
         │                                              │
         │  ┌─────────────┐ ┌─────────────┐ ┌────────┐  │
         │  │orchestration│ │ mergeQueue  │ │monitor │  │
         │  │   region    │ │   region    │ │ region │  │
         │  └─────────────┘ └─────────────┘ └────────┘  │
         │                                              │
         │  ┌────────────────────────────────────────┐  │
         │  │         SPAWNED CHILD ACTORS           │  │
         │  │                                        │  │
         │  │  ┌──────────┐ ┌──────────┐ ┌────────┐  │  │
         │  │  │ Agent[1] │ │ Agent[2] │ │Agent[n]│  │  │
         │  │  │ Machine  │ │ Machine  │ │Machine │  │  │
         │  │  └──────────┘ └──────────┘ └────────┘  │  │
         │  └────────────────────────────────────────┘  │
         └─────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │TaskStore│          │ git CLI │          │ agent   │
    │ (tasks) │          │(worktree)│          │ CLI     │
    └─────────┘          └─────────┘          └─────────┘
```

---

## State Management (XState)

**Primary:** XState machine state (in-memory actor hierarchy)
**Persistence:** `.chorus/state/snapshot.json` + `.chorus/state/events.jsonl` (event sourcing fallback)

### Root Machine Context

```typescript
interface ChorusMachineContext {
  config: ChorusConfig;
  mode: 'semi-auto' | 'autopilot';
  agents: ActorRefFrom<typeof agentMachine>[];  // Spawned actors
  maxAgents: number;
  mergeQueue: MergeQueueItem[];
  stats: SessionStats;
  planningState?: PlanningState;
}
```

### Agent Machine Context (Child Actor)

```typescript
interface AgentMachineContext {
  taskId: string;
  agentId: string;           // e.g., "ed-001", "ace", "finn"
  persona: PersonaType;      // "ace" | "ed" | "pat" | "finn" | "sam" | "lou" | "dan" | "will" | "carl"
  parentRef: AnyActorRef;    // For sendTo parent
  iteration: number;
  maxIterations: number;
  worktree: string;          // .worktrees/{agentId}-{taskId}
  branch: string;            // agent/{agentId}/{taskId}
  pid?: number;
  startedAt?: number;
  lastSignal?: ChorusSignal;
  error?: Error;
}
```

---

## Hybrid Recovery Strategy

```typescript
async function recover(): Promise<AnyActorRef> {
  try {
    // Primary: Snapshot restore (fast)
    const snapshot = JSON.parse(
      await fs.readFile('.chorus/state/snapshot.json', 'utf-8')
    );
    const actor = createActor(chorusMachine, { snapshot }).start();

    // Validate actor hierarchy is alive
    if (actor.getSnapshot().status !== 'active') {
      throw new Error('Snapshot restoration failed');
    }
    return actor;
  } catch {
    // Fallback: Event sourcing replay (reliable)
    const events = (await fs.readFile('.chorus/state/events.jsonl', 'utf-8'))
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line).event);

    const actor = createActor(chorusMachine).start();
    for (const event of events) {
      actor.send(event);
    }
    return actor;
  }
}
```

---

## TUI Region States (Parallel Sub-Machine)

```
┌───────────────────────────────────────────────────────────────────┐
│                        TUI REGION                                  │
│                      type: 'parallel'                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │     focus       │  │      modal      │  │    selection    │    │
│  │                 │  │                 │  │                 │    │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │    │
│  │  │ taskPanel │  │  │  │  closed   │  │  │  │   none    │  │    │
│  │  │ agentGrid │  │  │  │  help     │  │  │  │   task    │  │    │
│  │  └───────────┘  │  │  │intervention│  │  │  │   agent   │  │    │
│  │                 │  │  │  logs     │  │  │  └───────────┘  │    │
│  │                 │  │  │ learnings │  │  │                 │    │
│  │                 │  │  │  merge    │  │  │                 │    │
│  │                 │  │  │ confirm   │  │  │                 │    │
│  │                 │  │  │ settings  │  │  │                 │    │
│  │                 │  │  └───────────┘  │  │                 │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**TUI Region Benefits:**
- Centralized keyboard routing (guards check modal/focus state)
- UI state persisted with app state (crash recovery)
- Predictable modal transitions (no race conditions)
- Easy to visualize in Stately.ai inspector

---

## Agent Machine States (Child Actor)

```
┌─────────────────────────────────────────────────────┐
│                    AGENT MACHINE                     │
│                                                      │
│              ┌──────────┐                            │
│              │  idle    │ ← Initial state            │
│              └────┬─────┘                            │
│                   │ START                            │
│                   ▼                                  │
│              ┌──────────┐                            │
│              │preparing │ ← Setup worktree, claim    │
│              └────┬─────┘                            │
│                   │ READY                            │
│                   ▼                                  │
│         ┌────────────────────┐                       │
│         │     executing      │                       │
│         │  (nested states)   │                       │
│         │                    │                       │
│         │  ┌────────────┐    │                       │
│         │  │ iteration  │◄───┼──────┐                │
│         │  └─────┬──────┘    │      │                │
│         │        │ ITERATION_DONE   │ RETRY          │
│         │        ▼           │      │                │
│         │  ┌────────────┐    │      │                │
│         │  │checkQuality│────┼──────┘                │
│         │  └─────┬──────┘    │                       │
│         │        │ ALL_PASS  │                       │
│         └────────┼───────────┘                       │
│                  │                                   │
│    ┌─────────────┼─────────────┐                     │
│    │             │             │                     │
│    ▼             ▼             ▼                     │
│ ┌──────┐   ┌─────────┐   ┌─────────┐                 │
│ │blocked│   │completed│   │ failed  │ ← Final states │
│ └──────┘   └─────────┘   └─────────┘                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Event Definitions

### Root Machine Events

```typescript
type ChorusMachineEvent =
  // App-level
  | { type: 'CONFIG_COMPLETE'; config: ChorusConfig }
  | { type: 'PLAN_APPROVED'; tasks: Task[] }
  | { type: 'REVIEW_PASSED' }
  | { type: 'NEEDS_REVISION'; issues: ValidationIssue[] }
  | { type: 'TRIGGER_PLANNING' }

  // Agent management
  | { type: 'SPAWN_AGENT'; taskId: string }
  | { type: 'STOP_AGENT'; agentId: string }
  | { type: 'AGENT_COMPLETED'; agentId: string; result: AgentResult }
  | { type: 'AGENT_FAILED'; agentId: string; error: Error }
  | { type: 'AGENT_BLOCKED'; agentId: string; reason: string }

  // Orchestration control
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_MODE'; mode: 'semi-auto' | 'autopilot' }

  // Merge queue
  | { type: 'ENQUEUE_MERGE'; taskId: string; branch: string }
  | { type: 'MERGE_COMPLETED'; taskId: string }
  | { type: 'MERGE_CONFLICT'; taskId: string; level: ConflictLevel }

  // Recovery
  | { type: 'RESTORE'; snapshot: PersistedSnapshot }
  | { type: 'CHECKPOINT_CREATED'; tag: string }

  // TUI Focus
  | { type: 'FOCUS_TASK_PANEL' }
  | { type: 'FOCUS_AGENT_GRID' }
  | { type: 'TOGGLE_FOCUS' }

  // TUI Modals
  | { type: 'OPEN_HELP' }
  | { type: 'OPEN_INTERVENTION' }
  | { type: 'OPEN_LOGS'; agentId: string }
  | { type: 'OPEN_LEARNINGS' }
  | { type: 'OPEN_MERGE_VIEW' }
  | { type: 'OPEN_CONFIRM'; action: ConfirmAction }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_MODAL' }

  // TUI Selection
  | { type: 'SELECT_TASK'; taskId: string }
  | { type: 'SELECT_AGENT'; agentId: string }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREV' }
  | { type: 'CLEAR_SELECTION' }

  // Keyboard
  | { type: 'KEY_PRESS'; key: string; ctrl?: boolean; shift?: boolean };
```

### Agent Machine Events

```typescript
type AgentMachineEvent =
  | { type: 'START' }
  | { type: 'READY' }
  | { type: 'ITERATION_DONE'; signal?: ChorusSignal }
  | { type: 'QUALITY_CHECKED'; results: QualityResult[] }
  | { type: 'ALL_PASS' }
  | { type: 'RETRY' }
  | { type: 'BLOCKED'; reason: string }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; error: Error }
  | { type: 'TIMEOUT' }
  | { type: 'STOP' };
```

### TUI Context

```typescript
interface TUIContext {
  focusedPanel: 'taskPanel' | 'agentGrid';
  selectedTaskId: string | null;
  selectedAgentId: string | null;
  taskIndex: number;
  agentIndex: number;
  pendingConfirm?: {
    action: 'quit' | 'stop_agent' | 'block_task';
    payload?: unknown;
  };
}
```

---

## Persistence Points

| Event | Persist Snapshot | Persist Event |
|-------|-----------------|---------------|
| Agent spawned | ✓ | ✓ |
| Agent completed | ✓ | ✓ |
| Agent failed | ✓ | ✓ |
| Mode changed | ✓ | ✓ |
| Merge completed | ✓ | ✓ |
| User checkpoint | ✓ | ✓ |
| Every 5 seconds | ✓ | - |

---

## CLI Architecture (Non-TUI Commands)

Chorus CLI has 3 types of commands:

| Category | Example | XState Relationship |
|----------|---------|---------------------|
| **Stateless** | `--version`, `--help` | No machine, direct output |
| **Event Sender** | `pause`, `resume`, `stop-agent <id>` | Load snapshot → send event → persist → exit |
| **Headless Actor** | `merge-user`, `daemon` | Own actor instance, no TUI |

### Event Sender Pattern

```typescript
// chorus pause
async function handlePauseCommand(): Promise<void> {
  // 1. Load persisted snapshot
  const snapshot = await loadSnapshot('.chorus/state/snapshot.json');

  // 2. Create actor from snapshot
  const actor = createActor(chorusMachine, { snapshot });
  actor.start();

  // 3. Send event
  actor.send({ type: 'PAUSE' });

  // 4. Persist new state
  await persistSnapshot(actor.getPersistedSnapshot());

  // 5. Exit
  console.log('Chorus paused.');
  process.exit(0);
}
```

### TUI vs CLI State Synchronization

```
┌──────────────────────────────────────────────────────────────┐
│                    CHORUS ACTOR SYSTEM                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────────────────────────────────────┐    │
│   │         ChorusMachine (Core - TUI Independent)       │    │
│   │  orchestration │ mergeQueue │ monitoring            │    │
│   └─────────────────────────────────────────────────────┘    │
│                           │                                   │
│            ┌──────────────┼──────────────┐                   │
│            ▼              ▼              ▼                    │
│     ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│     │ TUI App  │   │ CLI Cmd  │   │ Headless │              │
│     │ (React)  │   │ (oneshot)│   │ (daemon) │              │
│     └──────────┘   └──────────┘   └──────────┘              │
│         │                │                                    │
│         │ subscribe      │ load/persist                       │
│         ▼                ▼                                    │
│     ┌─────────────────────────────────────────┐              │
│     │          .chorus/state/                  │              │
│     │   snapshot.json + events.jsonl           │              │
│     │        (Shared Persistence Layer)        │              │
│     └─────────────────────────────────────────┘              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**CLI→TUI Sync:** File watcher on state/snapshot.json (simple, reliable, MVP-appropriate).

### Minimal TUI Region

TUI region only contains behavior-affecting state (keyboard routing depends on focus/modal):

```typescript
// INCLUDE in machine (affects behavior)
tui: {
  type: 'parallel',
  states: {
    focus: { initial: 'agentGrid', states: { agentGrid: {}, taskPanel: {} } },
    modal: { initial: 'closed', states: { closed: {}, help: {}, intervention: {}, confirm: {} } }
  }
}

// EXCLUDE from machine (pure UI)
// - Scroll position, hover states, animation frames, input focus (React state)
```

---

## XState Testing Strategy

### AAA Pattern (Mandatory)

```typescript
import { createActor } from 'xstate';
import { describe, it, expect, vi } from 'vitest';

describe('AgentMachine', () => {
  it('transitions from idle to preparing on START', () => {
    // Arrange
    const actor = createActor(agentMachine, {
      input: { taskId: 'task-1', parentRef: mockParentRef }
    });
    actor.start();

    // Act
    actor.send({ type: 'START' });

    // Assert
    expect(actor.getSnapshot().value).toBe('preparing');
  });
});
```

### Testing Categories

| Category | What to Test | XState Pattern |
|----------|--------------|----------------|
| State Transitions | Event → new state | `actor.send()` + `getSnapshot().value` |
| Context Updates | Event → context change | `getSnapshot().context` |
| Guards | Conditional transitions | Send event, verify state based on context |
| Actions | Side effects executed | Mock actions with `vi.fn()` |
| Invoked Actors | Promise/callback handling | Mock with `fromPromise()` |
| Spawned Actors | Parent-child communication | Check `context.agents` array |

### Test Organization

```
tests/
├── machines/
│   ├── chorus.machine.test.ts     # Root machine tests
│   ├── agent.machine.test.ts      # Agent actor tests
│   ├── guards.test.ts             # Isolated guard tests
│   └── actions.test.ts            # Isolated action tests
├── integration/
│   ├── spawn-agent.test.ts        # Parent-child spawning
│   ├── persistence.test.ts        # Snapshot/restore tests
│   └── recovery.test.ts           # Crash recovery tests
└── e2e/
    └── chaos.test.ts              # Kill -9 scenarios
```

---

## Key Decisions Rationale

### Decision 15: XState v5 for State Management

**Rationale:**
- Actor model fits multi-agent orchestration naturally
- Built-in persistence with `getPersistedSnapshot()`
- Type-safe events and context
- Visual debugging with Stately.ai inspector
- Crash recovery with snapshot + event sourcing

**Alternatives Considered:**
- Zustand: Simpler but lacks actor hierarchy, crash recovery is manual
- Redux: Too boilerplate-heavy for this use case
- MobX: Reactive but doesn't model finite states well

### Decision 14: Context Strategy (Claude Compact → Custom Ledger)

**MVP: Claude Compact**

Claude Code has built-in context management via `/compact` command. For MVP:
- Agent runs until context fills (~70% usage)
- Claude automatically compacts conversation
- Task context preserved via prompt injection (re-injected after compact)
- No special handling needed by Chorus

```
Agent iteration 1-N:
├── Claude manages its own context
├── On compact: Claude summarizes conversation
├── Task prompt (from F07) re-injected automatically
└── Chorus monitors via output parsing only
```

**Post-MVP: Custom Ledger System**

For long-running tasks or complex multi-file changes:
- Chorus maintains a task-specific ledger (`.chorus/ledgers/{task-id}.md`)
- Ledger tracks: files changed, decisions made, blockers encountered
- On agent restart/compact: Ledger injected for continuity
- Enables cross-iteration state that survives compaction

```typescript
// Post-MVP ledger structure
interface TaskLedger {
  taskId: string;
  filesModified: string[];
  keyDecisions: { decision: string; rationale: string }[];
  blockers: { issue: string; resolution?: string }[];
  lastIteration: number;
  lastCheckpoint: string;  // git commit hash
}
```

**Why defer custom ledger?**
- Claude's built-in compact works well for most tasks
- Ledger adds complexity without clear MVP benefit
- Can evaluate need based on real usage patterns

---

## Support Trio: Will and Carl

👁️ **Watcher Will** (Health Monitor) and 📈 **Counter Carl** (Statistician) are special agents that don't work on tasks in worktrees. They're single-instance agents that support the orchestration.

### Will: Timer-Based Health Monitoring

Will runs on a 1-minute timer with guards to prevent unnecessary invocations:

```typescript
// In ChorusMachine monitor region
monitor: {
  initial: 'idle',
  states: {
    idle: {
      after: {
        60000: {
          target: 'checkingHealth',
          guard: 'hasActiveAgents'  // Only run if agents exist
        }
      }
    },
    checkingHealth: {
      invoke: {
        src: 'willHealthCheck',
        onDone: 'idle',
        onError: 'idle'
      }
    }
  }
}

// Guard definition
guards: {
  hasActiveAgents: ({ context }) => context.agents.length > 0
}
```

**Will's Responsibilities:**
- Check agent health (response, stalled iterations)
- Alert on stuck agents
- Monitor worktree disk usage
- Report system resource warnings

**No worktree needed:** Will operates from main repository, doesn't modify code.

### Carl: Event-Driven Metrics Collection

Carl responds to events rather than polling. Metrics stored in `.chorus/metrics/`.

**Critical Role: Agent ID Assignment**

Carl owns the agent spawn counters. When the orchestrator needs to spawn an agent, Carl assigns the ID:

```typescript
// Agent ID assignment (synchronous - Carl must respond before spawn)
type CarlRequest =
  | { type: 'AGENT_SPAWN_REQUEST'; persona: PersonaType }  // Returns agentId

// Example flow:
// Orchestrator: AGENT_SPAWN_REQUEST { persona: 'ace' }
// Carl: increments ace counter 3 → 4, returns 'ace-004'
// Orchestrator: spawns ace-004

// Carl events (async - doesn't block orchestration)
type CarlEvent =
  | { type: 'AGENT_SPAWNED'; agentId: string; taskId: string }
  | { type: 'AGENT_COMPLETED'; agentId: string; duration: number; tokens: number }
  | { type: 'AGENT_FAILED'; agentId: string; error: string }
  | { type: 'MERGE_COMPLETED'; taskId: string; duration: number }
  | { type: 'TASK_COMPLETED'; taskId: string; totalTime: number };

// Carl accumulates metrics without blocking orchestration
on: {
  AGENT_SPAWN_REQUEST: { actions: 'carlAssignAgentId' },  // Sync response
  AGENT_SPAWNED: { actions: 'carlRecordSpawn' },
  AGENT_COMPLETED: { actions: 'carlRecordCompletion' },
  // ... etc
}
```

**Carl's Outputs:**
- `.chorus/metrics/counters.json` - Agent spawn counters (lifetime, persists)
- `.chorus/metrics/session.json` - Current session stats
- `.chorus/metrics/history.jsonl` - Historical data for trends
- `.chorus/metrics/agents/{agentId}.json` - Per-agent performance

**No worktree needed:** Carl only writes to metrics directory, doesn't modify code.

### Support Trio File Structure

```
.chorus/
├── agents/
│   ├── will/           # Watcher Will (health monitor)
│   │   ├── prompt.md
│   │   ├── rules.md
│   │   └── logs/
│   └── carl/           # Counter Carl (statistician)
│       ├── prompt.md
│       ├── rules.md
│       └── logs/
└── metrics/            # Carl's output directory
    ├── counters.json   # Agent spawn counters (lifetime)
    ├── session.json
    ├── history.jsonl
    └── agents/
        └── {agentId}.json
```

---

## References

- [XState v5 Documentation](https://stately.ai/docs/xstate-v5)
- [Stately.ai Visual Editor](https://stately.ai/editor)
- [XState TypeScript Guide](https://stately.ai/docs/typescript)

---

**End of Architecture Module**
