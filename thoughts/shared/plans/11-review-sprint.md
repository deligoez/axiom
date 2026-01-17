# Chorus Review System & Sprint Planning

**Module:** 11-review-sprint.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [07-ralph-loop.md](./07-ralph-loop.md), [04-task-management.md](./04-task-management.md)

---

## Overview

Chorus provides a Human-in-the-Loop (HITL) review system (M13) and sprint planning capabilities (M13b) for controlled batch task execution.

---

## Agent Work Review System (M13)

### Why Add Review?

| Need | Solution |
|------|----------|
| Agent should work but I want to see results | Batch review |
| Run overnight, review in morning | Sprint + batch review |
| Critical tasks must be reviewed | Per-task review + labels |
| Don't bother me with trivial tasks | Auto-approve rules |
| I don't like it, redo | Redo with feedback |

### Core Concept: Non-Blocking Review

```
Agent-1 completes Task-A
       │
       ▼
Task-A → "review" status
       │
       ▼
Agent-1 FREE → takes Task-B immediately
       │
       ▼
User reviews Task-A (whenever ready)
       │
       ├── Approve → Task-A closed → merge queue
       ├── Redo → Task-A back to "todo" with feedback
       └── Reject → Task-A blocked
```

**Key Principle:** Agent and User work in parallel, never blocking each other.

---

## Task Status Flow with Review

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TASK STATUS FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────┐    ┌───────────┐    ┌───────────┐    ┌────────┐             │
│   │ todo │───►│   doing   │───►│  REVIEW   │───►│  done  │             │
│   └──────┘    └───────────┘    └─────┬─────┘    └────────┘             │
│       ▲                              │                                   │
│       │          redo (feedback)     │                                   │
│       └──────────────────────────────┘                                  │
│                                                                          │
│   Kanban Columns: [Todo] [Doing] [Review] [Done]                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Review Modes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REVIEW MODE SPECTRUM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MOST CONTROL                                        LEAST CONTROL       │
│       │                                                      │           │
│       ▼                                                      ▼           │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐  │
│  │per-task │        │  batch  │        │  auto   │        │  skip   │  │
│  │ review  │        │  review │        │ approve │        │ (trust) │  │
│  └─────────┘        └─────────┘        └─────────┘        └─────────┘  │
│       │                   │                  │                  │        │
│  Review each         Collect in          Auto-approve        Skip       │
│  task as it          "review",           if quality          review     │
│  completes           user reviews        checks pass         entirely   │
│                      when ready                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior | Best For |
|------|----------|----------|
| **per-task** | Status bar flashes, immediate attention | Security, architecture |
| **batch** | Collect in review, user reviews when ready | Normal workflow (default) |
| **auto-approve** | Auto-approve if quality checks pass | Low-risk, well-tested tasks |
| **skip** | Skip review, go directly to done | Docs, trivial changes |

> **Note:** All modes except `skip` are non-blocking.

---

## Task-Level Configuration

Review mode is set via task tags in TaskStore:

```typescript
// Assign review mode per task via tags
taskStore.update('ch-xxx', { tags: [...task.tags, 'review:per-task'] });
taskStore.update('ch-yyy', { tags: [...task.tags, 'review:batch'] });     // default
taskStore.update('ch-zzz', { tags: [...task.tags, 'review:auto'] });
taskStore.update('ch-aaa', { tags: [...task.tags, 'review:skip'] });
```

---

## Review UX Flow

### Status Bar (during execution)

