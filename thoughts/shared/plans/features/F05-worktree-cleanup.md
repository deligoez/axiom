# F05: Worktree Cleanup

**Milestone:** 1 - Infrastructure
**Dependencies:** F04 (Worktree Create)
**Estimated Tests:** 5

---

## What It Does

Removes git worktrees after merge: `git worktree remove .worktrees/{agent}-{task}`

---

## Why It's Needed

- Clean up after task completion
- Free disk space
- Remove stale branches
- Required after successful merge

---

## Cleanup Flow

```
Task Complete
     │
     ▼
Branch Merged to Main
     │
     ▼
Remove Worktree
     │
     ├── git worktree remove .worktrees/claude-bd-a1b2
     │
     └── git branch -d agent/claude/bd-a1b2  (if merged)
```

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/services/WorktreeService.ts` | Add cleanup methods |
| `tests/services/WorktreeService.test.ts` | Add cleanup tests |

---

## WorktreeService API (Extended)

```typescript
// src/services/WorktreeService.ts (additions)

export class WorktreeService {
  // ... existing from F04 ...

  // Remove worktree and optionally delete branch
  async remove(agentType: string, taskId: string, options?: {
    deleteBranch?: boolean;  // default true if merged
    force?: boolean;         // git worktree remove --force
  }): Promise<void>;

  // Check if branch is merged into main
  async isBranchMerged(branch: string): Promise<boolean>;

  // Clean up all orphaned worktrees
  async prune(): Promise<void>;
}
```

---

## Git Commands Used

```bash
# Remove worktree
git worktree remove .worktrees/claude-bd-a1b2

# Force remove (uncommitted changes)
git worktree remove --force .worktrees/claude-bd-a1b2

# Delete branch if merged
git branch -d agent/claude/bd-a1b2

# Force delete branch
git branch -D agent/claude/bd-a1b2

# Check if merged
git branch --merged main | grep agent/claude/bd-a1b2

# Clean up stale worktree entries
git worktree prune
```

---

## Test Cases

```typescript
// tests/services/WorktreeService.test.ts (additions)

describe('WorktreeService', () => {
  describe('remove', () => {
    it('should remove worktree directory');
    it('should delete branch if merged');
    it('should keep branch if not merged');
    it('should force remove if specified');
    it('should throw if worktree does not exist');
  });
});
```

---

## Acceptance Criteria

- [ ] Removes worktree directory
- [ ] Deletes branch if merged to main
- [ ] Keeps branch if not merged (warn user)
- [ ] Force option for uncommitted changes
- [ ] Throws if worktree doesn't exist
- [ ] All 5 tests pass

---

## Implementation Notes

1. Default: only delete branch if merged
2. Use `--force` carefully - can lose uncommitted work
3. Consider adding stash before force remove
4. `prune()` cleans up worktree references after manual deletion
