# F12: Task Claimer

**Milestone:** 3 - Task Management
**Dependencies:** None (calls bd CLI)
**Estimated Tests:** 5

---

## What It Does

Marks tasks as in_progress via `bd update` command and assigns to agent.

---

## Why It's Needed

- Task must be claimed before agent starts
- Prevents multiple agents from claiming same task
- Updates .beads/issues.jsonl
- Required by Orchestrator (F15)

---

## bd CLI Commands

```bash
# Claim task
bd update bd-a1b2 --status=in_progress --assignee=claude-bd-a1b2

# Check task status
bd show bd-a1b2 --json
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/BeadsCLI.ts` | Wrapper for bd CLI commands |
| `tests/services/BeadsCLI.test.ts` | Unit tests |

---

## BeadsCLI API

```typescript
// src/services/BeadsCLI.ts

import { execa } from 'execa';

export class BeadsCLI {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Claim a task - mark as in_progress and set assignee
   */
  async claimTask(taskId: string, assignee: string): Promise<void> {
    await execa('bd', [
      'update', taskId,
      '--status=in_progress',
      `--assignee=${assignee}`
    ], { cwd: this.projectDir });
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Bead | null> {
    try {
      const { stdout } = await execa('bd', ['show', taskId, '--json'], {
        cwd: this.projectDir
      });
      return JSON.parse(stdout);
    } catch {
      return null;
    }
  }

  /**
   * Get all ready tasks (open, dependencies satisfied)
   */
  async getReadyTasks(): Promise<Bead[]> {
    try {
      const { stdout } = await execa('bd', ['ready', '--json'], {
        cwd: this.projectDir
      });
      return JSON.parse(stdout);
    } catch {
      return [];
    }
  }

  /**
   * Check if bd is installed and initialized
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execa('bd', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if bd is initialized in project
   */
  async isInitialized(): Promise<boolean> {
    try {
      await execa('bd', ['list', '--json'], { cwd: this.projectDir });
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Test Cases

```typescript
// tests/services/BeadsCLI.test.ts

describe('BeadsCLI', () => {
  describe('claimTask', () => {
    it('should call bd update with correct args');
    it('should throw on bd error');
  });

  describe('getTask', () => {
    it('should return task for valid ID');
    it('should return null for invalid ID');
  });

  describe('getReadyTasks', () => {
    it('should return array of ready tasks');
    it('should return empty array on error');
  });

  describe('isAvailable', () => {
    it('should return true if bd installed');
  });
});
```

---

## Acceptance Criteria

- [ ] `claimTask()` runs bd update with status and assignee
- [ ] `getTask()` returns parsed task or null
- [ ] `getReadyTasks()` returns ready tasks
- [ ] `isAvailable()` checks bd installation
- [ ] All 5 tests pass

---

## Implementation Notes

1. Use execa for CLI calls
2. Parse JSON output for structured data
3. Handle errors gracefully (return null/empty)
4. projectDir is cwd for all bd commands
