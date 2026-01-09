# F06: Worktree Service (Complete)

**Milestone:** 1 - Infrastructure
**Dependencies:** F04 (Create), F05 (Cleanup)
**Estimated Tests:** 4 (additional integration tests)

---

## What It Does

Complete worktree lifecycle management - create, list, query, remove.

---

## Why It's Needed

- Single service for all worktree operations
- Used by Orchestrator (F15) for agent isolation
- Used by MergeService (F31) for cleanup after merge

---

## Files to Finalize

| File | Purpose |
|------|---------|
| `src/services/WorktreeService.ts` | Complete implementation |
| `tests/services/WorktreeService.test.ts` | All tests (F04 + F05 + F06) |

---

## Complete WorktreeService API

```typescript
// src/services/WorktreeService.ts

import { execa } from 'execa';
import * as path from 'path';
import * as fs from 'fs';

export interface WorktreeInfo {
  path: string;
  branch: string;
  agentType: string;
  taskId: string;
  head: string;  // Current commit SHA
}

export class WorktreeService {
  private projectDir: string;
  private worktreesDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.worktreesDir = path.join(projectDir, '.worktrees');
  }

  // === CREATE (F04) ===

  async create(agentType: string, taskId: string): Promise<WorktreeInfo> {
    const worktreePath = this.getPath(agentType, taskId);
    const branch = this.getBranch(agentType, taskId);

    // Ensure .worktrees exists
    await fs.promises.mkdir(this.worktreesDir, { recursive: true });

    // Check if already exists
    if (this.exists(agentType, taskId)) {
      throw new Error(`Worktree already exists: ${worktreePath}`);
    }

    // Create worktree with new branch from main
    await execa('git', ['worktree', 'add', worktreePath, '-b', branch, 'main'], {
      cwd: this.projectDir
    });

    return this.getInfo(agentType, taskId);
  }

  // === QUERY ===

  exists(agentType: string, taskId: string): boolean {
    return fs.existsSync(this.getPath(agentType, taskId));
  }

  getPath(agentType: string, taskId: string): string {
    return path.join(this.worktreesDir, `${agentType}-${taskId}`);
  }

  getBranch(agentType: string, taskId: string): string {
    return `agent/${agentType}/${taskId}`;
  }

  async getInfo(agentType: string, taskId: string): Promise<WorktreeInfo> {
    const worktreePath = this.getPath(agentType, taskId);
    const branch = this.getBranch(agentType, taskId);

    // Get HEAD commit
    const { stdout: head } = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: worktreePath
    });

    return {
      path: worktreePath,
      branch,
      agentType,
      taskId,
      head: head.trim()
    };
  }

  async list(): Promise<WorktreeInfo[]> {
    const { stdout } = await execa('git', ['worktree', 'list', '--porcelain'], {
      cwd: this.projectDir
    });

    const worktrees: WorktreeInfo[] = [];
    const lines = stdout.split('\n');

    let currentPath = '';
    let currentBranch = '';

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentPath = line.substring(9);
      } else if (line.startsWith('branch refs/heads/')) {
        currentBranch = line.substring(18);
      } else if (line === '') {
        // Entry complete
        if (currentPath.includes('.worktrees/')) {
          const match = currentBranch.match(/^agent\/(\w+)\/(.+)$/);
          if (match) {
            worktrees.push({
              path: currentPath,
              branch: currentBranch,
              agentType: match[1],
              taskId: match[2],
              head: '' // Would need another git call to get this
            });
          }
        }
        currentPath = '';
        currentBranch = '';
      }
    }

    return worktrees;
  }

  // === REMOVE (F05) ===

  async remove(agentType: string, taskId: string, options: {
    deleteBranch?: boolean;
    force?: boolean;
  } = {}): Promise<void> {
    const worktreePath = this.getPath(agentType, taskId);
    const branch = this.getBranch(agentType, taskId);

    if (!this.exists(agentType, taskId)) {
      throw new Error(`Worktree does not exist: ${worktreePath}`);
    }

    // Remove worktree
    const args = ['worktree', 'remove', worktreePath];
    if (options.force) args.push('--force');

    await execa('git', args, { cwd: this.projectDir });

    // Delete branch if requested and merged
    const shouldDeleteBranch = options.deleteBranch ?? true;
    if (shouldDeleteBranch) {
      const merged = await this.isBranchMerged(branch);
      if (merged) {
        await execa('git', ['branch', '-d', branch], { cwd: this.projectDir });
      }
    }
  }

  async isBranchMerged(branch: string): Promise<boolean> {
    try {
      const { stdout } = await execa('git', ['branch', '--merged', 'main'], {
        cwd: this.projectDir
      });
      return stdout.includes(branch);
    } catch {
      return false;
    }
  }

  async prune(): Promise<void> {
    await execa('git', ['worktree', 'prune'], { cwd: this.projectDir });
  }

  // === CLEANUP ALL ===

  async removeAll(options: { force?: boolean } = {}): Promise<void> {
    const worktrees = await this.list();
    for (const wt of worktrees) {
      await this.remove(wt.agentType, wt.taskId, options);
    }
  }
}
```

---

## Test Cases (Integration)

```typescript
// tests/services/WorktreeService.test.ts (F06 additions)

describe('WorktreeService', () => {
  describe('list', () => {
    it('should return empty array if no worktrees');
    it('should list all agent worktrees');
  });

  describe('getInfo', () => {
    it('should return complete worktree info');
  });

  describe('removeAll', () => {
    it('should remove all worktrees');
  });
});
```

---

## Acceptance Criteria

- [ ] All F04 create tests pass
- [ ] All F05 cleanup tests pass
- [ ] `list()` returns all agent worktrees
- [ ] `getInfo()` returns complete info
- [ ] `removeAll()` cleans up everything
- [ ] All 14 tests pass (5+5+4)

---

## Usage Example

```typescript
const worktreeService = new WorktreeService('/path/to/project');

// Create worktree for agent task
const wt = await worktreeService.create('claude', 'bd-a1b2');
// wt.path = '.worktrees/claude-bd-a1b2'
// wt.branch = 'agent/claude/bd-a1b2'

// Spawn agent in worktree
await spawnAgent({ cwd: wt.path });

// After completion and merge
await worktreeService.remove('claude', 'bd-a1b2');
```
