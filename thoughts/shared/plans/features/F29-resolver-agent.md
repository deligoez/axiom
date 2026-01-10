# F29: Resolver Agent

**Milestone:** 5 - Merge Service
**Dependencies:** F28 (Rebase-Retry)
**Estimated Tests:** 9

---

## What It Does

Spawns a Claude agent to resolve complex merge conflicts that can't be auto-resolved or fixed by rebase. The agent understands code semantics and can intelligently merge changes.

---

## Why It's Needed

- Complex conflicts need code understanding
- Agents can reason about intent
- Preserves functionality from both branches
- Reduces human intervention

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/ResolverAgent.ts` | Agent spawning for resolution |
| `tests/services/ResolverAgent.test.ts` | Unit tests |

---

## ResolverAgent API

```typescript
// src/services/ResolverAgent.ts

import { EventEmitter } from 'events';

export interface ResolutionResult {
  success: boolean;
  resolved: boolean;
  filesResolved: string[];
  needsHuman: boolean;
  error?: Error;
}

export interface ResolverAgentConfig {
  maxAttempts: number;  // default: 2
  timeout: number;      // default: 300000 (5 min)
}

export class ResolverAgent extends EventEmitter {
  constructor(config: ResolverAgentConfig);

  /**
   * Spawn agent to resolve conflicts
   */
  async resolve(
    branch: string,
    worktree: string,
    conflictFiles: string[]
  ): Promise<ResolutionResult>;

  /**
   * Build prompt for resolver agent
   */
  buildPrompt(conflictFiles: string[], analysis: ConflictAnalysis): string;

  /**
   * Check if agent resolved conflicts
   */
  async verifyResolution(worktree: string): Promise<boolean>;

  /**
   * Cancel running resolution
   */
  cancel(): void;

  // === EVENTS ===
  // 'resolving' - agent started
  // 'resolved' - conflicts resolved
  // 'failed' - agent couldn't resolve
}
```

---

## Resolution Prompt

```markdown
# Merge Conflict Resolution

You are resolving merge conflicts in branch `{branch}`.

## Conflicting Files
{for each file}
### {path}
```{language}
{conflict content with markers}
```
{/for}

## Your Task
1. Understand the intent of both changes
2. Resolve each conflict preserving functionality
3. Remove conflict markers
4. Run tests to verify resolution
5. If tests fail, iterate on fix

## Completion Signal
When done: <chorus status="complete" signal="conflicts-resolved" />
```

---

## Test Cases

```typescript
// tests/services/ResolverAgent.test.ts

describe('ResolverAgent', () => {
  describe('resolve', () => {
    it('should spawn agent with conflict prompt');
    it('should return success when agent resolves');
    it('should return needsHuman=true after max attempts');
    it('should emit resolving event when started');
    it('should emit resolved event on success');
  });

  describe('buildPrompt', () => {
    it('should include all conflict files');
    it('should include conflict analysis');
  });

  describe('verifyResolution', () => {
    it('should return true when no conflict markers remain');
  });
});
```

---

## Acceptance Criteria

### resolve() - 6 tests
- [ ] Spawns agent with conflict resolution prompt
- [ ] Returns `{ success: true, resolved: true }` when agent resolves
- [ ] Returns `{ needsHuman: true }` after maxAttempts failures
- [ ] Emits 'resolving' event when agent starts
- [ ] Emits 'resolved' event on successful resolution
- [ ] Emits 'failed' event after maxAttempts failures

### buildPrompt() - 2 tests
- [ ] Includes all conflicting file contents
- [ ] Includes conflict analysis for context

### verifyResolution() - 1 test
- [ ] Returns `true` when no conflict markers (`<<<<`, `====`, `>>>>`) remain

### Implicit (no dedicated tests)
- `cancel()` - kills running agent process (simple process.kill wrapper)

**Total: 9 tests**

---

## Implementation Notes

1. Uses same agent spawning as task execution (worktree isolation)
2. Timeout prevents stuck resolution attempts
3. Verification checks for conflict markers
4. After resolution, stages files and signals ready for merge
5. If agent fails twice, escalate to human (F30)
6. Agent has access to test runner to verify fixes