```
┌─────────────────────────────────────────────────────────────────┐
│ REVIEW PENDING │ 5 tasks │ Press [R] to review                  │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-approve Notification (fades after 3s)

```
┌─────────────────────────────────────────────────────────────────┐
│ ✓ AUTO-APPROVED │ ch-abc1 "Fix typo" │ quality passed, 2 iter   │
└─────────────────────────────────────────────────────────────────┘
```

### R Key Behavior

- If task selected AND task is "review" → open single task review directly
- If no task selected OR task not "review" → open batch review summary

---

## Batch Review Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ REVIEW SUMMARY                                        5 tasks   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Quality passed: 3    Quality failed: 2                         │
│                                                                  │
│  #  Task ID    Title                    Quality   Mode          │
│  ─────────────────────────────────────────────────────────────  │
│  1  ch-abc1    Add user auth            ✓ pass    per-task      │
│  2  ch-abc2    Fix login bug            ✓ pass    batch         │
│  3  ch-abc3    Rate limiting            ✗ fail    batch         │
│  4  ch-abc4    Update API               ✓ pass    batch         │
│  5  ch-abc5    OAuth integration        ✗ fail    batch         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Enter] Review one by one                                      │
│  [1-5] Jump to specific task                                    │
│  [Esc] Cancel                                                   │
└─────────────────────────────────────────────────────────────────┘
```

> **Snapshot behavior:** When batch review opens, it captures current pending tasks. New tasks becoming "review" during review are NOT automatically added.

---

## Individual Task Review Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REVIEW TASK                                              [1/5] ch-abc1  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Task: Add user authentication                                          │
│  Agent: ed-001 │ Duration: 4m 23s │ Iterations: 2                       │
│                                                                          │
│  ═══ Changes Summary ═══                                                │
│  + src/auth/login.ts (new file, 145 lines)                              │
│  + src/auth/logout.ts (new file, 32 lines)                              │
│  M src/routes/index.ts (+12 lines)                                      │
│  + tests/auth.test.ts (new file, 89 lines)                              │
│                                                                          │
│  ═══ Quality Check ═══                                                  │
│  Result: ✓ PASSED                                                       │
│  Commands: test ✓, typecheck ✓, lint ✓, knip ✓                         │
│                                                                          │
│  ═══ Agent Signal ═══                                                   │
│  STATUS: COMPLETE                                                        │
│  MESSAGE: "Implemented JWT-based auth with refresh tokens"              │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [A] Approve   [R] Redo with feedback   [X] Reject                      │
│  [N] Next task [P] Previous task        [Esc] Back to summary           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Redo with Feedback Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REDO WITH FEEDBACK                                          [ch-abc3]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Task: Add rate limiting to API endpoints                               │
│  Previous iterations: 3                                                  │
│                                                                          │
│  ═══ Quick Issues ═══ (press number to toggle)                          │
│  [ ] 1. Tests incomplete                                                │
│  [✓] 2. Code style issues                                               │
│  [ ] 3. Missing error handling                                          │
│  [ ] 4. Performance concerns                                            │
│  [✓] 5. Security issues                                                 │
│                                                                          │
│  ═══ Custom Feedback ═══                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ The rate limit value (1000) is hardcoded. It should come from     │  │
│  │ config. Also, add IP-based rate limiting, not just user-based.    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ═══ Redo Options ═══                                                   │
│  ● Keep current changes (iterate on top)                                │
│  ○ Reset to before this task (fresh start)                              │
│  ○ Reset to checkpoint                                                  │
│                                                                          │
│  ═══ Selection Hint After Redo ═══                                      │
│  ○ Normal     ● Add 'next' tag (prioritize)    ○ Add 'later' tag        │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Enter] Submit & Queue Redo   [Esc] Cancel                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feedback Storage

```
.chorus/
├── feedback/
│   ├── ch-abc1.json
│   └── ch-abc3.json
```

```typescript
interface TaskFeedback {
  taskId: string;
  history: FeedbackEntry[];
}

interface FeedbackEntry {
  iteration: number;
  timestamp: number;
  decision: 'approved' | 'redo' | 'rejected';
  quickIssues?: string[];
  customFeedback?: string;
  redoOption?: 'keep' | 'fresh' | 'checkpoint';
  selectionHint?: 'normal' | 'next' | 'later';  // Tag to add after redo
  rejectReason?: string;
}
```

