# Agent Work Review System

**Date:** 2026-01-12
**Status:** DRAFT
**Version:** 3.0

---

## Executive Summary

Adding a flexible "Human-in-the-Loop" (HITL) review system to Chorus:

1. **Non-Blocking Review** - Agent completes task → "reviewing" status → agent takes next task immediately
2. **Beads Integration** - New "reviewing" status as kanban column
3. **Task-Level Config** - Each task can have its own review mode (via labels)
4. **Unified Review UX** - Single review flow for all pending tasks (single or batch)
5. **Feedback Loop** - Redo with feedback, injected into agent prompt
6. **Sprint Planning** - Separate feature for planning which tasks to work on (not review-specific)

---

## Why Add Review?

Chorus currently offers two modes:
- **Semi-auto:** User manually assigns each task → full control but slow
- **Autopilot:** Fully autonomous → fast but no control

Review system provides flexible options between these extremes:

| Need | Solution |
|------|----------|
| Agent should work but I want to see results | Batch review |
| Run overnight, review in morning | Sprint + batch review |
| Critical tasks must be reviewed | Per-task review + labels |
| Don't bother me with trivial tasks | Auto-approve rules |
| I don't like it, redo | Redo with feedback |

---

## Core Design: Non-Blocking Review

### Architecture

```
Agent-1 completes Task-A
       │
       ▼
Task-A → "reviewing" status (Beads)
       │
       ▼
Agent-1 FREE → takes Task-B immediately
       │
       ▼
User reviews Task-A (whenever ready)
       │
       ├── Approve → Task-A closed, merge queue
       ├── Redo → Task-A back to "open" with feedback
       └── Reject → Task-A blocked
```

**Key Principle:** Agent and User work in parallel, never blocking each other.

---

## Beads Status: "reviewing"

### Task Status Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TASK STATUS FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────┐    ┌───────────┐    ┌───────────┐    ┌────────┐             │
│   │ open │───►│in_progress│───►│ REVIEWING │───►│ closed │             │
│   └──────┘    └───────────┘    └─────┬─────┘    └────────┘             │
│       ▲                              │                                   │
│       │          redo (feedback)     │                                   │
│       └──────────────────────────────┘                                  │
│                                                                          │
│   Kanban Columns:                                                        │
│   [Open] [In Progress] [Reviewing] [Done]                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Beads Commands

```bash
# Agent completes task
bd update ch-xxx --status=reviewing

# User approves
bd close ch-xxx

# User requests redo
bd update ch-xxx --status=open

# User rejects
bd update ch-xxx --status=blocked

# List tasks pending review
bd list --status=reviewing -n 0
```

> **Note:** We recently added "deferred" status to Beads. Adding "reviewing" follows the same pattern.

---

## Review Modes

### Mode Spectrum

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
│  task as it          "reviewing",        if quality          review     │
│  completes           user reviews        checks pass         entirely   │
│                      when ready                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior | Best For |
|------|----------|----------|
| **per-task** | Task goes to "reviewing", user reviews immediately | Security, architecture changes |
| **batch** | Task goes to "reviewing", user reviews when ready | Normal workflow (default) |
| **auto-approve** | Auto-approve if quality checks pass, else "reviewing" | Low-risk, well-tested tasks |
| **skip** | Skip review, go directly to closed | Docs, trivial changes |

### Task-Level Review Mode Assignment

Users can assign review mode per task via labels:

```bash
# Assign review mode to task
bd label add ch-xxx review:per-task
bd label add ch-yyy review:batch      # default
bd label add ch-zzz review:auto
bd label add ch-aaa review:skip
```

### Plan Agent Review Mode Assignment

When planning tasks, the Plan Agent should:
1. **Default to auto-approve** - Most tasks should be full-auto
2. **Mark exceptions** - If agent determines task cannot be full-auto, it sets review mode
3. **User override** - User can always change review mode

```markdown
## Task: Add authentication
Labels: review:per-task  <!-- Agent marked this as needing review -->

## Task: Fix typo in README
Labels: review:skip  <!-- Trivial, no review needed -->

## Task: Refactor utils
Labels: review:batch  <!-- Default, user will review in batch -->
```

---

## Review UX Flow

### Status Bar

When tasks are pending review, status bar shows:

```
┌─────────────────────────────────────────────────────────────────┐
│ REVIEW PENDING │ 5 tasks │ Press [R] to review                  │
└─────────────────────────────────────────────────────────────────┘
```

### Starting Review

User presses `R` to open review panel. Two modes:

1. **Single task** - If only 1 task pending, open directly
2. **Batch** - If multiple tasks, show summary first

### Review Summary (Batch)

