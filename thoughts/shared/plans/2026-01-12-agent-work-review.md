# Agent Work Review System

**Date:** 2026-01-12
**Status:** DRAFT
**Version:** 2.0

---

## Executive Summary

Chorus'a esnek bir "Human-in-the-Loop" (HITL) review sistemi ekliyoruz. Bu sistem:

1. **Non-Blocking Review** - Agent işini bitirir, task "reviewing" status'üne geçer, agent başka task alabilir
2. **Beads Integration** - Yeni "reviewing" status ile kanban'da ayrı kolon
3. **Task-Level Config** - Her task için farklı review kuralları (labels ile)
4. **Batch Review UX** - Birden fazla task'ı tek seferde review etme
5. **Feedback Loop** - Redo ile feedback verme, agent'a inject etme

---

## Why Add Review?

Chorus şu anda iki mod sunuyor:
- **Semi-auto:** Kullanıcı her task'ı manuel atar → tam kontrol ama yavaş
- **Autopilot:** Tam otonom çalışır → hızlı ama kontrol yok

Review sistemi bu iki uç arasında esnek seçenekler sunar:

| Need | Solution |
|------|----------|
| Agent çalışsın ama sonuçları görmek istiyorum | Batch review |
| Gece çalışsın, sabah bakayım | Sprint mode |
| Kritik task'ları mutlaka görmek istiyorum | Per-task review + labels |
| Trivial task'larla uğraşmak istemiyorum | Auto-approve rules |
| Beğenmedim, tekrar yapsın | Redo with feedback |

---

## Core Design: Non-Blocking Review Architecture

### Design Goal

Review sistemi agent'ları bloklamamalı. Agent işini bitirdiğinde hemen sonraki task'a geçebilmeli, kullanıcı istediği zaman review yapabilmeli.

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

**Key Principle:** Agent ve User paralel çalışır, birbirini bloklamaz.

---

## Beads Status Integration

### New Status: "reviewing"

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

# User requests redo (with feedback in body)
bd update ch-xxx --status=open --body "FEEDBACK: Fix the lint error..."

# User rejects
bd update ch-xxx --status=blocked --body "REJECTED: Security vulnerability..."

# List tasks pending review
bd list --status=reviewing

# Count reviewing tasks
bd list --status=reviewing | wc -l
```

### Beads Custom Status Support

Beads'ın custom status desteği olup olmadığını kontrol etmemiz gerekiyor:

**Option A: Native Beads status (preferred)**
```bash
bd update ch-xxx --status=reviewing
```

**Option B: Label workaround (if no custom status)**
```bash
bd update ch-xxx --status=open
bd label add ch-xxx status:reviewing
```

**Option C: Custom field (if supported)**
```bash
bd update ch-xxx --field review_status=pending
```

> **TODO:** Beads maintainer'a custom status support sorulacak.

---

## Task-Level Review Configuration

### Why Per-Task Config?

- **Security tasks:** Mutlaka human review gerektirir
- **Documentation:** Auto-approve yeterli
- **Refactoring:** Batch review uygun
- **P0 bugs:** Immediate review gerektirir

### Configuration via Labels

```bash
# Mark task for required review
bd label add ch-xxx review:required

# Mark task for auto-approve
bd label add ch-yyy review:auto

# Mark task to skip review entirely
bd label add ch-zzz review:skip

