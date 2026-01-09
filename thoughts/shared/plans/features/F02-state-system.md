# F02: State System

**Milestone:** 1 - Infrastructure
**Dependencies:** None
**Estimated Tests:** 8

---

## What It Does

Manages runtime state in `.chorus/state.json` - the transient state file for active session data.

---

## Why It's Needed

- Track running agents (pid, task, worktree)
- Track merge queue
- Enable crash recovery (F55)
- Store session statistics

---

## State Schema

```typescript
// src/types/state.ts

export interface ChorusState {
  version: string;
  sessionId: string;  // UUID for current session
  startedAt: number;  // timestamp

  mode: 'semi-auto' | 'autopilot';
  paused: boolean;

  agents: {
    [id: string]: AgentState;
  };

  mergeQueue: MergeQueueItem[];

  checkpoint: string | null;  // git tag for recovery

  stats: SessionStats;
}

export interface AgentState {
  id: string;
  type: 'claude' | 'codex' | 'opencode';
  pid: number;
  taskId: string;
  worktree: string;
  branch: string;
  iteration: number;
  startedAt: number;
  status: 'running' | 'completing' | 'error';
}

export interface MergeQueueItem {
  taskId: string;
  branch: string;
  worktree: string;
  priority: number;
  status: 'pending' | 'merging' | 'conflict' | 'resolving';
  retries: number;
  enqueuedAt: number;
}

export interface SessionStats {
  tasksCompleted: number;
  tasksFailed: number;
  mergesAuto: number;
  mergesManual: number;
  totalIterations: number;
  totalRuntime: number;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/state.ts` | Type definitions |
| `src/services/StateService.ts` | Load/save/update state |
| `tests/services/StateService.test.ts` | Unit tests |

---

## StateService API

```typescript
// src/services/StateService.ts

export class StateService {
  private statePath: string;
  private state: ChorusState;
  private saveDebounced: () => void;

  constructor(projectDir: string);

  // Initialize new session state
  init(): ChorusState;

  // Load existing state (for recovery)
  load(): ChorusState | null;

  // Get current state
  get(): ChorusState;

  // Update state and persist
  update(partial: Partial<ChorusState>): void;

  // Agent state helpers
  addAgent(agent: AgentState): void;
  updateAgent(id: string, partial: Partial<AgentState>): void;
  removeAgent(id: string): void;
  getAgent(id: string): AgentState | undefined;

  // Merge queue helpers
  enqueueMerge(item: MergeQueueItem): void;
  dequeueMerge(): MergeQueueItem | undefined;
  updateMergeItem(taskId: string, partial: Partial<MergeQueueItem>): void;

  // Stats helpers
  incrementStat(key: keyof SessionStats): void;

  // Persistence
  save(): void;
  clear(): void;  // Delete state file (clean shutdown)
}
```

---

## State File Location

```
.chorus/
├── config.json    (persistent, git-tracked)
└── state.json     (transient, gitignored)
```

---

## Test Cases

```typescript
// tests/services/StateService.test.ts

describe('StateService', () => {
  describe('init', () => {
    it('should create new session state');
    it('should generate unique sessionId');
  });

  describe('load', () => {
    it('should return null if no state file');
    it('should load existing state');
    it('should validate state structure');
  });

  describe('agent operations', () => {
    it('should add agent to state');
    it('should update agent in state');
    it('should remove agent from state');
    it('should persist changes');
  });

  describe('merge queue', () => {
    it('should enqueue merge item');
    it('should dequeue by priority');
  });

  describe('save', () => {
    it('should debounce rapid saves');
  });
});
```

---

## Acceptance Criteria

- [ ] Can initialize new session state
- [ ] Can load existing state for recovery
- [ ] Can add/update/remove agents
- [ ] Can manage merge queue
- [ ] Persists changes automatically
- [ ] Debounces rapid saves (100ms)
- [ ] `clear()` removes state file
- [ ] All 8 tests pass

---

## Implementation Notes

1. Use debounced save (100ms) to avoid excessive disk writes
2. State file is gitignored - transient only
3. `init()` vs `load()`:
   - `init()` = fresh start
   - `load()` = recovery from crash
4. Generate sessionId with `crypto.randomUUID()`
