# F30: Human Escalation

**Milestone:** 5 - Merge Service
**Dependencies:** F29 (Resolver Agent)
**Estimated Tests:** 7

---

## What It Does

Final fallback when all automated resolution strategies fail. Pauses autopilot and presents conflict to human for manual resolution.

---

## Why It's Needed

- Some conflicts truly need human judgment
- Safety net for edge cases
- Prevents infinite retry loops
- Provides clear UX for human intervention

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/HumanEscalation.ts` | Escalation logic |
| `tests/services/HumanEscalation.test.ts` | Unit tests |

---

## HumanEscalation API

```typescript
// src/services/HumanEscalation.ts

import { EventEmitter } from 'events';

export interface EscalationRequest {
  taskId: string;
  branch: string;
  worktree: string;
  conflictFiles: string[];
  attempts: EscalationAttempt[];
  reason: string;
}

export interface EscalationAttempt {
  strategy: 'auto' | 'rebase' | 'agent';
  error: string;
  timestamp: Date;
}

export interface EscalationResult {
  resolved: boolean;
  action: 'merged' | 'skipped' | 'cancelled';
}

export class HumanEscalation extends EventEmitter {
  private pending: EscalationRequest | null = null;

  /**
   * Request human intervention
   */
  async escalate(request: EscalationRequest): Promise<EscalationResult>;

  /**
   * Check if escalation pending
   */
  hasPending(): boolean;

  /**
   * Get pending escalation
   */
  getPending(): EscalationRequest | null;

  /**
   * Human resolved the conflict
   */
  async markResolved(): Promise<void>;

  /**
   * Human chose to skip this task
   */
  async markSkipped(): Promise<void>;

  /**
   * Human cancelled the merge entirely
   */
  async markCancelled(): Promise<void>;

  // === EVENTS ===
  // 'escalated' - new escalation created
  // 'resolved' - human resolved conflict
  // 'skipped' - human skipped task
  // 'cancelled' - human cancelled merge
}
```

---

## UX Flow

```
┌─────────────────────────────────────────┐
│  ⚠️  MERGE CONFLICT - Human Needed     │
├─────────────────────────────────────────┤
│  Task: F15 - Orchestrator Core          │
│  Branch: feature/f15-orchestrator       │
│                                         │
│  Conflicting Files:                     │
│  • src/services/Orchestrator.ts         │
│  • src/types/orchestration.ts           │
│                                         │
│  Failed Attempts:                       │
│  1. Auto-resolve: Not trivial           │
│  2. Rebase: Conflicts remain            │
│  3. Agent: Couldn't resolve tests       │
│                                         │
│  Worktree: /tmp/chorus/f15-worktree     │
│                                         │
│  [Resolve]  [Skip]  [Cancel Autopilot]  │
└─────────────────────────────────────────┘
```

---

## Test Cases

```typescript
// tests/services/HumanEscalation.test.ts

describe('HumanEscalation', () => {
  describe('escalate', () => {
    it('should emit escalated event');
    it('should pause until human responds');
    it('should store pending request');
  });

  describe('markResolved', () => {
    it('should clear pending and emit resolved');
  });

  describe('markSkipped/markCancelled', () => {
    it('should handle skip and cancel actions');
  });
});
```

---

## Acceptance Criteria

### escalate() - 3 tests
- [ ] Emits 'escalated' event with request details
- [ ] Returns Promise that waits for human action
- [ ] Sets `pending` state with request

### markResolved() - 1 test
- [ ] Clears pending, emits 'resolved', resolves escalate() promise with `action: 'merged'`

### markSkipped() - 1 test
- [ ] Clears pending, emits 'skipped', resolves with `action: 'skipped'` (autopilot continues)

### markCancelled() - 1 test
- [ ] Clears pending, emits 'cancelled', resolves with `action: 'cancelled'` (autopilot stops)

### hasPending() / getPending() - 1 test
- [ ] `hasPending()` returns true when escalation pending
- [ ] `getPending()` returns current request or null

**Total: 7 tests**

---

## Implementation Notes

1. Escalation pauses RalphLoop (no new tasks)
2. Human must respond before autopilot continues
3. "Skip" leaves task unmerged, marks failed
4. "Cancel" stops autopilot entirely
5. Human resolves in worktree, then calls markResolved()
6. UI component (separate feature) renders escalation dialog