### Feedback Injection (when agent picks up redo task)

```markdown
## Previous Review Feedback (Iteration 3)

The reviewer identified these issues:
- Code style issues
- Security issues

Detailed feedback:
> The rate limit value (1000) is hardcoded. It should come from
> config. Also, add IP-based rate limiting, not just user-based.

Please address these concerns in this iteration.
```

---

## Auto-Approve Configuration

> **Note:** The Ralph loop already runs quality commands before a task can signal COMPLETE. If an agent signals COMPLETE, quality checks have passed. The auto-approve system primarily serves as a filter based on iteration count and task labels - not for re-running quality checks.

```typescript
interface AutoApproveConfig {
  enabled: boolean;
  maxIterations: number;        // Tasks with more iterations get human review
  // Note: requireQualityPass is implicit - COMPLETE signal means quality passed
}

function canAutoApprove(result: TaskCompletionResult, config: AutoApproveConfig): boolean {
  // Per-task review always requires human
  if (result.taskLabels.includes('review:per-task')) return false;

  // Skip review means auto-approve
  if (result.taskLabels.includes('review:skip')) return true;

  // Global auto-approve disabled
  if (!config.enabled) return false;

  // Too many iterations suggests complexity - human should review
  if (config.maxIterations && result.iterations > config.maxIterations) return false;

  // At this point: COMPLETE signal received = quality passed (per Ralph loop)
  // Task is simple (low iterations) and not marked for manual review
  return true;
}
```

**Flow clarification:**
```
Agent completes task → Quality commands run → All pass? → Signal COMPLETE
                                                  │
                                                  ▼
                                           Ralph loop accepts
                                                  │
                                                  ▼
                                    Auto-approve check (iterations, labels)
                                                  │
                              ┌───────────────────┴───────────────────┐
                              │                                        │
                       Low iterations                          High iterations
                       No per-task tag                         OR per-task tag
                              │                                        │
                              ▼                                        ▼
                     ✓ Auto-approve                              ◐ Review queue
                     → Merge queue                               → Human reviews
```

---

## Review Configuration

```typescript
interface ReviewConfig {
  defaultMode: 'per-task' | 'batch' | 'auto-approve' | 'skip';
  autoApprove: {
    enabled: boolean;
    maxIterations: number;  // Quality pass is implicit (COMPLETE = quality passed)
  };
  labelRules?: {
    [label: string]: {
      mode: ReviewMode;
      autoApprove?: boolean;
    };
  };
}
```

**Default config:**
```json
{
  "review": {
    "defaultMode": "batch",
    "autoApprove": {
      "enabled": true,
      "maxIterations": 3
    },
    "labelRules": {
      "security": { "mode": "per-task", "autoApprove": false },
      "docs": { "mode": "skip" },
      "trivial": { "mode": "auto-approve" }
    }
  }
}
```

> **Simplified reasoning:** A task that signals COMPLETE with ≤3 iterations and no `review:per-task` tag is straightforward enough to auto-approve. More iterations suggest the agent struggled - a human should verify the result.

---

## Review Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `j/k` | Main view | Navigate task list (down/up) |
| `R` | Main view (task selected) | Review selected task (if "review" status) |
| `R` | Main view (no selection) | Open batch review summary |
| `Enter` | Review summary | Start reviewing one by one |
| `1-9` | Review summary | Jump to specific task |
| `A` | Task review | Approve current task |
| `R` | Task review | Redo with feedback |
| `X` | Task review | Reject task |
| `N` | Task review | Next task |
| `P` | Task review | Previous task |
| `Esc` | Any | Back / Cancel |

---

## XState Review Region

