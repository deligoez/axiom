# F10: Test Runner

**Milestone:** 3 - Task Management
**Dependencies:** F01b (Config Load - to get testCommand)
**Estimated Tests:** 6

---

## What It Does

Runs the project's test command and captures results (pass/fail, output).

---

## Why It's Needed

- Completion detection (F11) requires test pass verification
- Config specifies `testCommand` (e.g., "npm test", "pytest")
- Need to know if tests pass before marking task complete
- Signal alone is not enough - tests must also pass

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/TestRunner.ts` | Run tests and capture output |
| `tests/services/TestRunner.test.ts` | Unit tests |

---

## TestRunner API

```typescript
// src/services/TestRunner.ts

import { execa } from 'execa';

export interface TestResult {
  passed: boolean;
  exitCode: number;
  output: string;
  duration: number;  // ms
}

export class TestRunner {
  private projectDir: string;
  private testCommand: string;

  constructor(projectDir: string, testCommand: string) {
    this.projectDir = projectDir;
    this.testCommand = testCommand;
  }

  /**
   * Run tests in specified directory (worktree)
   */
  async run(cwd?: string): Promise<TestResult> {
    const startTime = Date.now();
    const workDir = cwd || this.projectDir;

    try {
      const { stdout, stderr, exitCode } = await execa(
        'sh',
        ['-c', this.testCommand],
        { cwd: workDir, reject: false }
      );

      return {
        passed: exitCode === 0,
        exitCode: exitCode ?? 0,
        output: stdout + '\n' + stderr,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        passed: false,
        exitCode: 1,
        output: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Run tests with timeout
   */
  async runWithTimeout(cwd?: string, timeout: number = 300000): Promise<TestResult> {
    const startTime = Date.now();
    const workDir = cwd || this.projectDir;

    try {
      const { stdout, stderr, exitCode } = await execa(
        'sh',
        ['-c', this.testCommand],
        { cwd: workDir, reject: false, timeout }
      );

      return {
        passed: exitCode === 0,
        exitCode: exitCode ?? 0,
        output: stdout + '\n' + stderr,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const isTimeout = error.timedOut === true;
      return {
        passed: false,
        exitCode: isTimeout ? 124 : 1,
        output: isTimeout ? 'Test timed out' : (error.message || 'Unknown error'),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get test command
   */
  getCommand(): string {
    return this.testCommand;
  }
}
```

---

## Test Cases

```typescript
// tests/services/TestRunner.test.ts

describe('TestRunner', () => {
  describe('run', () => {
    it('should return passed=true for exit code 0');
    it('should return passed=false for non-zero exit code');
    it('should capture stdout and stderr');
    it('should track duration');
  });

  describe('runWithTimeout', () => {
    it('should timeout long-running tests');
    it('should return exit code 124 on timeout');
  });
});
```

---

## Acceptance Criteria

- [ ] Runs test command via shell
- [ ] Returns `passed: true` for exit code 0
- [ ] Returns `passed: false` for non-zero exit code
- [ ] Captures stdout and stderr
- [ ] Tracks execution duration
- [ ] Supports timeout with proper handling
- [ ] All 6 tests pass

---

## Implementation Notes

1. Use `sh -c` to run command string (supports pipes, etc.)
2. `reject: false` to handle non-zero exit codes gracefully
3. Capture both stdout and stderr
4. Default timeout: 5 minutes (300000ms)
5. Exit code 124 is convention for timeout
6. Run in worktree directory (cwd parameter)
