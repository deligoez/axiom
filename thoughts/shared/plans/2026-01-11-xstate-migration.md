# XState Migration Plan

**Date:** 2026-01-11
**Status:** APPROVED
**Version:** 1.2
**Updated:** 2026-01-12 (Testing Strategy + CLI Architecture)

---

## Executive Summary

Chorus'u XState v5 tabanlı bir state machine mimarisine geçiriyoruz. Bu değişiklik:

1. **Actor Model** - Her agent bir spawned child actor
2. **Crash Recovery** - Deep persistence + event sourcing hibrit
3. **Type Safety** - XState v5'in güçlü TypeScript desteği
4. **Visualization** - Stately.ai ile debug imkanı

---

## Motivation

### Current Architecture Problems

1. **Zustand stores fragmented** - taskStore, agentStore ayrı, sync zor
2. **No formal state transitions** - Ad-hoc event handling
3. **Crash recovery manual** - `recover()` function, no guarantee
4. **Agent lifecycle implicit** - Process management scattered

### XState Benefits

1. **Single state tree** - Tüm state tek makinede, consistent
2. **Formal transitions** - Guards, actions, side effects tanımlı
3. **Deep persistence** - Actor hierarchy snapshot alınabilir
4. **Actor isolation** - Her agent kendi state'ini yönetir

---

## Architecture Design

### State Machine Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHORUS ROOT MACHINE                              │
│                           type: 'parallel'                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ orchestration│  │  mergeQueue  │  │  monitoring  │  │     TUI      │ │
│  │    region    │  │    region    │  │    region    │  │    region    │ │
│  │              │  │              │  │              │  │              │ │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ (parallel)   │ │
│  │ │  idle    │ │  │ │  empty   │ │  │ │  active  │ │  │ ┌──────────┐ │ │
│  │ │  running │ │  │ │ pending  │ │  │ │ degraded │ │  │ │  focus   │ │ │
│  │ │  paused  │ │  │ │processing│ │  │ └──────────┘ │  │ │  modal   │ │ │
│  │ └──────────┘ │  │ │ conflict │ │  │              │  │ │ selection│ │ │
│  │              │  │ └──────────┘ │  │              │  │ └──────────┘ │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                       SPAWNED CHILD ACTORS                               │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │ AgentMachine│  │ AgentMachine│  │ AgentMachine│  ... (×n)            │
│  │  [agent-1]  │  │  [agent-2]  │  │  [agent-3]  │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Root Machine States (App-Level)

```
                    ┌─────────┐
                    │  INIT   │ ← Fresh project, no .chorus/
                    └────┬────┘
                         │ CONFIG_COMPLETE
                         ▼
                    ┌─────────┐
              ┌────►│PLANNING │◄────┐
              │     └────┬────┘     │
              │          │ PLAN_APPROVED
              │          ▼          │
              │     ┌─────────┐     │
              │     │ REVIEW  │─────┤ NEEDS_REVISION
              │     └────┬────┘     │
              │          │ REVIEW_PASSED
              │          ▼
              │     ┌─────────────────────┐
              │     │   IMPLEMENTATION    │
              │     │   type: 'parallel'  │
              │     │                     │
              │     │  ┌──────────────┐   │
              └─────┼──│ orchestration│   │ TRIGGER_PLANNING
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │  mergeQueue  │   │
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │  monitoring  │   │
                    │  └──────────────┘   │
                    └─────────────────────┘
```

### TUI Region States (Parallel Sub-Machine)

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

### Agent Machine States (Child Actor)

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT MACHINE                         │
│                                                          │
│              ┌──────────┐                                │
│              │  idle    │ ← Initial state                │
│              └────┬─────┘                                │
│                   │ START                                │
│                   ▼                                      │
│              ┌──────────┐                                │
│              │preparing │ ← Setup worktree, claim task   │
│              └────┬─────┘                                │
│                   │ READY                                │
│                   ▼                                      │
│         ┌────────────────────┐                           │
│         │     executing      │                           │
│         │  (nested states)   │                           │
│         │                    │                           │
│         │  ┌────────────┐    │                           │
│         │  │ iteration  │◄───┼──────┐                    │
│         │  └─────┬──────┘    │      │                    │
│         │        │ ITERATION_DONE   │ RETRY              │
│         │        ▼           │      │                    │
│         │  ┌────────────┐    │      │                    │
│         │  │checkQuality│────┼──────┘                    │
│         │  └─────┬──────┘    │                           │
│         │        │ ALL_PASS  │                           │
│         └────────┼───────────┘                           │
│                  │                                       │
│    ┌─────────────┼─────────────┐                         │
│    │             │             │                         │
│    ▼             ▼             ▼                         │
│ ┌──────┐   ┌─────────┐   ┌─────────┐                     │
│ │blocked│   │completed│   │ failed  │ ← Final states     │
│ └──────┘   └─────────┘   └─────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### New Milestone: M-1 (XState Foundation)

