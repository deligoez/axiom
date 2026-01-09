# F14: Dependency Resolver

**Milestone:** 4 - Core Orchestration
**Dependencies:** F12 (Task Claimer - for BeadsCLI)
**Estimated Tests:** 8

---

## What It Does

Checks if a task's dependencies are satisfied before allowing assignment.

---

## Why It's Needed

- Tasks have dependencies on other tasks
- Agent can only work on task if all deps are closed
- Prevents wasted work on blocked tasks
- Used by Orchestrator (F15) in canAssign check

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/DependencyResolver.ts` | Check dependency status |
| `tests/services/DependencyResolver.test.ts` | Unit tests |

---

## DependencyResolver API

```typescript
// src/services/DependencyResolver.ts

import type { Bead } from '../types/bead';

export interface DependencyStatus {
  satisfied: boolean;
  pending: string[];      // IDs of pending deps
  inProgress: string[];   // IDs of in_progress deps
  failed: string[];       // IDs of failed deps
}

export class DependencyResolver {
  private beadsCLI: BeadsCLI;

  constructor(beadsCLI: BeadsCLI);

  /**
   * Check if all dependencies are satisfied (closed)
   */
  async check(taskId: string): Promise<DependencyStatus>;

  /**
   * Get direct dependencies of a task
   */
  async getDependencies(taskId: string): Promise<string[]>;

  /**
   * Check if specific dependency is satisfied
   */
  async isDependencySatisfied(depId: string): Promise<boolean>;

  /**
   * Get all tasks blocked by this task
   */
  async getDependents(taskId: string): Promise<string[]>;

  /**
   * Check for circular dependencies
   */
  async hasCircularDependency(taskId: string): Promise<boolean>;
}
```

---

## Implementation

```typescript
async check(taskId: string): Promise<DependencyStatus> {
  const task = await this.beadsCLI.getTask(taskId);
  if (!task || !task.dependencies || task.dependencies.length === 0) {
    return { satisfied: true, pending: [], inProgress: [], failed: [] };
  }

  const pending: string[] = [];
  const inProgress: string[] = [];
  const failed: string[] = [];

  for (const depId of task.dependencies) {
    const dep = await this.beadsCLI.getTask(depId);
    if (!dep) {
      failed.push(depId);
    } else if (dep.status === 'closed') {
      // satisfied - do nothing
    } else if (dep.status === 'in_progress') {
      inProgress.push(depId);
    } else {
      pending.push(depId);
    }
  }

  return {
    satisfied: pending.length === 0 && inProgress.length === 0 && failed.length === 0,
    pending,
    inProgress,
    failed
  };
}
```

---

## Test Cases

```typescript
// tests/services/DependencyResolver.test.ts

describe('DependencyResolver', () => {
  describe('check', () => {
    it('should return satisfied for task with no deps');
    it('should return satisfied when all deps are closed');
    it('should return pending deps that are open');
    it('should return inProgress deps');
    it('should return failed for missing deps');
  });

  describe('getDependencies', () => {
    it('should return empty array for no deps');
    it('should return list of dependency IDs');
  });

  describe('hasCircularDependency', () => {
    it('should return false for linear deps');
    it('should detect circular dependency');
  });
});
```

---

## Acceptance Criteria

- [ ] Returns satisfied=true when no dependencies
- [ ] Returns satisfied=true when all deps closed
- [ ] Returns pending deps that are open
- [ ] Returns inProgress deps
- [ ] Returns failed for missing deps
- [ ] Can get direct dependencies
- [ ] Can detect circular dependencies
- [ ] All 8 tests pass

---

## Implementation Notes

1. Uses BeadsCLI to query task status
2. Deps are stored in task.dependencies array
3. Circular dependency check uses visited set
4. Can be called before assignment in Orchestrator
5. Note: Master plan says "Skip for MVP" - basic check in F15.canAssign() may suffice initially
