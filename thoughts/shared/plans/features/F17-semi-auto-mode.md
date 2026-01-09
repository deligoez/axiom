# F17: Semi-Auto Mode

**Milestone:** 4 - Core Orchestration
**Dependencies:** F15 (Orchestrator Core), F16 (Completion Handler)
**Estimated Tests:** 8

---

## What It Does

Implements semi-automatic mode: user selects task → one agent runs → agent completes → STOP (wait for next user selection).

---

## Why It's Needed

- Default operating mode for Chorus
- User maintains control over task selection
- One task at a time (no parallelism initially)
- Safe, predictable workflow
- Foundation before autopilot

---

## Semi-Auto Flow

```
User Presses Enter on Task
            │
            ▼
┌───────────────────────────┐
│  Validate Task Ready      │
│  (open, deps satisfied)   │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Orchestrator.assignTask  │
│  (F15)                    │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Agent Runs...            │
│  (user watches output)    │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  CompletionHandler        │
│  (F16)                    │
└─────────────┬─────────────┘
              │
       ┌──────┴──────┐
       │  Success?   │
       └──────┬──────┘
              │
       YES────┴────NO
        │          │
        │    Retry? ──YES── Respawn
        │          │
        ▼         NO
   ┌─────────┐     │
   │  STOP   │◄────┘
   │ (wait)  │
   └─────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/SemiAutoController.ts` | Semi-auto mode logic |
| `tests/services/SemiAutoController.test.ts` | Unit tests |

---

## SemiAutoController API

```typescript
// src/services/SemiAutoController.ts

import { EventEmitter } from 'events';

export interface SemiAutoConfig {
  orchestrator: Orchestrator;
  completionHandler: CompletionHandler;
  config: ChorusConfig;
}

export interface SemiAutoStatus {
  active: boolean;
  currentTaskId: string | null;
  currentAgentId: string | null;
  iteration: number;
}

export class SemiAutoController extends EventEmitter {
  private status: SemiAutoStatus;

  constructor(config: SemiAutoConfig);

  /**
   * Start task (user initiated)
   */
  async startTask(taskId: string, agentType?: AgentType): Promise<AssignmentResult>;

  /**
   * Cancel current task
   */
  async cancelTask(): Promise<void>;

  /**
   * Get current status
   */
  getStatus(): SemiAutoStatus;

  /**
   * Check if ready for new task
   */
  isIdle(): boolean;

  /**
   * Handle agent completion internally
   */
  private async onAgentComplete(result: TaskCompletionResult): Promise<void>;

  // Events:
  // 'taskStarted' - agent spawned for task
  // 'taskCompleted' - task finished successfully
  // 'taskFailed' - task failed (max iterations or blocked)
  // 'idle' - ready for next task
}
```

---

## Implementation

```typescript
async startTask(taskId: string, agentType?: AgentType): Promise<AssignmentResult> {
  // Check if already running
  if (!this.isIdle()) {
    return {
      success: false,
      agentId: '',
      taskId,
      worktree: {} as WorktreeInfo,
      error: 'Already running a task'
    };
  }

  // Determine agent type
  const task = this.orchestrator.getTask(taskId);
  const type = agentType || this.orchestrator.getAgentType(task!);

  // Assign task
  const result = await this.orchestrator.assignTask({
    taskId,
    agentType: type
  });

  if (result.success) {
    this.status = {
      active: true,
      currentTaskId: taskId,
      currentAgentId: result.agentId,
      iteration: 0
    };
    this.emit('taskStarted', result);
  }

  return result;
}

async cancelTask(): Promise<void> {
  if (!this.status.currentAgentId) return;

  // Kill agent process
  await this.agentManager.kill(this.status.currentAgentId);

  // Reset status
  this.status = {
    active: false,
    currentTaskId: null,
    currentAgentId: null,
    iteration: 0
  };

  this.emit('idle');
}

private async onAgentComplete(result: TaskCompletionResult): Promise<void> {
  if (result.success) {
    this.emit('taskCompleted', result);
    this.reset();
    this.emit('idle');
  } else if (result.shouldRetry) {
    // Respawn agent for retry
    this.status.iteration = result.iteration;
    await this.orchestrator.respawnAgent(this.status.currentAgentId!);
    this.emit('retry', { iteration: result.iteration });
  } else {
    this.emit('taskFailed', result);
    this.reset();
    this.emit('idle');
  }
}

private reset(): void {
  this.status = {
    active: false,
    currentTaskId: null,
    currentAgentId: null,
    iteration: 0
  };
}
```

---

## Integration with TUI

```typescript
// In TaskPanel or KeyboardHandler

const handleTaskSelect = async (taskId: string) => {
  if (config.mode === 'semi-auto') {
    const result = await semiAutoController.startTask(taskId);
    if (!result.success) {
      showError(result.error);
    }
  }
};

// Listen for completion
semiAutoController.on('idle', () => {
  // Enable task selection again
  setTaskSelectionEnabled(true);
});

semiAutoController.on('taskStarted', () => {
  // Disable task selection
  setTaskSelectionEnabled(false);
});
```

---

## Test Cases

```typescript
// tests/services/SemiAutoController.test.ts

describe('SemiAutoController', () => {
  describe('startTask', () => {
    it('should assign task via orchestrator');
    it('should emit "taskStarted" event');
    it('should update status to active');
    it('should reject if already running');
  });

  describe('cancelTask', () => {
    it('should kill running agent');
    it('should reset status');
    it('should emit "idle" event');
  });

  describe('completion handling', () => {
    it('should emit "taskCompleted" on success');
    it('should respawn agent on retry');
    it('should emit "taskFailed" on max iterations');
    it('should emit "idle" after completion');
  });
});
```

---

## Acceptance Criteria

- [ ] Can start task by ID
- [ ] Rejects if already running a task
- [ ] Tracks current task and agent
- [ ] Handles successful completion
- [ ] Handles retry (respawn agent)
- [ ] Handles failure (max iterations)
- [ ] Can cancel running task
- [ ] Emits appropriate events
- [ ] All 8 tests pass

---

## Implementation Notes

1. This is the DEFAULT mode (config.mode === 'semi-auto')
2. Only ONE task runs at a time
3. User must select next task manually
4. Retry is automatic up to maxIterations
5. TUI shows agent output during run
6. Enter key on task triggers startTask()
