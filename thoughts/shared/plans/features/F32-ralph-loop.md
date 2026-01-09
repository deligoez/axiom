# F32: Ralph Loop Core

**Milestone:** 7 - Autopilot
**Dependencies:** F16 (Single Task Completion), F31 (Merge Service), F22 (Slot Manager)
**Estimated Tests:** 15

---

## What It Does

The autonomous "Ralph Wiggum" loop: pick task → spawn agent → wait complete → merge → repeat until done.

---

## Why It's Needed

- This is THE GOAL - full autopilot mode
- "Start and walk away" capability
- Automatically processes task queue
- The ultimate productivity multiplier

---

## Ralph Loop Flow

```
                     START AUTOPILOT
                           │
                           ▼
               ┌───────────────────────┐
               │    Get Ready Tasks    │◄──────────────────┐
               │    (bd ready --json)  │                   │
               └───────────┬───────────┘                   │
                           │                               │
              ┌────────────┴────────────┐                  │
              │ No tasks?               │                  │
              │ → All agents done?      │                  │
              │   → EXIT AUTOPILOT      │                  │
              └────────────┬────────────┘                  │
                           │                               │
                           ▼                               │
               ┌───────────────────────┐                   │
               │  Check Available Slots │                  │
               │  (maxParallel - running)│                  │
               └───────────┬───────────┘                   │
                           │                               │
              ┌────────────┴────────────┐                  │
              │ No slots?               │                  │
              │ → Wait for completion   │───────┐          │
              └────────────┬────────────┘       │          │
                           │                    │          │
                           ▼                    │          │
               ┌───────────────────────┐        │          │
               │  Pick Next Task       │        │          │
               │  (priority order)     │        │          │
               └───────────┬───────────┘        │          │
                           │                    │          │
                           ▼                    │          │
               ┌───────────────────────┐        │          │
               │  Assign Task          │        │          │
               │  (F15: Orchestrator)  │        │          │
               └───────────┬───────────┘        │          │
                           │                    │          │
                           ▼                    │          │
               ┌───────────────────────┐        │          │
               │  Agent Runs...        │◄───────┘          │
               │  (iteration loop)     │                   │
               └───────────┬───────────┘                   │
                           │                               │
              ┌────────────┴────────────┐                  │
              │ Completion detected?    │                  │
              │ (signal + tests)        │                  │
              └────────────┬────────────┘                  │
                           │                               │
                    YES────┴────NO                         │
                     │          │                          │
                     │    increment iteration              │
                     │          │                          │
                     │    max reached? ──YES── FAIL        │
                     │          │                          │
                     ▼         NO                          │
          ┌───────────────────┐ │                          │
          │  Queue Merge      │ │                          │
          │  (F31)            │ │                          │
          └─────────┬─────────┘ │                          │
                    │           │                          │
                    ▼           │                          │
          ┌───────────────────┐ │                          │
          │  Close Task       │ │                          │
          │  (F13)            │ │                          │
          └─────────┬─────────┘ │                          │
                    │           │                          │
                    │           │                          │
                    ▼           │                          │
          ┌───────────────────┐ │                          │
          │  Cleanup Worktree │ │                          │
          │  (F05)            │ │                          │
          └─────────┬─────────┘ │                          │
                    │           │                          │
                    └───────────┴──────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/RalphLoop.ts` | Autopilot loop logic |
| `tests/services/RalphLoop.test.ts` | Unit tests |

---

## RalphLoop API

```typescript
// src/services/RalphLoop.ts

import { EventEmitter } from 'events';

export interface RalphLoopConfig {
  orchestrator: Orchestrator;
  mergeService: MergeService;
  slotManager: SlotManager;
  config: ChorusConfig;
}

export interface LoopStatus {
  running: boolean;
  paused: boolean;
  tasksCompleted: number;
  tasksFailed: number;
  activeAgents: number;
  pendingTasks: number;
}

export class RalphLoop extends EventEmitter {
  private config: RalphLoopConfig;
  private running: boolean = false;
  private paused: boolean = false;
  private loopPromise: Promise<void> | null = null;

  constructor(config: RalphLoopConfig);

  // === CONTROL ===

  /**
   * Start the autopilot loop
   */
  async start(): Promise<void>;

  /**
   * Stop the loop (waits for current agents to finish)
   */
  async stop(): Promise<void>;

  /**
   * Pause - no new tasks, current agents continue
   */
  pause(): void;

  /**
   * Resume from pause
   */
  resume(): void;

  // === STATUS ===

  getStatus(): LoopStatus;
  isRunning(): boolean;
  isPaused(): boolean;

  // === EVENTS ===
  // 'started' - loop started
  // 'stopped' - loop stopped (all done or manual stop)
  // 'paused' - loop paused
  // 'resumed' - loop resumed
  // 'taskAssigned' - task assigned to agent
  // 'taskCompleted' - task completed successfully
  // 'taskFailed' - task failed
  // 'allDone' - no more tasks to process
}
```