# Mark task for batch review (default)
bd label add ch-aaa review:batch
```

### Label Rules in Config

```json
{
  "review": {
    "defaultMode": "batch",

    "labelRules": {
      "review:required": {
        "mode": "per-task",
        "autoApprove": false,
        "notifyImmediately": true
      },
      "review:auto": {
        "mode": "auto-continue",
        "autoApprove": true
      },
      "review:skip": {
        "mode": "skip",
        "autoApprove": true,
        "skipMergeQueue": false
      },
      "review:batch": {
        "mode": "batch"
      },
      "security": {
        "mode": "per-task",
        "autoApprove": false,
        "requireManualApproval": true
      },
      "docs": {
        "mode": "auto-continue",
        "autoApprove": true
      },
      "trivial": {
        "mode": "skip"
      }
    },

    "priorityRules": {
      "P0": {
        "mode": "per-task",
        "notifyImmediately": true
      },
      "P1": {
        "mode": "batch"
      },
      "P2": {
        "mode": "auto-continue"
      }
    }
  }
}
```

### Rule Resolution Order

1. Task-specific label (`review:required` etc.)
2. Category label (`security`, `docs` etc.)
3. Priority rule (`P0`, `P1`, `P2`)
4. Default mode (`batch`)

---

## Review Mode Spectrum

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REVIEW MODE SPECTRUM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  MOST CONTROL                                        LEAST CONTROL       │
│       │                                                      │           │
│       ▼                                                      ▼           │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │per-task │   │  batch  │   │ sprint  │   │  auto   │   │  skip   │   │
│  │ review  │   │  review │   │  review │   │ continue│   │ (trust) │   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│       │              │             │             │              │        │
│  Kritik task     N task        Sprint         Kurallar       Otomatik   │
│  hemen review    topla         bitince        geçerse        onayla     │
│                  review        review         devam                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Mode | When Triggered | User Action | Best For |
|------|----------------|-------------|----------|
| **per-task** | Task "reviewing" olunca | Review → Approve/Redo/Reject | Security, architecture |
| **batch** | N task veya T dakika | Toplu review | Normal daily work |
| **sprint** | Sprint hedefine ulaşınca | Sprint summary review | Overnight runs |
| **auto-continue** | Her zaman (rules pass) | Sadece fail durumunda | Low-risk tasks |
| **skip** | Hiçbir zaman | Yok | Docs, trivial |

---

## Review Workflow Scenarios

### Scenario 1: Single Task, Per-Task Review

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIMELINE                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  T+0m   Agent-1 claims Task-A (security label)                          │
│  T+5m   Agent-1 completes Task-A                                        │
│         Task-A → "reviewing" status                                     │
│         Agent-1 takes Task-B (no block!)                                │
│  T+6m   🔔 Notification: "Task-A ready for review"                      │
│  T+10m  User opens review panel                                         │
│  T+12m  User approves Task-A                                            │
│         Task-A → closed, merge queue                                    │
│                                                                          │
│  Agent-1 worked on Task-B entire time (no idle!)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Batch Review (5 Tasks)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIMELINE                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  T+0m    3 agents start working                                         │
│  T+4m    Agent-1 completes Task-A → reviewing                           │
│  T+6m    Agent-2 completes Task-B → reviewing                           │
│  T+9m    Agent-3 completes Task-C → reviewing                           │
│  T+11m   Agent-1 completes Task-D → reviewing                           │
│  T+14m   Agent-2 completes Task-E → reviewing (5th task!)               │
│                                                                          │
│  T+14m   🔔 BATCH READY: "5 tasks ready for review"                     │
│          Status bar: [REVIEW PENDING │ 5 tasks │ Press Enter]           │
│                                                                          │
│  T+15m   User opens batch review panel                                  │
│          ┌─────────────────────────────────────────────────────────┐    │
│          │ BATCH REVIEW                              5 tasks       │    │
│          ├─────────────────────────────────────────────────────────┤    │
│          │  #  Task              Status   Quality   Decision       │    │
│          │  ───────────────────────────────────────────────────    │    │
│          │  1  Task-A            ✓ DONE   ✓✓✓✓     [✓] Approve    │    │
│          │  2  Task-B            ✓ DONE   ✓✓✓✓     [✓] Approve    │    │
│          │► 3  Task-C            ✓ DONE   ✓✓✗✓     [ ] ─────      │    │
│          │  4  Task-D            ✓ DONE   ✓✓✓✓     [✓] Approve    │    │
│          │  5  Task-E            ✗ FAIL   ─────    [ ] ─────      │    │
│          │                                                         │    │
│          │  Auto-approvable: 3  │  Need attention: 2              │    │
│          ├─────────────────────────────────────────────────────────┤    │
│          │  [A] Approve all passing   [Space] Toggle selected     │    │
│          │  [R] Redo selected         [X] Reject selected         │    │
│          │  [Enter] Apply decisions   [Esc] Cancel                │    │
│          └─────────────────────────────────────────────────────────┘    │
│                                                                          │
│  T+18m   User reviews:                                                  │
│          - Task-A, B, D: Auto-approved (✓✓✓✓)                          │
│          - Task-C: Redo with feedback "Fix lint error"                  │
│          - Task-E: Reject "Out of scope"                                │
│                                                                          │
│  T+18m   Results applied:                                               │
│          - Task-A, B, D → closed, merge queue                           │
│          - Task-C → open (with feedback), priority bumped               │
│          - Task-E → blocked                                             │
│                                                                          │
│  Meanwhile: Agents continued working on Task-F, G, H (no block!)        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scenario 3: Sprint Mode (Overnight Run)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIMELINE                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  22:00  User starts sprint: "Run until 08:00"                           │
│         ┌─────────────────────────────────────────────────────────┐    │
│         │ SPRINT SETUP                                             │    │
│         ├─────────────────────────────────────────────────────────┤    │
│         │  Sprint target: ● Run until [08:00]                     │    │
│         │                 ○ Complete [20] tasks                   │    │
│         │                 ○ Run for [8] hours                     │    │
│         │                                                         │    │
│         │  Options:                                               │    │
│         │  [✓] Create checkpoint before start                     │    │
│         │  [✓] Notify when complete                               │    │
│         │  [ ] Pause on any error                                 │    │
│         │                                                         │    │
│         │  Ready tasks: 47  │  Est. completion: ~15 hours         │    │
│         └─────────────────────────────────────────────────────────┘    │
│                                                                          │
│  22:01  Checkpoint created                                              │
│  22:02  Sprint starts, 3 agents working                                 │
│                                                                          │
│  [Overnight: Tasks completing → "reviewing" status]                     │
│  [Agents keep working, not blocked by review]                           │
│                                                                          │
│  08:00  Sprint ends                                                     │
│         🔔 Notification: "Sprint complete - 23 tasks ready for review" │
│                                                                          │
│  08:15  User wakes up, opens sprint review                              │
│         ┌─────────────────────────────────────────────────────────┐    │
│         │ SPRINT REVIEW                             23 tasks       │    │
│         ├─────────────────────────────────────────────────────────┤    │
│         │                                                         │    │
│         │  ═══ Sprint Summary ═══                                 │    │
│         │  Duration: 9h 58m │ Completed: 23 │ Failed: 4           │    │
│         │  Lines changed: +4,521 -892 across 67 files             │    │
│         │                                                         │    │
│         │  ═══ Quality Overview ═══                               │    │
│         │  All tests pass: 19/23 (83%)                            │    │
│         │  No lint errors: 21/23 (91%)                            │    │
│         │  Auto-approvable: 17/23 (74%)                           │    │
│         │                                                         │    │
│         │  ═══ Tasks Needing Attention (6) ═══                    │    │
│         │  ! ch-abc1: Password reset (lint errors)                │    │
│         │  ! ch-abc2: Email service (test timeout)                │    │
│         │  ✗ ch-abc3: OAuth (FAILED - max iterations)             │    │
│         │  ✗ ch-abc4: Rate limit (FAILED - timeout)               │    │
│         │  ! ch-abc5: Cache layer (test flaky)                    │    │
│         │  ✗ ch-abc6: Webhook (FAILED - dependency)               │    │
│         │                                                         │    │
│         ├─────────────────────────────────────────────────────────┤    │
│         │  [A] Approve all auto-approvable (17)                   │    │
│         │  [1-6] Review attention tasks individually              │    │
│         │  [S] Start new sprint   [Esc] Return to semi-auto       │    │
│         └─────────────────────────────────────────────────────────┘    │
│                                                                          │
│  08:30  User approves 17, redoes 4, rejects 2                           │
│  08:35  New sprint or semi-auto continues                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Scenario 4: Redo with Feedback

```
┌─────────────────────────────────────────────────────────────────────────┐
│ REDO WORKFLOW                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User selects Task-C in review panel                                 │
│  2. User presses [R] for Redo                                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ FEEDBACK FOR REDO                                   [ch-abc3]   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Task: Add rate limiting to API endpoints                       │   │
│  │  Previous iterations: 3                                         │   │
│  │                                                                  │   │
│  │  ═══ Quick Issues ═══ (press number to toggle)                  │   │
│  │  [ ] 1. Tests incomplete                                        │   │
│  │  [✓] 2. Code style issues                                       │   │
│  │  [ ] 3. Missing error handling                                  │   │
│  │  [ ] 4. Performance concerns                                    │   │
│  │  [✓] 5. Security issues                                         │   │
│  │                                                                  │   │
│  │  ═══ Custom Feedback ═══                                        │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ The rate limit value (1000) is hardcoded. It should come  │  │   │
│  │  │ from config. Also, add IP-based rate limiting, not just   │  │   │
│  │  │ user-based. See RFC 6585 for 429 response format.         │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  ═══ Redo Options ═══                                           │   │
│  │  ● Keep current changes (iterate on top)                        │   │
│  │  ○ Reset to before this task (fresh start)                      │   │
│  │  ○ Reset to checkpoint                                          │   │
│  │                                                                  │   │
│  │  ═══ Priority After Redo ═══                                    │   │
│  │  ○ Same (P1)                                                    │   │
│  │  ● Bump to P0 (review found issues)                             │   │
│  │  ○ Lower to P2                                                  │   │
│  │                                                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  [Enter] Submit & Queue Redo   [Esc] Cancel                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  3. Feedback saved to task                                              │
│                                                                          │
│  Beads update:                                                          │
│  bd update ch-abc3 --status=open --priority=P0                          │
│  # Feedback stored in .chorus/feedback/ch-abc3.json                     │
│                                                                          │
│  4. Task-C now in "open" with P0 priority                               │
│     Next available agent picks it up                                    │
│                                                                          │
│  5. Agent sees feedback in prompt:                                      │
│     ┌───────────────────────────────────────────────────────────────┐  │
│     │ ## Previous Review Feedback (Iteration 3)                     │  │
│     │                                                                │  │
│     │ The human reviewer identified these issues:                   │  │
│     │ - Code style issues                                           │  │
│     │ - Security issues                                             │  │
│     │                                                                │  │
│     │ Detailed feedback:                                            │  │
│     │ > The rate limit value (1000) is hardcoded. It should come   │  │
│     │ > from config. Also, add IP-based rate limiting, not just    │  │
│     │ > user-based. See RFC 6585 for 429 response format.          │  │
│     │                                                                │  │
│     │ Please address these concerns in this iteration.              │  │
│     └───────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feedback Persistence