Before M0, we need XState infrastructure:

| Feature | ID | Description | Tests |
|---------|-----|-------------|-------|
| **FX01** | ch-lxxb | XState Setup - Package install, tsconfig | 4 |
| **FX02** | ch-j321 | XState Types - Events, context, input types | 8 |
| **FX03** | ch-kjae | Root Machine - ChorusMachine with parallel regions | 12 |
| **FX04** | ch-qz9m | Agent Machine - Child actor with lifecycle | 10 |
| **FX05** | ch-134l | Persistence Layer - Snapshot + file storage | 8 |
| **FX06** | ch-5gxg | Event Sourcing - Backup recovery mechanism | 6 |
| **FX07** | ch-vskx | React Integration - useChorusMachine hook | 6 |
| **FX08** | ch-mzi3 | XState Migration Bridge - Zustand → XState adapter | 4 |
| **FX09** | ch-g3of | TUI Machine - Focus, modal, selection states | 14 |

**Total: 9 tasks, ~72 tests**

### Tasks to Modify

These existing tasks need XState-aware updates:

| Task ID | Feature | Change Required |
|---------|---------|-----------------|
| **ch-8j3** | F19: OrchestrationStore | **DELETE** - Replaced by Root Machine |
| **ch-g6z** | F20: useOrchestration | **MODIFY** - Use `useMachine` instead |
| **ch-0e7** | F15: Orchestrator Core | **MODIFY** - Becomes machine transitions |
| **ch-7jw** | F16a: CompletionHandler | **MODIFY** - XState action/event |
| **ch-lhm** | F16b: CompletionHandler Retry | **MODIFY** - Guard + transition |
| **ch-i9i** | F22: Slot Manager | **MODIFY** - Part of orchestration region |
| **ch-fna** | F43b: Pause Handler | **MODIFY** - Machine event PAUSE/RESUME |
| **ch-5tj** | F32a: RalphLoop Control | **MODIFY** - Autopilot machine state |
| **ch-3pa** | F32b: RalphLoop Processing | **MODIFY** - Spawning logic in machine |

### TUI Tasks to Modify

TUI tasks will use XState for state management instead of individual hooks:

| Task ID | Feature | Change Required |
|---------|---------|-----------------|
| **ch-89dk** | F64c: Keyboard Router | **SIMPLIFY** - Just sends KEY_PRESS events to machine |
| **ch-akb** | F63a: Tab Panel Switch | **SIMPLIFY** - Sends TOGGLE_FOCUS event |
| **ch-b8l** | F63p: Navigation Keys | **SIMPLIFY** - Sends SELECT_NEXT/PREV events |
| **ch-ak5** | F63u: Toggle Help Key | **SIMPLIFY** - Sends OPEN_HELP/CLOSE_MODAL events |
| **ch-555** | F63h: View Logs | **SIMPLIFY** - Sends OPEN_LOGS event |
| **ch-u5j** | F63v: View Learnings | **SIMPLIFY** - Sends OPEN_LEARNINGS event |
| **ch-6n5** | F63t: Intervention Menu | **SIMPLIFY** - Sends OPEN_INTERVENTION event |
| **ch-0fwe** | F63-merge-view: Merge View | **SIMPLIFY** - Sends OPEN_MERGE_VIEW event |
| **ch-bny** | F63o: TUI Exit Handler | **SIMPLIFY** - Sends OPEN_CONFIRM event |
| **ch-9fq** | F18a: useTaskSelection | **SIMPLIFY** - Uses machine TUI context |

**Key Insight:** Most keyboard handler tasks become trivial "send event to machine" implementations. The complexity moves to machine guards and actions.

### Dependency Changes

