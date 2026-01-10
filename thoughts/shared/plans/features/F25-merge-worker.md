# F25: Merge Worker

**Milestone:** 5 - Merge Service
**Dependencies:** F24 (Merge Queue)
**Estimated Tests:** 9

---

## What It Does

Performs the actual git merge operation. Dequeues items from MergeQueue and attempts to merge their branches into main.

---

## Why It's Needed

- Executes git merge commands
- Detects merge conflicts
- Provides structured result for downstream handling
- Runs merge in correct context (worktree)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/MergeWorker.ts` | Merge execution logic |
| `tests/services/MergeWorker.test.ts` | Unit tests |

---

## MergeWorker API

```typescript
// src/services/MergeWorker.ts

import { EventEmitter } from 'events';

export interface MergeAttemptResult {
  success: boolean;
  taskId: string;
  branch: string;
  merged: boolean;
  hasConflict: boolean;
  conflictFiles?: string[];
  error?: Error;
}

export interface MergeWorkerConfig {
  mainBranch: string;  // default: 'main'
}

export class MergeWorker extends EventEmitter {
  constructor(config: MergeWorkerConfig);

  /**
   * Attempt to merge branch into main
   */
  async merge(item: MergeQueueItem): Promise<MergeAttemptResult>;

  /**
   * Abort current merge (git merge --abort)
   */
  async abort(): Promise<void>;

  /**
   * Check if a merge is in progress
   */
  isMerging(): boolean;

  // === EVENTS ===
  // 'mergeStart' - merge attempt starting
  // 'mergeSuccess' - merge completed successfully
  // 'mergeConflict' - conflict detected
  // 'mergeError' - unexpected error
}
```

---

## Git Operations

```bash
# 1. Checkout main branch
git checkout main

# 2. Pull latest (ensure up-to-date)
git pull origin main

# 3. Attempt merge
git merge <branch> --no-ff -m "Merge: <taskId>"

# If conflict:
git merge --abort
# Return conflict info

# If success:
# Return success
```

---

## Test Cases

```typescript
// tests/services/MergeWorker.test.ts

describe('MergeWorker', () => {
  describe('merge', () => {
    it('should return success for clean merge');
    it('should return hasConflict=true when conflict');
    it('should list conflicting files');
    it('should emit mergeSuccess on success');
    it('should emit mergeConflict on conflict');
    it('should emit mergeError on git command failure');
  });

  describe('abort', () => {
    it('should run git merge --abort');
    it('should reset isMerging to false');
  });

  describe('isMerging', () => {
    it('should return true during merge operation');
  });
});
```

---

## Acceptance Criteria

### merge() - 6 tests
- [ ] Returns `{ success: true, merged: true }` for clean merge
- [ ] Returns `{ hasConflict: true }` when conflict detected
- [ ] `conflictFiles` lists all files with conflicts
- [ ] Emits 'mergeSuccess' event on success
- [ ] Emits 'mergeConflict' event on conflict
- [ ] Emits 'mergeError' event on git command failure

### abort() - 2 tests
- [ ] Runs `git merge --abort` successfully
- [ ] Sets `isMerging` to false after abort

### isMerging() - 1 test
- [ ] Returns `true` while merge operation in progress

### Implicit (no dedicated tests)
- 'mergeStart' event emitted at beginning of merge() (trivial)

**Total: 9 tests**

---

## Implementation Notes

1. Uses execa or child_process for git commands
2. Parses git output to detect conflicts
3. Never leaves merge in conflicted state (always abort if conflict)
4. Commit message includes taskId for traceability
5. --no-ff ensures merge commit even for fast-forward
