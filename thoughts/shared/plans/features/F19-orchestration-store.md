# F19: Orchestration Store

**Milestone:** 4 - Core Orchestration
**Dependencies:** None (independent state store)
**Estimated Tests:** 8

---

## What It Does

Zustand store for orchestration state - tracks mode, current task, agent status, and provides actions.

---

## Why It's Needed

- TUI components need reactive orchestration state
- Separates state from service logic
- Enables React re-renders on state change
- Centralized orchestration state management
- Similar pattern to agentStore, beadsStore

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/stores/orchestrationStore.ts` | Zustand store |
| `tests/stores/orchestrationStore.test.ts` | Unit tests |

---

## Store Definition

```typescript
// src/stores/orchestrationStore.ts

import { create } from 'zustand';
import type { AgentType } from '../types/agent';
import type { Bead } from '../types/bead';

export type OperatingMode = 'semi-auto' | 'autopilot';
export type OrchestrationStatus = 'idle' | 'assigning' | 'running' | 'completing' | 'error';

export interface OrchestrationState {
  // Mode
  mode: OperatingMode;

  // Status
  status: OrchestrationStatus;
  error: string | null;

  // Current task (semi-auto)
  currentTaskId: string | null;
  currentAgentId: string | null;
  currentAgentType: AgentType | null;
  currentIteration: number;

  // Stats
  tasksCompleted: number;
  tasksFailed: number;
  totalIterations: number;

  // Autopilot specific
  isPaused: boolean;
  activeAgentCount: number;
}

export interface OrchestrationActions {
  // Mode
  setMode: (mode: OperatingMode) => void;

  // Status
  setStatus: (status: OrchestrationStatus, error?: string) => void;
  setIdle: () => void;
  setError: (error: string) => void;

  // Task assignment
  setCurrentTask: (taskId: string, agentId: string, agentType: AgentType) => void;
  clearCurrentTask: () => void;
  incrementIteration: () => void;

  // Stats
  recordCompletion: (success: boolean) => void;
  resetStats: () => void;

  // Autopilot
  setPaused: (paused: boolean) => void;
  setActiveAgentCount: (count: number) => void;

  // Reset
  reset: () => void;
}

export type OrchestrationStore = OrchestrationState & OrchestrationActions;
```

---

## Implementation

```typescript
const initialState: OrchestrationState = {
  mode: 'semi-auto',
  status: 'idle',
  error: null,
  currentTaskId: null,
  currentAgentId: null,
  currentAgentType: null,
  currentIteration: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  totalIterations: 0,
  isPaused: false,
  activeAgentCount: 0,
};

export const useOrchestrationStore = create<OrchestrationStore>((set, get) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setStatus: (status, error) => set({
    status,
    error: error || null
  }),

  setIdle: () => set({
    status: 'idle',
    error: null
  }),

  setError: (error) => set({
    status: 'error',
    error
  }),

  setCurrentTask: (taskId, agentId, agentType) => set({
    currentTaskId: taskId,
    currentAgentId: agentId,
    currentAgentType: agentType,
    currentIteration: 0,
    status: 'running'
  }),

  clearCurrentTask: () => set({
    currentTaskId: null,
    currentAgentId: null,
    currentAgentType: null,
    currentIteration: 0,
    status: 'idle'
  }),

  incrementIteration: () => set(state => ({
    currentIteration: state.currentIteration + 1,
    totalIterations: state.totalIterations + 1
  })),

  recordCompletion: (success) => set(state => ({
    tasksCompleted: success ? state.tasksCompleted + 1 : state.tasksCompleted,
    tasksFailed: success ? state.tasksFailed : state.tasksFailed + 1,
  })),

  resetStats: () => set({
    tasksCompleted: 0,
    tasksFailed: 0,
    totalIterations: 0
  }),

  setPaused: (paused) => set({ isPaused: paused }),

  setActiveAgentCount: (count) => set({ activeAgentCount: count }),

  reset: () => set(initialState),
}));
```

---

## Usage in Components

```typescript
// In StatusBar
const { mode, status, currentTaskId, tasksCompleted } = useOrchestrationStore();

<Text>
  Mode: {mode} | Status: {status}
  {currentTaskId && ` | Task: ${currentTaskId}`}
  | Completed: {tasksCompleted}
</Text>

// In TaskPanel
const { status, currentTaskId } = useOrchestrationStore();
const isRunning = status === 'running';
const canSelect = !isRunning;

// In SemiAutoController
orchestrationStore.getState().setCurrentTask(taskId, agentId, agentType);
// ... on completion
orchestrationStore.getState().recordCompletion(true);
orchestrationStore.getState().clearCurrentTask();
```

---

## Test Cases

```typescript
// tests/stores/orchestrationStore.test.ts

describe('orchestrationStore', () => {
  describe('mode', () => {
    it('should default to semi-auto');
    it('should change mode');
  });

  describe('status', () => {
    it('should set status and error');
    it('should clear error on setIdle');
  });

  describe('current task', () => {
    it('should set current task details');
    it('should clear current task');
    it('should increment iteration');
  });

  describe('stats', () => {
    it('should record successful completion');
    it('should record failed completion');
    it('should reset stats');
  });

  describe('autopilot', () => {
    it('should set paused state');
    it('should track active agent count');
  });
});
```

---

## Acceptance Criteria

- [ ] Tracks operating mode (semi-auto/autopilot)
- [ ] Tracks orchestration status
- [ ] Tracks current task assignment
- [ ] Tracks iteration count
- [ ] Records completion stats
- [ ] Supports autopilot pause state
- [ ] Reset clears all state
- [ ] All 8 tests pass

---

## Implementation Notes

1. Similar pattern to existing agentStore, beadsStore
2. Used by TUI components for reactive updates
3. Services update store, components read from store
4. Separates concerns: services = logic, store = state
5. Reset on session end or mode change
