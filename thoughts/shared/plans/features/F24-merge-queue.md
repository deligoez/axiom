# F24: Merge Queue

**Milestone:** 5 - Merge Service
**Dependencies:** None
**Estimated Tests:** 9

---

## What It Does

Priority queue for pending merge operations. Completed agent work gets queued here before being processed by MergeWorker.

---

## Why It's Needed

- Decouples completion from merge processing
- Priority ordering (P1 tasks merge before P4)
- Prevents merge conflicts by serializing merges
- Provides visibility into pending work

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/MergeQueue.ts` | Queue implementation |
| `tests/services/MergeQueue.test.ts` | Unit tests |

---

## MergeQueue API

```typescript
// src/services/MergeQueue.ts

export interface MergeQueueItem {
  taskId: string;
  branch: string;
  worktree: string;
  priority: number;  // 1-4, lower = higher priority
  enqueuedAt: Date;
}

export interface MergeQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export class MergeQueue {
  private items: MergeQueueItem[] = [];
  private processing: MergeQueueItem | null = null;

  /**
   * Add item to queue (sorted by priority)
   */
  enqueue(item: Omit<MergeQueueItem, 'enqueuedAt'>): void;

  /**
   * Get next item for processing (removes from queue)
   * @returns Item or null if queue empty
   */
  dequeue(): MergeQueueItem | null;

  /**
   * Peek at next item without removing
   */
  peek(): MergeQueueItem | null;

  /**
   * Mark current item as completed
   */
  markCompleted(): void;

  /**
   * Mark current item as failed
   */
  markFailed(): void;

  /**
   * Get queue length
   */
  size(): number;

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean;

  /**
   * Get queue statistics
   */
  getStats(): MergeQueueStats;

  /**
   * Get all pending items (read-only)
   */
  getPending(): readonly MergeQueueItem[];
}
```

---

## Test Cases

```typescript
// tests/services/MergeQueue.test.ts

describe('MergeQueue', () => {
  describe('enqueue', () => {
    it('should add item to queue');
    it('should sort by priority (P1 before P4)');
    it('should sort by enqueuedAt for same priority (FIFO)');
  });

  describe('dequeue', () => {
    it('should return highest priority item');
    it('should return null when empty');
    it('should set item as processing');
  });

  describe('markCompleted/markFailed', () => {
    it('should clear processing state');
    it('should update stats accordingly');
  });

  describe('getStats', () => {
    it('should return accurate counts');
  });
});
```

---

## Acceptance Criteria

### enqueue() - 3 tests
- [ ] `enqueue()` adds item to queue
- [ ] Items sorted by priority (P1 < P2 < P3 < P4)
- [ ] Same priority items sorted by enqueuedAt (FIFO)

### dequeue() - 3 tests
- [ ] `dequeue()` returns highest priority item
- [ ] `dequeue()` returns `null` when queue empty
- [ ] `dequeue()` sets returned item as `processing`

### markCompleted() - 1 test
- [ ] Clears `processing`, increments `stats.completed`

### markFailed() - 1 test
- [ ] Clears `processing`, increments `stats.failed`

### getStats() - 1 test
- [ ] Returns accurate pending/processing/completed/failed counts

### Implicit (no dedicated tests)
- `peek()` = returns first item without removing (trivial)
- `size()` = returns `items.length` (trivial)
- `isEmpty()` = returns `size() === 0` (trivial)
- `getPending()` = returns readonly `items` array (trivial)

**Total: 9 tests**

---

## Implementation Notes

1. Use sorted array (binary insert) for priority ordering
2. Single `processing` slot - only one merge at a time
3. Stats tracking for UI display
4. No persistence - queue lost on restart (acceptable for MVP)
