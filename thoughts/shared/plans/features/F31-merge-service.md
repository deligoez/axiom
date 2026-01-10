# F31: Merge Service

**Milestone:** 5 - Merge Service
**Dependencies:** F24 (Merge Queue), F25 (Merge Worker), F26 (Conflict Classifier), F27 (Auto-Resolver), F28 (Rebase-Retry), F29 (Resolver Agent), F30 (Human Escalation)
**Estimated Tests:** 5 (Facade wiring tests)

---

## What It Does

Top-level facade that orchestrates the entire merge pipeline. Provides a simple API for RalphLoop to queue completed work for merging.

---

## Why It's Needed

- Single entry point for merge operations
- Hides complexity of merge pipeline from callers
- Coordinates all merge sub-components
- Provides status and monitoring hooks

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/MergeService.ts` | Facade orchestration |
| `tests/services/MergeService.test.ts` | Integration tests (optional) |

---

## MergeService API

```typescript
// src/services/MergeService.ts

import { EventEmitter } from 'events';

export interface MergeItem {
  taskId: string;
  branch: string;
  worktree: string;
  priority: number;
}

export interface MergeResult {
  taskId: string;
  success: boolean;
  merged: boolean;
  conflict?: ConflictInfo;
  error?: Error;
}

export interface MergeServiceConfig {
  mergeQueue: MergeQueue;        // F24
  mergeWorker: MergeWorker;      // F25
  conflictClassifier: ConflictClassifier;  // F26
  autoResolver: AutoResolver;    // F27
  rebaseRetry: RebaseRetry;      // F28
  resolverAgent: ResolverAgent;  // F29
  humanEscalation: HumanEscalation;  // F30
}

export class MergeService extends EventEmitter {
  constructor(config: MergeServiceConfig);

  /**
   * Add completed work to merge queue
   */
  async enqueue(item: MergeItem): Promise<void>;

  /**
   * Get current queue status
   */
  getQueueStatus(): { pending: number; processing: number; completed: number };

  /**
   * Start processing queue (called once at startup)
   */
  start(): void;

  /**
   * Stop processing (graceful shutdown)
   */
  async stop(): Promise<void>;

  /**
   * Check if service is running
   */
  isRunning(): boolean;

  // === EVENTS ===
  // 'mergeStarted' - merge attempt started
  // 'mergeCompleted' - merge successful
  // 'mergeFailed' - merge failed (will retry or escalate)
  // 'conflict' - conflict detected
  // 'escalated' - escalated to human
}
```

---

## Flow Diagram

```
enqueue(item)
     │
     ▼
┌─────────────────┐
│  Merge Queue    │  (F24)
│  (priority queue)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Merge Worker   │  (F25)
│  (git merge)    │
└────────┬────────┘
         │
    SUCCESS?
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
  DONE   ┌─────────────────┐
         │ Conflict        │  (F26)
         │ Classifier      │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
    TRIVIAL            COMPLEX
         │                 │
         ▼                 ▼
    ┌─────────┐      ┌─────────────┐
    │ Auto    │      │ Rebase      │  (F28)
    │ Resolve │(F27) │ Retry       │
    └────┬────┘      └──────┬──────┘
         │                  │
         │            SUCCESS?
         │           ┌──┴──┐
         │          YES   NO
         │           │     │
         │           ▼     ▼
         │        DONE  ┌──────────┐
         │              │ Resolver │  (F29)
         │              │ Agent    │
         │              └────┬─────┘
         │                   │
         │             SUCCESS?
         │            ┌──┴──┐
         │           YES   NO
         │            │     │
         ▼            ▼     ▼
       DONE        DONE  ┌──────────┐
                        │ Human    │  (F30)
                        │ Escalate │
                        └──────────┘
```

---

## Integration Notes

This is a **facade** that wires together F24-F30. It has no business logic of its own - just orchestration.

### Why 0 Tests?

- All logic is in sub-components (F24-F30)
- MergeService just calls them in order
- Integration testing covered by E2E tests
- Sub-component tests provide coverage

### Used By

- **RalphLoop (F32)**: Calls `enqueue()` when agent completes task
- **StatusBar**: Calls `getQueueStatus()` for display

---

## Acceptance Criteria

Facade wiring tests (mocked sub-components):

### enqueue() - 1 test
- [ ] Calls `MergeQueue.enqueue()` with correct item

### start() / stop() - 2 tests
- [ ] `start()` sets running state and begins queue processing
- [ ] `stop()` waits for current merge, then stops

### getQueueStatus() / isRunning() - 2 tests
- [ ] `getQueueStatus()` delegates to MergeQueue.getStats()
- [ ] `isRunning()` returns correct state

### Events (implicit - tested via wiring)
- mergeStarted, mergeCompleted, mergeFailed, conflict, escalated

**Total: 5 tests (facade wiring verification)**

---

## Implementation Notes

1. Constructor receives all sub-components via dependency injection
2. EventEmitter for merge lifecycle events
3. Priority ordering handled by MergeQueue (F24)
4. Error handling: escalate to human (F30) as last resort
5. Graceful shutdown: finish current merge before stopping