```
┌─────────────────────────────────────────────────────────────────┐
│ REVIEW SUMMARY                                        5 tasks   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Auto-approvable: 3    Need attention: 2                        │
│                                                                  │
│  #  Task ID    Title                    Quality   Mode          │
│  ─────────────────────────────────────────────────────────────  │
│  1  ch-abc1    Add user auth            ✓✓✓✓     per-task      │
│  2  ch-abc2    Fix login bug            ✓✓✓✓     batch         │
│  3  ch-abc3    Rate limiting            ✓✓✗✓     batch         │
│  4  ch-abc4    Update API               ✓✓✓✓     auto          │
│  5  ch-abc5    OAuth integration        ✗✗✗✗     batch         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [A] Approve all auto-approvable (3)                            │
│  [Enter] Review one by one                                      │
│  [1-5] Jump to specific task                                    │
│  [Esc] Cancel                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Individual Task Review Panel

When reviewing a task (single or from batch), modal covers ~80% of screen:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REVIEW TASK                                              [1/5] ch-abc1  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Task: Add user authentication                                          │
│  Agent: agent-1 │ Duration: 4m 23s │ Iterations: 2                      │
│                                                                          │
│  ═══ Changes Summary ═══                                                │
│  + src/auth/login.ts (new file, 145 lines)                              │
│  + src/auth/logout.ts (new file, 32 lines)                              │
│  M src/routes/index.ts (+12 lines)                                      │
│  + tests/auth.test.ts (new file, 89 lines)                              │
│                                                                          │
│  ═══ Quality Results ═══                                                │
│  Tests: 12/12 passed ✓                                                  │
│  TypeCheck: No errors ✓                                                 │
│  Lint: No issues ✓                                                      │
│  Knip: No dead code ✓                                                   │
│                                                                          │
│  ═══ Agent Signal ═══                                                   │
│  STATUS: DONE                                                            │
│  MESSAGE: "Implemented JWT-based auth with refresh tokens"              │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [A] Approve   [R] Redo with feedback   [X] Reject   [D] View diff      │
│  [N] Next task [P] Previous task        [Esc] Back to summary           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Redo with Feedback

When user presses `R` for redo:

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
│  │ See RFC 6585 for 429 response format.                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ═══ Redo Options ═══                                                   │
│  ● Keep current changes (iterate on top)                                │
│  ○ Reset to before this task (fresh start)                              │
│  ○ Reset to checkpoint                                                  │
│                                                                          │
│  ═══ Priority After Redo ═══                                            │
│  ○ Same (P1)                                                            │
│  ● Bump to P0                                                           │
│  ○ Lower to P2                                                          │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Enter] Submit & Queue Redo   [Esc] Cancel                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feedback Storage

### Location

Feedback is stored in `.chorus/feedback/` when submitted via TUI:

```
.chorus/
├── feedback/
│   ├── ch-abc1.json
│   ├── ch-abc3.json
│   └── ...
```

### Schema

```typescript
interface TaskFeedback {
  taskId: string;
  history: FeedbackEntry[];
}

interface FeedbackEntry {
  iteration: number;
  timestamp: number;
  decision: 'approved' | 'redo' | 'rejected';

  // For redo
  quickIssues?: string[];
  customFeedback?: string;
  redoOption?: 'keep' | 'fresh' | 'checkpoint';
  priorityChange?: 'same' | 'bump' | 'lower';

  // For reject
  rejectReason?: string;
}
```

### Feedback Injection

When agent picks up a task with feedback, it's injected into the prompt:

```markdown
## Previous Review Feedback (Iteration 3)

The reviewer identified these issues:
- Code style issues
- Security issues

Detailed feedback:
> The rate limit value (1000) is hardcoded. It should come from
> config. Also, add IP-based rate limiting, not just user-based.
> See RFC 6585 for 429 response format.