### Feedback Storage

```
.chorus/
├── feedback/
│   ├── ch-abc1.json     # Feedback for task ch-abc1
│   ├── ch-abc3.json     # Feedback for task ch-abc3
│   └── ...
```

### Feedback Schema

```typescript
interface TaskFeedback {
  taskId: string;
  feedbackHistory: FeedbackEntry[];
}

interface FeedbackEntry {
  iteration: number;           // Which iteration was reviewed
  reviewedAt: number;          // Timestamp
  reviewedBy: string;          // "user" or future: "github:username"
  decision: 'approved' | 'redo' | 'rejected';

  // For redo
  quickIssues?: string[];      // Selected quick issues
  customFeedback?: string;     // User's detailed feedback
  redoOptions?: {
    resetTo: 'keep' | 'fresh' | 'checkpoint';
    priorityChange?: 'same' | 'bump' | 'lower';
  };

  // For reject
  rejectReason?: string;
}
```

### Feedback Injection

```typescript
// In PromptBuilder
function buildPromptWithFeedback(task: Task, feedback: TaskFeedback): string {
  const lastRedo = feedback.feedbackHistory
    .filter(f => f.decision === 'redo')
    .pop();

  if (!lastRedo) return basePrompt;

  return `${basePrompt}

## Previous Review Feedback (Iteration ${lastRedo.iteration})

