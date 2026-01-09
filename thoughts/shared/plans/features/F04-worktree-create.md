# F04: Worktree Create

**Milestone:** 1 - Infrastructure
**Dependencies:** None
**Estimated Tests:** 5

---

## What It Does

Creates git worktrees for agent isolation: `git worktree add .worktrees/{agent}-{task} -b agent/{agent}/{task}`

---

## Why It's Needed

- Each agent needs isolated working directory
- Enables true parallel execution
- Prevents agents from conflicting with each other
- Worktree = separate checkout with its own branch

---

## Worktree Naming Convention

```
Path:   .worktrees/{agent-type}-{task-id}
Branch: agent/{agent-type}/{task-id}

Examples:
  .worktrees/claude-bd-a1b2
  agent/claude/bd-a1b2

  .worktrees/codex-bd-x3y4
  agent/codex/bd-x3y4
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/WorktreeService.ts` | Worktree management (partial) |
| `tests/services/WorktreeService.test.ts` | Unit tests |

---

## WorktreeService API (Partial - Create Only)

```typescript
// src/services/WorktreeService.ts

export interface WorktreeInfo {
  path: string;      // .worktrees/claude-bd-a1b2
  branch: string;    // agent/claude/bd-a1b2
  agentType: string; // claude
  taskId: string;    // bd-a1b2
}

export class WorktreeService {
  private projectDir: string;
  private worktreesDir: string;

  constructor(projectDir: string);

  // Create new worktree for agent+task
  async create(agentType: string, taskId: string): Promise<WorktreeInfo>;

  // Check if worktree exists
  exists(agentType: string, taskId: string): boolean;

  // Get worktree path
  getPath(agentType: string, taskId: string): string;

  // Get branch name
  getBranch(agentType: string, taskId: string): string;

  // List all worktrees
  list(): WorktreeInfo[];
}
```

---

## Git Commands Used

```bash
# Create worktree with new branch from main
git worktree add .worktrees/claude-bd-a1b2 -b agent/claude/bd-a1b2 main

# List worktrees
git worktree list --porcelain
```

---

## Test Cases

```typescript
// tests/services/WorktreeService.test.ts

describe('WorktreeService', () => {
  describe('create', () => {
    it('should create worktree directory');
    it('should create new branch from main');
    it('should return WorktreeInfo with correct paths');
    it('should throw if worktree already exists');
    it('should create .worktrees directory if not exists');
  });
});
```

---

## Acceptance Criteria

- [ ] Creates worktree at `.worktrees/{agent}-{task}`
- [ ] Creates branch `agent/{agent}/{task}` from main
- [ ] Creates `.worktrees/` directory if needed
- [ ] Throws if worktree already exists
- [ ] Returns correct WorktreeInfo
- [ ] All 5 tests pass

---

## Implementation Notes

1. Use `execa` for git commands (already in deps)
2. Ensure `.worktrees/` is in `.gitignore`
3. Branch should be created from `main` (or current HEAD)
4. Error handling: worktree exists, git errors, etc.