```typescript
const reviewRegion = {
  id: 'review',
  initial: 'idle',

  context: {
    pendingReviews: [] as string[],
    currentBatch: [] as string[],
    currentIndex: 0,
    feedback: {} as Record<string, TaskFeedback>,
  },

  states: {
    idle: {
      on: {
        TASK_COMPLETED: { actions: 'addToPendingReviews' },
        START_REVIEW: {
          target: 'reviewingSummary',
          actions: 'snapshotPendingToBatch',
          guard: 'hasPendingReviews',
        },
        START_REVIEW_SINGLE: {
          target: 'reviewingTask',
          actions: ['snapshotSingleToBatch', 'setCurrentTaskFromSelection'],
          guard: 'selectedTaskIsReviewing',
        },
      },
    },
    reviewingSummary: {
      on: {
        START_ONE_BY_ONE: 'reviewingTask',
        JUMP_TO_TASK: 'reviewingTask',
        CANCEL: 'idle',
      },
    },
    reviewingTask: {
      on: {
        APPROVE: { actions: ['approveTask', 'sendToMergeQueue'] },
        REDO: 'feedbackModal',
        REJECT: { actions: 'rejectTask' },
        NEXT: { actions: 'nextTask' },
        PREV: { actions: 'prevTask' },
        BACK: 'reviewingSummary',
        CANCEL: { actions: 'clearBatch', target: 'idle' },
      },
    },
    feedbackModal: {
      on: {
        SUBMIT_FEEDBACK: {
          actions: ['saveFeedback', 'redoTask'],
          target: 'reviewingTask',
        },
        CANCEL: 'reviewingTask',
      },
    },
  },
};
```

---

## Sprint Planning (M13b)

### Sprint Concept

Sprint is a **configuration wrapper**, not a task controller:
- Sets iteration limits, timeouts, and completion target
- Normal orchestrator still assigns tasks to agents
- Monitors progress and stops when target reached
- Does NOT change which tasks are assigned - uses existing ready queue

### Sprint Targets

| Target Type | Description |
|-------------|-------------|
| Task count | Complete N tasks |
| Duration | Run for N hours |
| Until time | Run until HH:MM |
| No ready | Run until no ready tasks |

### Iteration Settings

| Setting | Config Key | Default | Description |
|---------|------------|---------|-------------|
| Max iterations | `completion.maxIterations` | 50 | Max iterations per task |
| Task timeout | `completion.taskTimeout` | 30 min | Timeout per task |
| Stuck detection | - | 5 iterations | Alert if no git commits |
| Error threshold | - | 3 consecutive | Pause if 3 errors in a row |

---

## Sprint Planning Panel (Shift+S)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SPRINT PLANNING                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ═══ Sprint Target ═══                                                  │
│  ○ Complete [20] tasks                                                  │
│  ○ Run for [8] hours                                                    │
│  ● Run until [08:00]                                                    │
│  ○ Run until no ready tasks                                             │
│                                                                          │
│  ═══ Iteration Settings ═══  (from config.completion)                   │
│  Max iterations per task: [50]                                          │
│  Task timeout (minutes):  [30]                                          │
│  Pause on stuck:          [✓] (5 iterations no commit)                  │
│  Pause on errors:         [✓] (3 consecutive errors)                    │
│                                                                          │
│  ═══ Task Selection ═══                                                 │
│  Ready tasks: 47 │ Est. time: ~15 hours                                 │
│                                                                          │
│  [✓] ch-abc1  Add user auth [security, next]                           │
│  [✓] ch-abc2  Fix login bug [m2-agent-prep]                            │
│  [✓] ch-abc3  Rate limiting [m3-task-mgmt]                             │
│  [ ] ch-abc4  Update docs [docs]               ← excluded              │
│  [✓] ch-abc5  Refactor utils [m3-task-mgmt]                            │
│  ...                                                                    │
│                                                                          │
│  Selected: 23 tasks │ Est. completion: ~7 hours                         │
│                                                                          │
│  ═══ Options ═══                                                        │
│  [✓] Create checkpoint before start  ← Git tag for rollback             │
│  [ ] Pause on any error                                                 │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Enter] Start Sprint   [Esc] Cancel                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sprint Progress Bar (during execution)

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT │ 14/23 tasks │ 2 failed │ Until 08:00 (6h 23m left)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checkpoint Before Sprint