The human reviewer identified these issues:
${lastRedo.quickIssues?.map(i => `- ${i}`).join('\n') || 'None specified'}

Detailed feedback:
${lastRedo.customFeedback ? `> ${lastRedo.customFeedback.split('\n').join('\n> ')}` : 'None provided'}

Please address these concerns in this iteration.
`;
}
```

---

## Auto-Approve Rules

### Rule Engine

```typescript
interface AutoApproveRules {
  enabled: boolean;

  // Quality gates
  requireAllTestsPass: boolean;     // Default: true
  requireNoLintErrors: boolean;     // Default: true
  requireNoTypeErrors: boolean;     // Default: true

  // Iteration limits
  maxIterations: number;            // Default: 3

  // Signal requirements
  requireSignalDone: boolean;       // Default: true
  rejectOnNeedsHelp: boolean;       // Default: true

  // Advanced
  requireMinCoverage?: number;      // e.g., 80
  requireNoSecurityWarnings?: boolean;
  customRules?: CustomRule[];
}

interface CustomRule {
  name: string;
  condition: string;  // JavaScript expression
  action: 'approve' | 'reject' | 'manual';
}
```

### Evaluation

```typescript
function evaluateAutoApprove(
  result: AgentResult,
  rules: AutoApproveRules,
  taskLabels: string[]
): AutoApproveDecision {
  // Check if task has review:required label
  if (taskLabels.includes('review:required')) {
    return { canAutoApprove: false, reason: 'Task requires manual review' };
  }

  // Check if task has review:skip label
  if (taskLabels.includes('review:skip')) {
    return { canAutoApprove: true, skipReview: true };
  }

  if (!rules.enabled) {
    return { canAutoApprove: false, reason: 'Auto-approve disabled' };
  }

  // Quality gates
  if (rules.requireAllTestsPass && !result.quality.allTestsPass) {
    return { canAutoApprove: false, reason: 'Tests failing' };
  }

  if (rules.requireNoLintErrors && result.quality.lintErrors > 0) {
    return { canAutoApprove: false, reason: `${result.quality.lintErrors} lint errors` };
  }

  if (rules.maxIterations && result.iterations > rules.maxIterations) {
    return { canAutoApprove: false, reason: `Exceeded ${rules.maxIterations} iterations` };
  }

  if (rules.requireSignalDone && result.signal?.status !== 'DONE') {
    return { canAutoApprove: false, reason: `Signal: ${result.signal?.status}` };
  }

  return { canAutoApprove: true };
}
```