```
OLD: M0 → M1 → M2 → M3 → M4 → M5 → ...
                          ↑
                     ch-8j3 (Zustand)

NEW: M-1 → M0 → M1 → M2 → M3 → M4 → ...
      ↑
   XState Foundation (blocks everything)
```

---

## Type Definitions

### Root Machine Context

```typescript
interface ChorusMachineContext {
  // Config (read from .chorus/config.json)
  config: ChorusConfig;

  // Mode (semi-auto vs autopilot)
  mode: 'semi-auto' | 'autopilot';

  // Spawned agent actors
  agents: ActorRefFrom<typeof agentMachine>[];

  // Max concurrent agents
  maxAgents: number;

  // Merge queue
  mergeQueue: MergeQueueItem[];

  // Stats
  stats: SessionStats;

  // Planning state (for INIT/PLANNING/REVIEW)
  planningState?: PlanningState;
}
```

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
  | { type: 'TOGGLE_FOCUS' }  // Tab key

  // TUI Modals
  | { type: 'OPEN_HELP' }
  | { type: 'OPEN_INTERVENTION' }
  | { type: 'OPEN_LOGS'; agentId: string }
  | { type: 'OPEN_LEARNINGS' }
  | { type: 'OPEN_MERGE_VIEW' }
  | { type: 'OPEN_CONFIRM'; action: ConfirmAction }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_MODAL' }  // ESC key

  // TUI Selection
  | { type: 'SELECT_TASK'; taskId: string }
  | { type: 'SELECT_AGENT'; agentId: string }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREV' }
  | { type: 'CLEAR_SELECTION' }

  // Keyboard (routed by guards)
  | { type: 'KEY_PRESS'; key: string; ctrl?: boolean; shift?: boolean };
```

### TUI Context (part of ChorusMachineContext)

```typescript
interface TUIContext {
  // Focus state
  focusedPanel: 'taskPanel' | 'agentGrid';

  // Selection state
  selectedTaskId: string | null;
  selectedAgentId: string | null;

  // Navigation indices
  taskIndex: number;
  agentIndex: number;

  // Confirm dialog payload
  pendingConfirm?: {
    action: 'quit' | 'stop_agent' | 'block_task';
    payload?: unknown;
  };
}
```

### Agent Machine Context

```typescript
interface AgentMachineContext {
  // Identity
  taskId: string;
  agentId: string;

  // Parent reference (for sendTo)
  parentRef: AnyActorRef;

  // Execution state
  iteration: number;
  maxIterations: number;

  // Worktree info
  worktree: string;
  branch: string;

  // Process info
  pid?: number;
  startedAt?: number;

  // Output capture
  lastSignal?: ChorusSignal;
  qualityResults?: QualityResult[];

  // Error info
  error?: Error;
}
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
  | { type: 'STOP' };  // External stop request
```

---

## Persistence Strategy

### Hybrid Approach

```typescript
// Primary: Snapshot persistence (fast restore)
function persistSnapshot(actor: AnyActorRef): void {
  const snapshot = actor.getPersistedSnapshot();
  atomicWrite('.chorus/state.xstate.json', JSON.stringify(snapshot));
}

// Secondary: Event sourcing (reliable fallback)
function persistEvent(event: AnyEvent): void {
  appendLine('.chorus/events.jsonl', JSON.stringify({
    timestamp: Date.now(),
    event
  }));
}