Please address these concerns in this iteration.
```

---

## Auto-Approve Rules

Auto-approve is based on the project's quality pipeline, not TypeScript-specific checks.

### Configuration

```json
{
  "review": {
    "autoApprove": {
      "enabled": true,
      "requireQualityPass": true,
      "maxIterations": 3,
      "requireSignalDone": true
    }
  }
}
```

### Quality Pipeline Reference

Auto-approve uses the same quality checks defined in the project:

```bash
# Chorus quality pipeline (from package.json)
npm run quality
# Which runs:
# 1. npm run test:run   - Vitest
# 2. npm run typecheck  - TypeScript
# 3. npm run lint       - Biome
# 4. npm run knip       - Dead code
```

### Evaluation Logic

```typescript
function canAutoApprove(result: AgentResult, config: AutoApproveConfig): boolean {
  // Check task label
  if (result.taskLabels.includes('review:per-task')) return false;
  if (result.taskLabels.includes('review:skip')) return true;

  if (!config.enabled) return false;

  // Quality pipeline must pass
  if (config.requireQualityPass && !result.qualityPassed) return false;

  // Iteration limit
  if (config.maxIterations && result.iterations > config.maxIterations) return false;

  // Agent signal
  if (config.requireSignalDone && result.signal?.status !== 'DONE') return false;

  return true;
}
```

---

## Sprint Planning (Separate Feature)

Sprint planning is **separate from review**. It's about deciding which tasks to work on, not reviewing completed work.

### Sprint Planning Workflow

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
│  ═══ Task Selection ═══                                                 │
│  Ready tasks: 47 │ Est. time: ~15 hours                                 │
│                                                                          │
│  [✓] ch-abc1  Add user auth (P0, security)                             │
│  [✓] ch-abc2  Fix login bug (P0)                                       │
│  [✓] ch-abc3  Rate limiting (P1)                                       │
│  [ ] ch-abc4  Update docs (P2, docs)           ← excluded              │
│  [✓] ch-abc5  Refactor utils (P1)                                      │
│  ...                                                                    │
│                                                                          │
│  Selected: 23 tasks │ Est. completion: ~7 hours                         │
│                                                                          │
│  ═══ Options ═══                                                        │
│  [✓] Create checkpoint before start                                     │
│  [ ] Pause on any error                                                 │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Enter] Start Sprint   [Esc] Cancel                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sprint Progress

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT │ 14/23 tasks │ 2 failed │ Until 08:00 (6h 23m left)    │
└─────────────────────────────────────────────────────────────────┘
```

### Sprint and Review

- Sprint completes tasks → tasks go to "reviewing" status
- User reviews them via normal batch review (press `R`)
- No special "sprint review" - just regular review

---

## Configuration

### Review Config Schema

```typescript
interface ReviewConfig {
  // Default mode for tasks without label
  defaultMode: 'per-task' | 'batch' | 'auto-approve' | 'skip';

  // Auto-approve settings
  autoApprove: {
    enabled: boolean;
    requireQualityPass: boolean;
    maxIterations: number;
    requireSignalDone: boolean;
  };

  // Label rules (optional overrides)
  labelRules?: {
    [label: string]: {
      mode: ReviewMode;
      autoApprove?: boolean;
    };
  };
}
```

### Default Config

```json
{
  "review": {
    "defaultMode": "batch",

    "autoApprove": {
      "enabled": true,
      "requireQualityPass": true,
      "maxIterations": 3,
      "requireSignalDone": true
    },

    "labelRules": {
      "security": { "mode": "per-task", "autoApprove": false },
      "docs": { "mode": "skip" },
      "trivial": { "mode": "auto-approve" }
    }
  }
}
```

---

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `R` | Main view | Open review panel (if pending reviews exist) |
| `A` | Review summary | Approve all auto-approvable |
| `Enter` | Review summary | Start reviewing one by one |
| `1-9` | Review summary | Jump to specific task |
| `A` | Task review | Approve current task |
| `R` | Task review | Redo with feedback |
| `X` | Task review | Reject task |
| `D` | Task review | View diff |
| `N` | Task review | Next task |
| `P` | Task review | Previous task |
| `Esc` | Any | Back / Cancel |
| `Shift+S` | Main view | Open sprint planning |

---

## XState Integration

### Review Region

