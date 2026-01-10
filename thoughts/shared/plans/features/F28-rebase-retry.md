# F28: Rebase-Retry

**Milestone:** 5 - Merge Service
**Dependencies:** F26 (Conflict Classifier)
**Estimated Tests:** 6

---

## What It Does

Attempts to resolve "simple" conflicts by rebasing the feature branch onto latest main before retrying the merge. Often resolves conflicts caused by stale branches.

---

## Why It's Needed

- Many conflicts happen because branch is outdated
- Rebase updates branch to latest main
- Often eliminates conflicts entirely
- Faster than spawning resolver agent

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/RebaseRetry.ts` | Rebase logic |
| `tests/services/RebaseRetry.test.ts` | Unit tests |

---

## RebaseRetry API

```typescript
// src/services/RebaseRetry.ts

export interface RebaseResult {
  success: boolean;
  rebased: boolean;
  hadConflicts: boolean;
  conflictFiles?: string[];
}

export class RebaseRetry {
  /**
   * Rebase branch onto main and retry merge
   */
  async rebaseAndRetry(branch: string, worktree: string): Promise<RebaseResult>;

  /**
   * Perform rebase operation
   */
  async rebase(branch: string, onto: string): Promise<RebaseResult>;

  /**
   * Abort rebase in progress
   */
  async abortRebase(): Promise<void>;

  /**
   * Check if rebase is in progress
   */
  isRebasing(): boolean;
}
```

---

## Git Operations

```bash
# In the worktree:
cd <worktree>

# 1. Fetch latest main
git fetch origin main

# 2. Attempt rebase
git rebase origin/main

# If conflict:
git rebase --abort
# Return failure

# If success:
# 3. Force push to update branch
git push --force-with-lease origin <branch>

# 4. Retry merge (handled by MergeWorker)
```

---

## Test Cases

```typescript
// tests/services/RebaseRetry.test.ts

describe('RebaseRetry', () => {
  describe('rebase', () => {
    it('should rebase branch onto main');
    it('should return success for clean rebase');
    it('should return hadConflicts=true when rebase conflicts');
  });

  describe('rebaseAndRetry', () => {
    it('should rebase and signal ready for merge');
    it('should abort and return failure on conflict');
  });
});
```

---

## Acceptance Criteria

### rebase() - 3 tests
- [ ] Successfully rebases branch onto main
- [ ] Returns `{ success: true, rebased: true }` for clean rebase
- [ ] Returns `{ hadConflicts: true }` when rebase has conflicts

### rebaseAndRetry() - 2 tests
- [ ] Completes rebase and returns ready state for merge retry
- [ ] Aborts rebase and returns failure when conflicts occur

### abortRebase() - 1 test
- [ ] Runs `git rebase --abort` and resets `isRebasing` to false

### Implicit (no dedicated tests)
- `isRebasing()` - returns boolean state (trivial getter)

**Total: 6 tests**

---

## Implementation Notes

1. Runs in worktree context (not main repo)
2. Uses `--force-with-lease` for safe push
3. Abort leaves worktree in clean state
4. After successful rebase, MergeWorker retries merge
5. If rebase fails, escalate to ResolverAgent (F29)