---

## Core Loop Implementation

```typescript
async start(): Promise<void> {
  if (this.running) return;

  this.running = true;
  this.paused = false;
  this.emit('started');

  this.loopPromise = this.runLoop();
  await this.loopPromise;
}

private async runLoop(): Promise<void> {
  while (this.running) {
    // Check if paused
    if (this.paused) {
      await this.waitForResume();
      if (!this.running) break;
    }

    // Get ready tasks
    const readyTasks = await this.orchestrator.getReadyTasks();

    // Check if all done
    const activeAgents = this.getActiveAgentCount();
    if (readyTasks.length === 0 && activeAgents === 0) {
      this.emit('allDone');
      break;
    }

    // Check available slots
    const availableSlots = this.slotManager.getAvailable();
    if (availableSlots === 0) {
      // Wait for a completion
      await this.waitForCompletion();
      continue;
    }

    // Pick and assign tasks
    const tasksToAssign = readyTasks.slice(0, availableSlots);
    for (const task of tasksToAssign) {
      if (!this.running || this.paused) break;

      try {
        const result = await this.orchestrator.assignTask({
          taskId: task.id,
          agentType: this.orchestrator.getAgentType(task)
        });

        if (result.success) {
          this.emit('taskAssigned', result);
        }
      } catch (error) {
        this.emit('error', { task, error });
      }
    }

    // Small delay to prevent tight loop
    await this.delay(100);
  }

  this.running = false;
  this.emit('stopped');
}

private async waitForCompletion(): Promise<void> {
  return new Promise(resolve => {
    const handler = () => {
      this.off('taskCompleted', handler);
      this.off('taskFailed', handler);
      resolve();
    };
    this.on('taskCompleted', handler);
    this.on('taskFailed', handler);
  });
}
```

---

## Integration with Completion

```typescript
// Listen for agent completions
this.orchestrator.on('agentCompleted', async (result) => {
  if (result.success) {
    // Queue merge
    await this.mergeService.enqueue({
      taskId: result.taskId,
      branch: result.branch,
      worktree: result.worktree,
      priority: result.task.priority
    });

    // Close task
    await this.beadsCLI.closeTask(result.taskId);

    this.emit('taskCompleted', result);
  } else {
    this.emit('taskFailed', result);
  }
});
```

---

## Test Cases

```typescript
// tests/services/RalphLoop.test.ts

describe('RalphLoop', () => {
  describe('start', () => {
    it('should emit "started" event');
    it('should begin processing tasks');
    it('should be idempotent (multiple starts)');
  });

  describe('stop', () => {
    it('should stop accepting new tasks');
    it('should wait for active agents to complete');
    it('should emit "stopped" event');
  });

  describe('pause/resume', () => {
    it('should pause without stopping agents');
    it('should resume and continue');
  });

  describe('task processing', () => {
    it('should assign tasks to available slots');
    it('should respect maxParallel limit');
    it('should pick tasks by priority');
    it('should handle task completion');
    it('should queue merge on completion');
    it('should close task on completion');
  });

  describe('completion', () => {
    it('should emit "allDone" when no tasks remain');
    it('should stop loop after allDone');
  });

  describe('error handling', () => {
    it('should emit error on assignment failure');
    it('should continue loop after error');
  });
});
```

---

## Acceptance Criteria

- [ ] Starts and processes task queue
- [ ] Respects maxParallel limit
- [ ] Picks tasks by priority (P1 > P2 > P3 > P4)
- [ ] Waits for slots when full
- [ ] Handles task completion (merge + close)
- [ ] Stops when no tasks remain
- [ ] Can be paused and resumed
- [ ] Can be stopped gracefully
- [ ] Emits appropriate events
- [ ] Error handling doesn't crash loop
- [ ] All 15 tests pass

---

## Implementation Notes

1. This is the "brain" of autopilot mode
2. Don't spawn too aggressively - small delay between iterations
3. Priority sorting: P1 first, then P2, etc.
4. Completion detection is handled by CompletionChecker (F11)
5. Merge is async - don't block loop waiting for merge
6. "Ralph Wiggum" - named after the pattern, not the character :)
