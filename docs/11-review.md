# Review and Debrief

Human review (optional) and automatic Debrief after each Operation completion.

---

## Two Systems

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| **Review** | Task completion | Human | Quality check, approve/reject |
| **Debrief** | Operation completion | Axel | Learn, update plan, check Directive |

---

## Review System

Review runs asynchronously without blocking agent work.

```
Task completes
     │
     ▼
Queue for review
     │
     ├── Auto-approve criteria met ──► Skip review ──► Merge
     │
     └── Needs review ──► Add to review queue
                               │
                               ▼
                         Human reviews
                               │
                               ├── Approve ──► Merge
                               │
                               └── Request changes ──► Back to agent
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
│  Task as it          "review",           if verification     review     │
│  completes           user reviews        checks pass         entirely   │
│                      when ready                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior | Best For |
|------|----------|----------|
| `per-task` | Status bar flashes, immediate attention | Security, architecture |
| `batch` | Collect in review, user reviews when ready | Normal workflow (default) |
| `auto-approve` | Auto-approve if verification checks pass | Low-risk, well-tested |
| `skip` | Skip review, go directly to done | Docs, trivial changes |

> **Note:** All modes except `skip` are non-blocking.

### Configuration

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

---

## Auto-Approve Criteria

Tasks auto-approve when ALL conditions met:
- Iterations <= `maxIterations` (default: 3)
- All verification commands pass
- No BLOCKED or PENDING signals
- Case tags don't require review

---

## Review Actions

| Action | Effect |
|--------|--------|
| Approve | Task → integration queue |
| Request changes | Task → back to agent with feedback |
| Skip | Task → skip review, don't merge |
| Defer | Task → review later |

Feedback from "request changes" is injected into agent's next iteration prompt.

---

## Redo with Feedback

When requesting changes, user provides structured feedback:

### Quick Issues (predefined)

- Tests incomplete
- Code style issues
- Missing error handling
- Performance concerns
- Security issues

### Custom Feedback

Free-form text describing what needs to change.

### Redo Options

| Option | Description |
|--------|-------------|
| Keep current changes | Iterate on top of existing work |
| Reset to before this Task | Fresh start with feedback |
| Reset to checkpoint | Rollback to specific checkpoint |

### Selection Hint After Redo

| Hint | Effect |
|------|--------|
| Normal | No special priority |
| Add 'next' tag | Prioritize in next selection |
| Add 'later' tag | Deprioritize |

---

## Feedback Storage

Feedback persisted in `.axiom/feedback/`:

```
.axiom/feedback/
├── task-001.json
├── task-003.json
└── ...
```

### Feedback Format

```go
type TaskFeedback struct {
    TaskID  string          `json:"taskId"`
    History []FeedbackEntry `json:"history"`
}

type FeedbackEntry struct {
    Iteration      int      `json:"iteration"`
    Timestamp      int64    `json:"timestamp"`
    Decision       string   `json:"decision"`       // "approved", "redo", "rejected"
    QuickIssues    []string `json:"quickIssues,omitempty"`
    CustomFeedback string   `json:"customFeedback,omitempty"`
    RedoOption     string   `json:"redoOption,omitempty"`     // "keep", "fresh", "checkpoint"
    SelectionHint  string   `json:"selectionHint,omitempty"`  // "normal", "next", "later"
    RejectReason   string   `json:"rejectReason,omitempty"`
}
```

### Feedback Injection

When agent picks up redo Task:

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

## Per-Label Rules

Override review mode by case label:

```json
"labelRules": {
  "security": { "mode": "per-task", "autoApprove": false },
  "docs": { "mode": "skip" },
  "trivial": { "mode": "auto-approve" }
}
```

Case with `security` tag always requires per-task review.

### Label Precedence

When a case has multiple labels, the **most restrictive** rule wins:

**Restrictiveness order (most → least):**
1. `per-task` + `autoApprove: false` (requires human review)
2. `per-task` + `autoApprove: true` (allows auto-approve)
3. `batch` (default - batched review)
4. `auto-approve` (automatic approval)
5. `skip` (no review)

**Example:**

Case has labels: `["security", "trivial"]`

```
labelRules:
  security: { mode: "per-task", autoApprove: false }  ← Most restrictive
  trivial: { mode: "auto-approve" }

Result: per-task with autoApprove: false (security wins)
```

**Resolution algorithm:**

```
resolveReviewMode(case):
  matchedRules = []
  for label in case.labels:
    if label in labelRules:
      matchedRules.append(labelRules[label])

  if matchedRules.length == 0:
    return defaultMode

  // Sort by restrictiveness, return most restrictive
  return mostRestrictive(matchedRules)
```

**Priority ties:** If two labels have equal restrictiveness, alphabetically first label wins.

---

## Debrief System

Debrief runs automatically when an Operation completes (all its Tasks are done and merged).

### Debrief Flow

```
Operation completes (all Tasks done)
     │
     ▼
Axel triggered for Debrief
     │
     ▼
Query Discovery cases from this Operation
     │
     ▼
Check impact on Directive case
     │
     ├── Directive satisfied? ──► Project complete 🎉
     │
     ├── Partially satisfied ──► Continue to next Operation
     │
     └── Not satisfied ──► Add new Draft cases if needed
          │
          ▼
Update dependency tree
     │
     ▼
Revise remaining Draft cases based on discoveries
     │
     ▼
Debrief complete
```

### Axel's Debrief Actions

1. **Query Discovery Cases**: Read all discoveries from this Operation's Tasks
2. **Check Directive Impact**: Does completed Operation satisfy original need?
3. **Revise Drafts**: Update remaining Draft cases based on discoveries
4. **Update Dependencies**: Adjust dependency tree if needed
5. **Create New Cases**: Add new Drafts if gaps discovered

---

## State Machine Review Region

Review managed in State machine:

```
review region:
├── idle
│   on: QUEUE_REVIEW → queued
├── queued
│   on: START_REVIEW → reviewing
├── reviewing
│   on:
│     APPROVE → idle
│     REQUEST_CHANGES → idle
│     SKIP → idle
└── batchReview
    on:
      APPROVE_ALL → idle
      REVIEW_NEXT → reviewing
```

Non-blocking: agents continue while review queue fills.

---

## State machine Debrief Events

Debrief triggered via State machine events:

```
on:
  OPERATION_COMPLETED:
    actions: queueDebrief
  DEBRIEF_START:
    invoke: axelDebrief
  DEBRIEF_DONE:
    actions: [updateDrafts, checkDirectiveSatisfaction]
```