**What:** Creates a git tag (e.g., `chorus-checkpoint-1736640000`) before sprint starts.

**Why:** Allows rollback if sprint goes wrong. Use `Checkpointer.restore(tag)` to reset to pre-sprint state.

**Implementation:** Uses existing `Checkpointer.create('autopilot_start')` from `src/services/Checkpointer.ts`.

---

## Task "Failed" Status

A task gets `status: "failed"` when:
1. **Max iterations exceeded** - Agent ran 50+ iterations without completing
2. **Timeout** - Task took longer than `completion.taskTimeout` (default 30 min)
3. **Agent error** - Agent signals ERROR and can't recover

Failed tasks are NOT in review queue - they need investigation, not approval.

---

## Sprint Statistics

Sprint data is stored in `.chorus/sprints.jsonl` (append-only JSONL format):

```jsonl
{"id":"2026-01-12-001","startedAt":1736640000000,"target":{"type":"count","value":20},...}
{"id":"2026-01-12-002","startedAt":1736726400000,"target":{"type":"until","value":"08:00"},...}
```

```typescript
interface SprintStats {
  id: string;
  startedAt: number;
  endedAt: number | null;
  target: SprintTarget;

  // Task counts
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  reviewingTasks: number;

  // Per-task stats (for analytics)
  taskStats: {
    taskId: string;
    startedAt: number;
    completedAt: number;
    iterations: number;
    qualityPassed: boolean;
    reviewDecision?: 'approved' | 'redo' | 'rejected';
  }[];

  // Settings used
  settings: {
    maxIterations: number;
    taskTimeout: number;
    pauseOnStuck: boolean;
    pauseOnErrors: boolean;
  };
}
```

---

## Sprint and Review Integration

Sprint completes tasks → tasks go to "review" status → user reviews via normal batch review (press `R`).

Everything is non-blocking: review doesn't pause sprint, agents continue working.

---

## Decision Records

### Review Decisions (#36-51)

| # | Decision | Rationale |
|---|----------|-----------|
| 36 | **Non-blocking review** | Agent and user work in parallel |
| 37 | **Native "review" status** | Fits into existing task lifecycle |
| 38 | **Labels for task-level config** | Simple, native support |
| 39 | **Feedback in .chorus/feedback/** | Persistent, separate from tasks |
| 40 | **Auto-approve uses project quality commands** | Project-agnostic |
| 41 | **Sprint planning separate from review** | Different concerns, simpler design |
| 42 | **Unified review flow** | Single/batch use same panels |
| 43 | **GitHub/Diff viewer deferred** | MVP focuses on TUI basics |
| 44 | **Plan Agent marks review mode** | Default auto, agent marks exceptions |
| 45 | **Task completion data stored in TaskStore** | Review panel reads from tasks.jsonl |
| 46 | **Sprint stats stored in .chorus/sprints.jsonl** | Append-only analytics and history |
| 47 | **Sprint planning includes iteration settings** | User can override defaults per sprint |
| 48 | **Approved tasks go to merge queue** | Same flow as normal task completion |
| 49 | **Archive files, don't delete** | User can delete manually if needed |
| 50 | **Batch review is snapshot-based** | New tasks during review not auto-added |
| 51 | **Everything non-blocking** | Review doesn't pause sprint, agents continue |

---

## References

- [07-ralph-loop.md](./07-ralph-loop.md) - Autopilot task completion
- [04-task-management.md](./04-task-management.md) - Task statuses
- [09-intervention-rollback.md](./09-intervention-rollback.md) - Checkpoints for rollback

---

**End of Review System & Sprint Planning Module**