---

## GitHub Integration (Future)

### Why GitHub?

- **Familiar workflow** - Developers know PR reviews
- **Rich diff viewing** - Side-by-side, syntax highlighting
- **Comment threading** - Line-level feedback
- **Review history** - Audit trail
- **Multi-reviewer** - Team collaboration

### How It Would Work

```
Agent completes Task-A
       │
       ▼
Create draft PR: chorus/ch-abc1-add-auth
       │
       ▼
Task-A → "reviewing" status
PR link stored in .chorus/reviews/ch-abc1.json
       │
       ▼
User reviews on GitHub
       │
       ├── Approve PR → Task-A closed, PR merged
       ├── Request changes → Task-A → open, comments as feedback
       └── Close PR → Task-A blocked
```

### Config for GitHub

```json
{
  "review": {
    "method": "github",

    "github": {
      "enabled": true,
      "repo": "owner/repo",
      "baseBranch": "main",
      "draftPR": true,
      "labelPrefix": "chorus:",
      "autoMergeOnApprove": true,
      "requiredReviewers": 1
    }
  }
}
```

### Hybrid Mode

```
Review method: hybrid

For each task:
├── Quick tasks (< 50 lines changed) → TUI review
├── Complex tasks (> 50 lines) → GitHub PR
└── Security tasks → Always GitHub PR
```

> **Note:** GitHub integration is a future enhancement. MVP uses TUI-only review.

---

## XState Integration

### Review Region

```typescript
const reviewRegion = {
  id: 'review',
  initial: 'inactive',

  context: {
    mode: 'batch' as ReviewMode,
    config: defaultReviewConfig,
    pendingReviews: [] as ReviewItem[],
    currentBatch: [] as ReviewItem[],
    sprint: null as SprintState | null,
  },

  states: {
    inactive: {
      // Review disabled (autopilot mode)
      on: {
        SET_REVIEW_MODE: {
          target: 'collecting',
          guard: 'isNotAutopilot',
        },
      },
    },

    collecting: {
      // Collecting completed tasks
      on: {
        TASK_COMPLETED: {
          actions: 'addToPendingReviews',
        },

        TRIGGER_REVIEW: 'pending',

        // Auto-trigger conditions
        '': [
          { target: 'pending', guard: 'batchFull' },
          { target: 'pending', guard: 'batchTimeout' },
          { target: 'pending', guard: 'sprintComplete' },
        ],
      },
    },

    pending: {
      // Review ready, waiting for user
      entry: 'notifyReviewPending',
      on: {
        START_REVIEW: 'reviewing',
        DISMISS: 'collecting',
      },
    },

    reviewing: {
      // User actively reviewing
      on: {
        APPROVE_TASK: { actions: 'approveTask' },
        REDO_TASK: { actions: 'redoTask' },
        REJECT_TASK: { actions: 'rejectTask' },

        FINISH_REVIEW: [
          { target: 'collecting', guard: 'hasMoreTasks' },
          { target: 'idle', guard: 'noMoreTasks' },
        ],
      },
    },

    idle: {
      // No pending reviews, waiting
      on: {
        TASK_COMPLETED: 'collecting',
      },
    },
  },
};
```

