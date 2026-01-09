# F16: Single Task Completion Handler

**Milestone:** 4 - Core Orchestration
**Dependencies:** F11 (Completion Checker), F13 (Task Closer)
**Estimated Tests:** 10

**Note:** Split into F16a (Success Path, 5 tests) and F16b (Retry Logic, 5 tests)

---

## What It Does

Handles the complete lifecycle when an agent finishes a task: detect completion → verify tests → close task → cleanup.

---

## Why It's Needed

- Agent completion needs full workflow handling
- Must verify tests pass before marking complete
- Must close task via bd CLI
- Must cleanup worktree after merge
- Connects Orchestrator to downstream services

---

## Completion Flow

```
Agent Exits
     │
     ▼
┌─────────────────────┐
│ CompletionChecker   │
│ (F11)               │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │ Complete?   │
    └──────┬──────┘
           │
    YES────┴────NO
     │          │
     │    increment iteration
     │          │
     │    max? ──YES── mark failed
     │          │
     ▼         NO → respawn agent
┌─────────────────────┐
│ Queue for Merge     │
│ (MergeService)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Close Task (F13)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Cleanup Worktree    │
│ (F05)               │
└─────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/CompletionHandler.ts` | Handle task completion |
| `tests/services/CompletionHandler.test.ts` | Unit tests |

---

## CompletionHandler API

```typescript
// src/services/CompletionHandler.ts

import { EventEmitter } from 'events';

export interface CompletionHandlerConfig {
  completionChecker: CompletionChecker;
  beadsCLI: BeadsCLI;
  worktreeService: WorktreeService;
  config: ChorusConfig;
}

export interface TaskCompletionResult {
  taskId: string;
  agentId: string;
  success: boolean;
  iteration: number;
  reason: string;
  testOutput?: string;
}

export class CompletionHandler extends EventEmitter {
  constructor(config: CompletionHandlerConfig);

  /**
   * Handle agent completion - check if task is truly done
   */
  async handleAgentExit(
    agentId: string,
    taskId: string,
    output: string,
    worktreePath: string
  ): Promise<TaskCompletionResult>;

  /**
   * Process successful completion
   */
  async handleSuccess(
    taskId: string,
    agentId: string,
    worktreePath: string,
    branch: string
  ): Promise<void>;

  /**
   * Process failed completion (needs retry)
   */
  async handleFailure(
    taskId: string,
    agentId: string,
    iteration: number,
    reason: string
  ): Promise<{ shouldRetry: boolean; maxReached: boolean }>;

  // Events:
  // 'completed' - task fully completed
  // 'failed' - task failed (max iterations or blocked)
  // 'retry' - needs another iteration
}
```

---

## Implementation

```typescript
async handleAgentExit(
  agentId: string,
  taskId: string,
  output: string,
  worktreePath: string
): Promise<TaskCompletionResult> {
  // Check completion (signal + tests)
  const result = await this.completionChecker.check(output, worktreePath);

  if (result.complete) {
    // Success path
    const agent = agentStore.getState().getAgentByTaskId(taskId);
    await this.handleSuccess(taskId, agentId, worktreePath, agent?.branch || '');

    this.emit('completed', { taskId, agentId });
    return {
      taskId,
      agentId,
      success: true,
      iteration: agent?.iteration || 0,
      reason: 'Task completed successfully',
      testOutput: result.testOutput
    };
  }

  // Check if blocked
  const blockStatus = this.completionChecker.isBlocked(output);
  if (blockStatus.blocked) {
    this.emit('failed', { taskId, agentId, reason: blockStatus.reason });
    return {
      taskId,
      agentId,
      success: false,
      iteration: 0,
      reason: `Blocked: ${blockStatus.reason}`
    };
  }

  // Handle failure (might retry)
  const agent = agentStore.getState().getAgentByTaskId(taskId);
  const iteration = (agent?.iteration || 0) + 1;
  const failResult = await this.handleFailure(taskId, agentId, iteration, result.reason || 'Unknown');

  if (failResult.maxReached) {
    this.emit('failed', { taskId, agentId, reason: 'Max iterations reached' });
  } else {
    this.emit('retry', { taskId, agentId, iteration });
  }

  return {
    taskId,
    agentId,
    success: false,
    iteration,
    reason: result.reason || 'Tests failed',
    testOutput: result.testOutput
  };
}

async handleSuccess(taskId: string, agentId: string, worktreePath: string, branch: string): Promise<void> {
  // 1. Close task
  await this.beadsCLI.closeTask(taskId, `Completed by ${agentId}`);

  // 2. Emit for merge queue (handled externally)
  this.emit('readyForMerge', { taskId, branch, worktreePath });
}

async handleFailure(taskId: string, agentId: string, iteration: number, reason: string): Promise<{ shouldRetry: boolean; maxReached: boolean }> {
  const maxIterations = this.config.completion.maxIterations;

  if (iteration >= maxIterations) {
    return { shouldRetry: false, maxReached: true };
  }

  // Update iteration count
  agentStore.getState().incrementIteration(agentId);

  return { shouldRetry: true, maxReached: false };
}
```

---

## Test Cases

```typescript
// tests/services/CompletionHandler.test.ts

describe('CompletionHandler', () => {
  describe('handleAgentExit', () => {
    it('should return success when signal + tests pass');
    it('should close task on success');
    it('should emit "completed" on success');
    it('should emit "readyForMerge" on success');
    it('should return failure when no signal');
    it('should return failure when tests fail');
    it('should detect blocked state');
  });

  describe('handleFailure', () => {
    it('should allow retry if under max iterations');
    it('should emit "retry" when retrying');
    it('should return maxReached when at limit');
    it('should emit "failed" when max reached');
  });
});
```

---

## Acceptance Criteria

- [ ] Detects successful completion (signal + tests)
- [ ] Closes task on success
- [ ] Emits events for downstream handling
- [ ] Handles blocked state
- [ ] Tracks iteration count
- [ ] Respects maxIterations config
- [ ] Emits retry event for respawn
- [ ] Emits failed event when max reached
- [ ] All 10 tests pass

---

## Implementation Notes

1. Listens for agent process exit
2. Does NOT respawn agent - that's Orchestrator's job
3. Merge queue is handled by MergeService (M5)
4. Worktree cleanup happens after merge, not here
5. Events allow loose coupling with other services
