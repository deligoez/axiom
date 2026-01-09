# F13: Task Closer

**Milestone:** 3 - Task Management
**Dependencies:** F12 (Task Claimer - shares BeadsCLI)
**Estimated Tests:** 5

---

## What It Does

Marks tasks as closed via `bd close` command after completion verification.

---

## Why It's Needed

- Tasks must be marked closed after agent completes successfully
- Updates .beads/issues.jsonl with status=closed
- Unblocks dependent tasks
- Required by Orchestrator (F15) and Completion Handler (F16)

---

## bd CLI Commands

```bash
# Close task
bd close ch-a1b2

# Close with comment
bd close ch-a1b2 --comment "Completed by claude agent"
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/services/BeadsCLI.ts` | Add closeTask method |
| `tests/services/BeadsCLI.test.ts` | Add tests |

---

## BeadsCLI API (Extended)

```typescript
// src/services/BeadsCLI.ts (additions from F12)

export class BeadsCLI {
  // ... existing from F12 ...

  /**
   * Close a task
   */
  async closeTask(taskId: string, comment?: string): Promise<void> {
    const args = ['close', taskId];
    if (comment) {
      args.push('--comment', comment);
    }
    await execa('bd', args, { cwd: this.projectDir });
  }

  /**
   * Reopen a closed task
   */
  async reopenTask(taskId: string): Promise<void> {
    await execa('bd', ['update', taskId, '--status=open'], {
      cwd: this.projectDir
    });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<string | null> {
    const task = await this.getTask(taskId);
    return task?.status ?? null;
  }

  /**
   * Get all in_progress tasks
   */
  async getInProgressTasks(): Promise<Bead[]> {
    try {
      const { stdout } = await execa('bd', ['list', '--status=in_progress', '--json'], {
        cwd: this.projectDir
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  /**
   * Get closed tasks
   */
  async getClosedTasks(): Promise<Bead[]> {
    try {
      const { stdout } = await execa('bd', ['list', '--status=closed', '--json'], {
        cwd: this.projectDir
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }
}
```

---

## Test Cases

```typescript
// tests/services/BeadsCLI.test.ts (additions)

describe('BeadsCLI', () => {
  describe('closeTask', () => {
    it('should call bd close with task ID');
    it('should include comment if provided');
    it('should throw on bd error');
  });

  describe('reopenTask', () => {
    it('should update status to open');
  });

  describe('getTaskStatus', () => {
    it('should return task status');
    it('should return null for invalid task');
  });
});
```

---

## Acceptance Criteria

- [ ] `closeTask()` runs `bd close` command
- [ ] Supports optional comment
- [ ] `reopenTask()` changes status back to open
- [ ] `getTaskStatus()` returns current status
- [ ] `getInProgressTasks()` lists in_progress tasks
- [ ] All 5 tests pass

---

## Implementation Notes

1. Extends BeadsCLI from F12
2. `bd close` is the proper way to mark complete (not `bd update --status=closed`)
3. Comment is useful for audit trail
4. reopenTask for when agent falsely claims completion
5. Use --json flag for structured output
