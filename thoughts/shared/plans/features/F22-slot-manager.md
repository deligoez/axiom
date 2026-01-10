# F22: Agent Slot Manager

**Milestone:** 6 - Parallelism
**Dependencies:** None
**Estimated Tests:** 8

---

## What It Does

Manages available "slots" for parallel agent execution. Tracks how many agents can run simultaneously and enforces maxParallel limits.

---

## Why It's Needed

- Prevents resource exhaustion from too many parallel agents
- Central point for slot accounting (acquire/release)
- Enables fair scheduling when slots are limited
- Provides availability checks for orchestration

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/SlotManager.ts` | Slot management logic |
| `tests/services/SlotManager.test.ts` | Unit tests |

---

## SlotManager API

```typescript
// src/services/SlotManager.ts

export interface SlotManagerConfig {
  maxParallel: number;  // Maximum concurrent agents (default: 3)
}

export class SlotManager {
  private config: SlotManagerConfig;
  private acquired: number = 0;

  constructor(config: SlotManagerConfig);

  /**
   * Get number of available slots
   */
  getAvailable(): number;

  /**
   * Get total slot capacity
   */
  getCapacity(): number;

  /**
   * Get number of slots in use
   */
  getInUse(): number;

  /**
   * Try to acquire a slot
   * @returns true if slot acquired, false if none available
   */
  acquire(): boolean;

  /**
   * Release a slot back to the pool
   * @throws Error if no slots are in use
   */
  release(): void;

  /**
   * Check if any slots are available
   */
  hasAvailable(): boolean;

  /**
   * Reset all slots (for testing/recovery)
   */
  reset(): void;
}
```

---

## Test Cases

```typescript
// tests/services/SlotManager.test.ts

describe('SlotManager', () => {
  describe('getAvailable', () => {
    it('should return maxParallel when none acquired');
    it('should decrease as slots are acquired');
  });

  describe('getCapacity / getInUse', () => {
    it('should return maxParallel for capacity');
    it('should return acquired count for inUse');
  });

  describe('acquire', () => {
    it('should return true and decrement available');
    it('should return false when no slots available');
  });

  describe('release', () => {
    it('should increment available count');
    it('should throw when releasing with none in use');
  });
});
```

---

## Acceptance Criteria

### getAvailable() - 2 tests
- [ ] `getAvailable()` returns `maxParallel` when no slots acquired
- [ ] `getAvailable()` decreases by 1 for each acquired slot

### getCapacity() / getInUse() - 2 tests
- [ ] `getCapacity()` returns `maxParallel` (immutable)
- [ ] `getInUse()` returns count of acquired slots

### acquire() - 2 tests
- [ ] `acquire()` returns `true` and decrements available
- [ ] `acquire()` returns `false` when available === 0

### release() - 2 tests
- [ ] `release()` increments available count
- [ ] `release()` throws Error when `inUse === 0`

### Implicit (no dedicated tests)
- `hasAvailable()` = `getAvailable() > 0` (trivial wrapper)
- `reset()` = sets `acquired = 0` (test/recovery utility)

**Total: 8 tests**

---

## Implementation Notes

1. Thread-safe not needed (single-threaded JS)
2. `maxParallel` comes from ChorusConfig
3. Simple counter-based implementation
4. Used by RalphLoop to check slot availability before spawning