### Events

```typescript
type ReviewEvent =
  // Mode control
  | { type: 'SET_REVIEW_MODE'; mode: ReviewMode }
  | { type: 'UPDATE_REVIEW_CONFIG'; config: Partial<ReviewConfig> }

  // Task events (from orchestration region)
  | { type: 'TASK_COMPLETED'; taskId: string; result: AgentResult }
  | { type: 'TASK_FAILED'; taskId: string; error: Error }

  // Review triggers
  | { type: 'TRIGGER_REVIEW'; reason: ReviewTriggerReason }
  | { type: 'START_REVIEW' }
  | { type: 'FINISH_REVIEW' }
  | { type: 'DISMISS' }

  // Review actions
  | { type: 'APPROVE_TASK'; taskId: string }
  | { type: 'APPROVE_ALL_AUTO' }
  | { type: 'REDO_TASK'; taskId: string; feedback: ReviewFeedback }
  | { type: 'REJECT_TASK'; taskId: string; reason: string }

  // Sprint
  | { type: 'START_SPRINT'; target: SprintTarget }
  | { type: 'END_SPRINT' }
  | { type: 'PAUSE_SPRINT' };
```

---

## TUI Components

### Review Status Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ BATCH │ Collecting: 3/5 │ Reviewing: 0 │ Agents: 3 active       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔔 REVIEW PENDING │ 5 tasks ready │ Press [Enter] to review    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPRINT │ 14/47 tasks │ 2 failed │ Until 08:00 (6h 23m left)    │
└─────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `Shift+R` | Any | Open review mode selector |
| `Enter` | Review pending | Open batch review panel |
| `Space` | Batch review | Toggle approve for selected |
| `A` | Batch review | Approve all auto-approvable |
| `R` | Batch review | Redo selected with feedback |
| `X` | Batch review | Reject selected |
| `D` | Batch review | View diff for selected |
| `V` | Batch review | View logs for selected |
| `↑/↓` | Batch review | Navigate tasks |
| `Esc` | Batch review | Close panel |
| `Shift+S` | Any | Start sprint dialog |
| `P` | Sprint running | Pause sprint |
| `E` | Sprint running | End sprint early |

---

## Configuration Schema

```typescript
interface ReviewConfig {
  // Mode
  defaultMode: ReviewMode;

  // Batch settings
  batch: {
    size: number;           // Default: 5
    timeout: string;        // Default: "30m"
  };

  // Sprint settings
  sprint: {
    createCheckpoint: boolean;  // Default: true
    notifyOnComplete: boolean;  // Default: true
    pauseOnError: boolean;      // Default: false
  };

  // Auto-approve
  autoApproveRules: AutoApproveRules;

  // Label rules
  labelRules: Record<string, LabelRule>;
  priorityRules: Record<string, PriorityRule>;

  // Notifications
  notify: {
    sound: boolean;
    desktop: boolean;
    onPending: boolean;
    onSprintEnd: boolean;
    onError: boolean;
  };

  // GitHub (future)
  github?: GitHubConfig;
}
```

### Default Config

```json
{
  "review": {
    "defaultMode": "batch",

    "batch": {
      "size": 5,
      "timeout": "30m"
    },

    "sprint": {
      "createCheckpoint": true,
      "notifyOnComplete": true,
      "pauseOnError": false
    },

    "autoApproveRules": {
      "enabled": true,
      "requireAllTestsPass": true,
      "requireNoLintErrors": true,
      "requireNoTypeErrors": true,
      "maxIterations": 3,
      "requireSignalDone": true
    },

    "labelRules": {
      "review:required": { "mode": "per-task", "autoApprove": false },
      "review:auto": { "mode": "auto-continue", "autoApprove": true },
      "review:skip": { "mode": "skip" },
      "security": { "mode": "per-task", "autoApprove": false },
      "docs": { "mode": "skip" },
      "trivial": { "mode": "auto-continue" }
    },

    "priorityRules": {
      "P0": { "mode": "per-task", "notifyImmediately": true },
      "P1": { "mode": "batch" },
      "P2": { "mode": "auto-continue" }
    },

    "notify": {
      "sound": true,
      "desktop": true,
      "onPending": true,
      "onSprintEnd": true,
      "onError": true
    }
  }
}
```

