# F11: Completion Checker

**Milestone:** 3 - Task Management
**Dependencies:** F08 (Signal Parser), F10 (Test Runner)
**Estimated Tests:** 8

---

## What It Does

Combines signal detection and test verification to determine if a task is truly complete.

---

## Why It's Needed

- Signal alone is NOT enough - agent might hallucinate completion
- Tests must pass to confirm actual completion
- AND logic: `<chorus>COMPLETE</chorus>` + tests pass = complete
- Used by F16 (Completion Handler) to trigger task close

---

## Completion Logic

```
Agent Output
     │
     ├── Has <chorus>COMPLETE</chorus>? ────► NO ────► Not Complete
     │
     ▼ YES
     │
     ├── Run Tests ────► FAIL ────► Not Complete
     │
     ▼ PASS
     │
     └── ✓ TASK COMPLETE
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/CompletionChecker.ts` | Check completion criteria |
| `tests/services/CompletionChecker.test.ts` | Unit tests |

---

## CompletionChecker API

```typescript
// src/services/CompletionChecker.ts

import { SignalParser } from './SignalParser';
import { TestRunner } from './TestRunner';
import type { ChorusConfig } from '../types/config';

export interface CompletionResult {
  complete: boolean;
  hasSignal: boolean;
  testsPassed: boolean | null;  // null if tests not run
  reason?: string;
  testOutput?: string;
}

export class CompletionChecker {
  private signalParser: SignalParser;
  private testRunner: TestRunner;
  private config: ChorusConfig;

  constructor(config: ChorusConfig, projectDir: string) {
    this.config = config;
    this.signalParser = new SignalParser();
    this.testRunner = new TestRunner(projectDir, config.project.testCommand);
  }

  /**
   * Check if task is complete based on agent output
   * Runs tests if signal found and requireTests is true
   */
  async check(output: string, worktreePath?: string): Promise<CompletionResult> {
    // 1. Check for completion signal
    const hasSignal = this.signalParser.isComplete(output);

    if (!hasSignal) {
      return {
        complete: false,
        hasSignal: false,
        testsPassed: null,
        reason: 'No completion signal found'
      };
    }

    // 2. If tests not required, signal alone is enough
    if (!this.config.completion.requireTests) {
      return {
        complete: true,
        hasSignal: true,
        testsPassed: null,
        reason: 'Signal found, tests not required'
      };
    }

    // 3. Run tests
    const testResult = await this.testRunner.run(worktreePath);

    if (testResult.passed) {
      return {
        complete: true,
        hasSignal: true,
        testsPassed: true,
        reason: 'Signal found and tests passed',
        testOutput: testResult.output
      };
    }

    return {
      complete: false,
      hasSignal: true,
      testsPassed: false,
      reason: 'Signal found but tests failed',
      testOutput: testResult.output
    };
  }

  /**
   * Quick check - signal only (no test run)
   */
  hasCompletionSignal(output: string): boolean {
    return this.signalParser.isComplete(output);
  }

  /**
   * Check if agent is blocked
   */
  isBlocked(output: string): { blocked: boolean; reason: string | null } {
    const isBlocked = this.signalParser.isBlocked(output);
    const reason = this.signalParser.getReason(output);
    return { blocked: isBlocked, reason };
  }

  /**
   * Check if agent needs help
   */
  needsHelp(output: string): { needsHelp: boolean; question: string | null } {
    const result = this.signalParser.parse(output);
    if (result.signal?.type === 'NEEDS_HELP') {
      return { needsHelp: true, question: result.signal.payload };
    }
    return { needsHelp: false, question: null };
  }
}
```

---

## Test Cases

```typescript
// tests/services/CompletionChecker.test.ts

describe('CompletionChecker', () => {
  describe('check', () => {
    it('should return complete=false if no signal');
    it('should return complete=true if signal and tests pass');
    it('should return complete=false if signal but tests fail');
    it('should return complete=true if signal and tests not required');
    it('should run tests in worktree path');
  });

  describe('isBlocked', () => {
    it('should detect BLOCKED signal');
    it('should extract block reason');
  });

  describe('needsHelp', () => {
    it('should detect NEEDS_HELP signal');
    it('should extract question');
  });
});
```

---

## Acceptance Criteria

- [ ] Returns `complete: false` if no signal
- [ ] Returns `complete: true` if signal + tests pass
- [ ] Returns `complete: false` if signal + tests fail
- [ ] Respects `requireTests` config option
- [ ] Runs tests in worktree directory
- [ ] Detects blocked state
- [ ] Detects needs_help state
- [ ] All 8 tests pass

---

## Implementation Notes

1. AND logic: signal + tests = complete
2. `requireTests: false` in config bypasses test check
3. Run tests in worktree path (agent's working directory)
4. Store test output for debugging
5. isBlocked and needsHelp are helpers for Orchestrator