```typescript
const reviewRegion = {
  id: 'review',
  initial: 'idle',

  context: {
    pendingReviews: [] as string[],  // task IDs
    currentIndex: number,
    feedback: {} as Record<string, TaskFeedback>,
  },

  states: {
    idle: {
      on: {
        TASK_COMPLETED: {
          actions: 'addToPendingReviews',
        },
        START_REVIEW: [
          { target: 'reviewingSingle', guard: 'hasSinglePending' },
          { target: 'reviewingSummary', guard: 'hasMultiplePending' },
        ],
      },
    },

    reviewingSummary: {
      on: {
        APPROVE_ALL_AUTO: { actions: 'approveAllAuto' },
        START_ONE_BY_ONE: 'reviewingTask',
        JUMP_TO_TASK: 'reviewingTask',
        CANCEL: 'idle',
      },
    },

    reviewingTask: {
      on: {
        APPROVE: { actions: 'approveTask' },
        REDO: 'feedbackModal',
        REJECT: { actions: 'rejectTask' },
        NEXT: { actions: 'nextTask' },
        PREV: { actions: 'prevTask' },
        BACK: 'reviewingSummary',
        CANCEL: 'idle',
      },
    },

    reviewingSingle: {
      on: {
        APPROVE: { actions: 'approveTask', target: 'idle' },
        REDO: 'feedbackModal',
        REJECT: { actions: 'rejectTask', target: 'idle' },
        CANCEL: 'idle',
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

## Implementation Tasks

### M13: Review System

| ID | Feature | Description | Deps | Tests |
|----|---------|-------------|------|-------|
| **FR01** | Review Types | Types and interfaces | - | 6 |
| **FR02** | Review Region Machine | XState review region | FX03 | 14 |
| **FR03** | Beads Reviewing Status | Add "reviewing" status support | FR02 | 4 |
| **FR04** | Auto-Approve Engine | Quality-based auto-approve | FR01 | 8 |
| **FR05** | Feedback Storage | Save/load feedback JSON | FR01 | 6 |
| **FR06** | Feedback Injection | Inject feedback into prompt | FR05, ch-wk8 | 6 |
| **FR07** | Review Status Bar | Show pending count | FR02 | 4 |
| **FR08** | Review Summary Panel | Batch review overview | FR02 | 8 |
| **FR09** | Task Review Panel | Individual task review | FR02 | 10 |
| **FR10** | Feedback Modal | Redo feedback form | FR05, FR09 | 8 |
| **FR11** | Review Keyboard Handlers | R, A, N, P, etc. | FR08, FR09 | 10 |
| **FR12** | Label Rules Engine | Per-task review mode | FR01, FR04 | 6 |
| **FR13** | Review Config | Config file integration | FR01 | 4 |
| **FR14** | Review Persistence | Persist review state | FR02, FX05 | 6 |

**Subtotal: 14 tasks, ~100 tests**

### M13b: Sprint Planning (Separate)

| ID | Feature | Description | Deps | Tests |
|----|---------|-------------|------|-------|
| **SP01** | Sprint Types | Types and interfaces | - | 4 |
| **SP02** | Sprint Machine | XState sprint region | FX03 | 10 |
| **SP03** | Sprint Planning Panel | Task selection UI | SP02 | 8 |
| **SP04** | Sprint Progress Bar | Status bar integration | SP02 | 4 |
| **SP05** | Sprint Keyboard Handlers | Shift+S, etc. | SP03 | 4 |
| **SP06** | Sprint Config | Config file integration | SP01 | 4 |

**Subtotal: 6 tasks, ~34 tests**

### E2E Tests

| ID | Feature | Description | Deps | Tests |
|----|---------|-------------|------|-------|
| **E2E-R01** | Single Task Review | Review single pending task | FR09 | 4 |
| **E2E-R02** | Batch Review Flow | Review multiple tasks | FR08, FR09 | 6 |
| **E2E-R03** | Redo with Feedback | Submit feedback, verify injection | FR10, FR06 | 4 |
| **E2E-R04** | Auto-Approve | Tasks auto-approved when quality passes | FR04 | 4 |
| **E2E-R05** | Task-Level Review Mode | Label assignment affects review | FR12 | 4 |
| **E2E-R06** | Review Persistence | State survives restart | FR14 | 4 |
| **E2E-S01** | Sprint Planning | Plan and start sprint | SP03 | 4 |
| **E2E-S02** | Sprint Progress | Sprint completes, tasks in reviewing | SP02 | 4 |

**Subtotal: 8 tasks, ~34 tests**

### Total

**28 tasks, ~168 tests**

---

## Open Questions

1. **Diff viewer** - Inline TUI or external tool (delta, diff-so-fancy)?
2. **GitHub integration** - Deferred to future milestone
3. **Team review** - Multiple reviewers? (Future)

---

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 36 | **Non-blocking review** | Agent and user work in parallel |
| 37 | **Beads "reviewing" status** | Native status like "deferred" |
| 38 | **Labels for task-level config** | Simple, Beads native |
| 39 | **Feedback in .chorus/feedback/** | Persistent, separate from Beads |
| 40 | **Auto-approve based on quality pipeline** | Project-agnostic, uses existing checks |
| 41 | **Sprint planning separate from review** | Different concerns, simpler design |
| 42 | **Unified review flow** | Single/batch use same panels |
| 43 | **GitHub deferred** | MVP focuses on TUI |
| 44 | **Plan Agent marks review mode** | Default auto, agent marks exceptions |

---

## Version History

- **v3.0 (2026-01-12):** Major restructure based on feedback
  - CHANGED: Entire document to English
  - SIMPLIFIED: Only Beads "reviewing" status (removed alternatives)
  - ADDED: Unified review UX flow (summary → task panels)
  - SEPARATED: Sprint planning as distinct feature
  - SIMPLIFIED: Auto-approve based on quality pipeline (not TypeScript-specific)
  - ADDED: Plan Agent review mode assignment
  - ADDED: E2E test tasks for all workflows
  - REMOVED: Notification system
  - REMOVED: GitHub integration (deferred)
  - TOTAL: 28 tasks, ~168 tests

- **v2.1 (2026-01-12):** Simplification
  - REMOVED: Notification system (status bar only)

- **v2.0 (2026-01-12):** Architecture refinement
  - Non-blocking review architecture
  - Beads status integration
  - Task-level configuration via labels

- **v1.0 (2026-01-12):** Initial design
  - NEW FEATURE: Agent Work Review System