---

## Implementation Tasks

### M13: Review System (New Milestone)

| Feature | Description | Deps | Tests |
|---------|-------------|------|-------|
| **FR01** | Review Types & Interfaces | - | 6 |
| **FR02** | Review Region Machine | FX03 | 16 |
| **FR03** | Auto-Approve Engine | FR01 | 10 |
| **FR04** | Batch Collector | FR02 | 8 |
| **FR05** | Sprint Controller | FR02, FR04 | 12 |
| **FR06** | Feedback Storage | FR01 | 6 |
| **FR07** | Feedback Injection | FR06, ch-wk8 | 6 |
| **FR08** | Review Panel TUI | FR02 | 14 |
| **FR09** | Batch Review List | FR08 | 10 |
| **FR10** | Feedback Modal | FR08, FR06 | 8 |
| **FR11** | Sprint Setup Dialog | FR05, FR08 | 8 |
| **FR12** | Mode Selector Dialog | FR02, FR08 | 6 |
| **FR13** | Review Status Bar | FR02 | 4 |
| **FR14** | Review Keyboard Handlers | FR08, ch-89dk | 10 |
| **FR15** | Beads Status Integration | FR02 | 6 |
| **FR16** | Label Rules Engine | FR01, FR03 | 8 |
| **FR17** | Review Config Integration | FR01, ch-sro | 6 |
| **FR18** | Review Notifications | FR02, FR05 | 4 |
| **FR19** | Review Persistence | FR02, FX05 | 6 |

**Total: 19 tasks, ~154 tests**

### Dependency Graph

```
FR01 (Types)
  │
  ├── FR02 (Machine) ───┬── FR03 (Auto-Approve) ─── FR16 (Label Rules)
  │                     │
  │                     ├── FR04 (Batch) ────────── FR05 (Sprint)
  │                     │                                │
  │                     ├── FR19 (Persistence)           │
  │                     │                                │
  │                     └── FR15 (Beads Status)          │
  │                                                      │
  ├── FR06 (Feedback Storage) ── FR07 (Injection)        │
  │                                                      │
  ├── FR08 (Panel) ─────┬── FR09 (Batch List)           │
  │                     │                                │
  │                     ├── FR10 (Feedback Modal) ───────┤
  │                     │                                │
  │                     ├── FR11 (Sprint Dialog) ────────┘
  │                     │
  │                     ├── FR12 (Mode Selector)
  │                     │
  │                     └── FR14 (Keyboard)
  │
  ├── FR13 (Status Bar)
  │
  ├── FR17 (Config)
  │
  └── FR18 (Notifications)
```

---

## Open Questions

1. **Beads "reviewing" status** - Native support or label workaround?
2. **Notification method** - Terminal bell? macOS notification? Webhook?
3. **Diff viewer** - Inline TUI or external tool (delta, diff-so-fancy)?
4. **GitHub integration timeline** - MVP or future milestone?
5. **Team review** - Multiple reviewers for same sprint? (Future)

---

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 36 | **Non-blocking review** | Agent ve user paralel çalışır |
| 37 | **"reviewing" status in Beads** | Kanban visibility, clear state |
| 38 | **Labels for task-level config** | Beads native, simple, flexible |
| 39 | **Config rules (label + priority)** | Centralized, no per-task hardcode |
| 40 | **Feedback files (.chorus/feedback/)** | Persistent, survives crash |
| 41 | **Auto-approve engine** | Reduce review burden |
| 42 | **Sprint checkpoints** | Safety for overnight runs |
| 43 | **GitHub deferred to future** | MVP focuses on TUI |

---

## Version History

- **v2.0 (2026-01-12):** Architecture refinement
  - REFINED: Non-blocking review as core design principle
  - ADDED: Beads "reviewing" status integration
  - ADDED: Task-level configuration via labels
  - ADDED: Label and priority rules engine
  - ADDED: Detailed workflow scenarios (4 scenarios)
  - ADDED: Feedback persistence and injection
  - ADDED: GitHub integration design (future)
  - EXPANDED: 19 implementation tasks (~154 tests)

- **v1.0 (2026-01-12):** Initial design
  - NEW FEATURE: Agent Work Review System
  - 5 review modes (per-task, batch, sprint, auto-continue, skip)
  - XState review region as parallel state
  - Feedback system with prompt injection
  - 14 implementation tasks