// Recovery with fallback
async function recover(): Promise<AnyActorRef> {
  try {
    // Try snapshot first (fast)
    const snapshot = JSON.parse(
      await fs.readFile('.chorus/state.xstate.json', 'utf-8')
    );
    const actor = createActor(chorusMachine, { snapshot }).start();

    // Validate restoration
    if (actor.getSnapshot().status !== 'active') {
      throw new Error('Snapshot restoration failed');
    }

    // Verify spawned actors are alive
    const { agents } = actor.getSnapshot().context;
    for (const agentRef of agents) {
      if (agentRef.getSnapshot().status !== 'active') {
        throw new Error(`Agent ${agentRef.id} not restored`);
      }
    }

    return actor;
  } catch (snapshotError) {
    console.warn('Snapshot restore failed, using event sourcing:', snapshotError);

    // Fallback: replay events
    const events = (await fs.readFile('.chorus/events.jsonl', 'utf-8'))
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

### Persistence Points

| Event | Persist Snapshot | Persist Event |
|-------|-----------------|---------------|
| Agent spawned | ✅ | ✅ |
| Agent completed | ✅ | ✅ |
| Agent failed | ✅ | ✅ |
| Mode changed | ✅ | ✅ |
| Merge completed | ✅ | ✅ |
| User checkpoint | ✅ | ✅ |
| Every 5 seconds | ✅ | ❌ |

---

## React (Ink) Integration

### useChorusMachine Hook

```typescript
import { useMachine, useSelector } from '@xstate/react';
import { chorusMachine } from '../machines/chorus.machine';

export function useChorusMachine() {
  const [snapshot, send, actorRef] = useMachine(chorusMachine);

  // Derived selectors for performance
  const agents = useSelector(actorRef, s => s.context.agents);
  const mode = useSelector(actorRef, s => s.context.mode);
  const mergeQueue = useSelector(actorRef, s => s.context.mergeQueue);
  const isRunning = useSelector(actorRef, s =>
    s.matches({ implementation: { orchestration: 'running' } })
  );
  const isPaused = useSelector(actorRef, s =>
    s.matches({ implementation: { orchestration: 'paused' } })
  );

  return {
    // State
    snapshot,
    agents,
    mode,
    mergeQueue,
    isRunning,
    isPaused,

    // Actions
    spawnAgent: (taskId: string) => send({ type: 'SPAWN_AGENT', taskId }),
    stopAgent: (agentId: string) => send({ type: 'STOP_AGENT', agentId }),
    pause: () => send({ type: 'PAUSE' }),
    resume: () => send({ type: 'RESUME' }),
    setMode: (mode: 'semi-auto' | 'autopilot') => send({ type: 'SET_MODE', mode }),
  };
}
```

### Ink Component Example

```tsx
import { Box, Text } from 'ink';
import { useChorusMachine } from '../hooks/useChorusMachine';
import { useActor } from '@xstate/react';

function App() {
  const { snapshot, agents, mode, spawnAgent, pause, resume } = useChorusMachine();

  return (
    <Box flexDirection="column">
      <HeaderBar mode={mode} />
      <Box flexDirection="row" flexGrow={1}>
        <TaskPanel onSelectTask={(taskId) => spawnAgent(taskId)} />
        <AgentGrid>
          {agents.map(agentRef => (
            <AgentTile key={agentRef.id} agentRef={agentRef} />
          ))}
        </AgentGrid>
      </Box>
      <FooterBar
        onPause={pause}
        onResume={resume}
        isPaused={snapshot.matches({ implementation: { orchestration: 'paused' } })}
      />
    </Box>
  );
}

function AgentTile({ agentRef }) {
  const [agentSnapshot] = useActor(agentRef);

  return (
    <Box borderStyle="single" padding={1}>
      <Text>Task: {agentSnapshot.context.taskId}</Text>
      <Text>State: {JSON.stringify(agentSnapshot.value)}</Text>
      <Text>Iteration: {agentSnapshot.context.iteration}</Text>
    </Box>
  );
}
```

---

## CLI Architecture (Non-TUI Commands)

### Command Categories

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
  const snapshot = await loadSnapshot('.chorus/state.xstate.json');

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
│     │        .chorus/state.xstate.json         │              │
│     │        (Shared Persistence Layer)        │              │
│     └─────────────────────────────────────────┘              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Synchronization Options:**

1. **Polling** (Simple) - TUI checks snapshot file every N seconds
2. **File Watcher** (Better) - fs.watch on state file
3. **IPC** (Best) - Unix socket for real-time updates

**MVP Decision:** Use file watcher for CLI→TUI sync. Simple, reliable.

### Minimal TUI Region

TUI region only contains **behavior-affecting state**:

```typescript
// INCLUDE in machine (affects behavior)
tui: {
  type: 'parallel',
  states: {
    focus: {  // Keyboard routing depends on this
      initial: 'agentGrid',
      states: { agentGrid: {}, taskPanel: {} }
    },
    modal: {  // Keyboard routing depends on this
      initial: 'closed',
      states: { closed: {}, help: {}, intervention: {}, confirm: {} }
    }
  }
}

// EXCLUDE from machine (pure UI)
// - Scroll position (React state)
// - Hover states (CSS/React)
// - Animation frames (React)
// - Input focus (DOM)
```

**Why this split?**
- Machine state = keyboard routing guards need it
- React state = purely visual, no behavior impact

---

## Migration Path

### Phase 1: Foundation (M-1)

1. Install XState v5: `npm install xstate @xstate/react`
2. Create type definitions
3. Implement ChorusMachine (root)
4. Implement AgentMachine (child)
5. Implement persistence layer
6. Create useChorusMachine hook

### Phase 2: Integration

1. Modify M0 tasks to use XState
2. Update M4 Orchestration tasks
3. Adapt TUI components to use selectors
4. Remove Zustand dependencies

### Phase 3: Verification

1. Crash recovery tests (kill -9 scenarios)
2. Actor restoration validation
3. Performance testing (10+ agents)
4. Event sourcing fallback tests

---

## Files to Create

```
src/
├── machines/
│   ├── chorus.machine.ts      # Root machine
│   ├── agent.machine.ts       # Child agent machine
│   └── index.ts               # Exports
├── types/
│   ├── xstate.types.ts        # XState-specific types
│   └── (existing types.ts updated)
├── services/
│   ├── persistence.ts         # Snapshot + event sourcing
│   └── recovery.ts            # Restore logic
├── hooks/
│   └── useChorusMachine.ts    # React hook
└── tests/
    └── machines/
        ├── chorus.machine.test.ts
        ├── agent.machine.test.ts
        └── persistence.test.ts
```

---

## Risk Mitigation

### Known XState v5 Issues

| Issue | Risk | Mitigation |
|-------|------|------------|
| Spawned actor restoration bugs | HIGH | Event sourcing fallback |
| historyValue serialization | MEDIUM | Test thoroughly, avoid deep history |
| Large context performance | LOW | Keep context lean, agents manage own state |

### Testing Strategy

**XState v5 Testing Approach (AAA Pattern):**

```typescript
// Arrange-Act-Assert pattern with createActor
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
    expect(actor.getSnapshot().context.taskId).toBe('task-1');
  });
});
```

**Testing Categories:**

| Category | What to Test | XState Pattern |
|----------|--------------|----------------|
| **State Transitions** | Event → new state | `actor.send()` + `getSnapshot().value` |
| **Context Updates** | Event → context change | `getSnapshot().context` |
| **Guards** | Conditional transitions | Send event, verify state based on context |
| **Actions** | Side effects executed | Mock actions with `vi.fn()` |
| **Invoked Actors** | Promise/callback handling | Mock with `fromPromise()` |
| **Spawned Actors** | Parent-child communication | Check `context.agents` array |

**Testing Utilities:**

```typescript
// waitFor helper for async transitions
import { waitFor } from 'xstate';

it('completes after async operation', async () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'FETCH' });

  const snapshot = await waitFor(actor,
    (s) => s.matches('success'),
    { timeout: 5000 }
  );

  expect(snapshot.context.data).toBeDefined();
});
```

**Test Organization:**

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

1. **Unit tests** - Each machine state transition
2. **Integration tests** - Parent-child communication
3. **Chaos tests** - Random process kills, restore verification
4. **Performance tests** - 10+ concurrent agents

---

## Success Criteria

- [ ] All existing tests pass with XState backend
- [ ] Crash recovery works (snapshot restore)
- [ ] Event sourcing fallback works
- [ ] 10+ agents run without performance issues
- [ ] TUI renders correctly with XState selectors
- [ ] Stately.ai visualizer shows correct state

---

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 27 | **XState v5 for state management** | Actor model fits multi-agent orchestration |
| 28 | **Hybrid persistence** | Snapshot primary, event sourcing fallback |
| 29 | **M-1 milestone** | XState foundation before M0 |
| 30 | **Delete OrchestrationStore** | Replaced by XState root machine |
| 31 | **Minimal TUI region** | Only behavior-affecting state (focus, modal) in machine |
| 32 | **CLI Event Sender pattern** | Load→send→persist→exit for single-event commands |
| 33 | **File watcher for CLI→TUI sync** | Simple, reliable, MVP-appropriate |
| 34 | **AAA testing pattern** | createActor + send + getSnapshot for all tests |
| 35 | **XState v5 native testing** | @xstate/test deprecated, use createActor directly |
