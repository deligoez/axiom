# Review and Retrospective

Human review (optional) and automatic retrospective after each Blue completion.

---

## Two Systems

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| **Review** | Green completion | Human | Quality check, approve/reject |
| **Retrospective** | Blue completion | Pat | Learn, update plan, check Black |

---

## Review System

Review runs asynchronously without blocking agent work.

```
Green idea completes
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
│  Green as it         "review",           if quality          review     │
│  completes           user reviews        checks pass         entirely   │
│                      when ready                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior | Best For |
|------|----------|----------|
| `per-task` | Status bar flashes, immediate attention | Security, architecture |
| `batch` | Collect in review, user reviews when ready | Normal workflow (default) |
| `auto-approve` | Auto-approve if quality checks pass | Low-risk, well-tested |
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

Greens auto-approve when ALL conditions met:
- Iterations <= `maxIterations` (default: 3)
- All quality commands pass
- No BLOCKED or NEEDS_HUMAN signals
- Idea tags don't require review

---

## Review Actions

| Action | Effect |
|--------|--------|
| Approve | Green → merge queue |
| Request changes | Green → back to agent with feedback |
| Skip | Green → skip review, don't merge |
| Defer | Green → review later |

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
| Reset to before this idea | Fresh start with feedback |
| Reset to checkpoint | Rollback to specific checkpoint |

### Selection Hint After Redo

| Hint | Effect |
|------|--------|
| Normal | No special priority |
| Add 'next' tag | Prioritize in next selection |
| Add 'later' tag | Deprioritize |

---

## Feedback Storage

Feedback persisted in `.swarm/feedback/`:

```
.swarm/feedback/
├── idea-001.json
├── idea-003.json
└── ...
```

### Feedback Format

```go
type IdeaFeedback struct {
    IdeaID  string          `json:"ideaId"`
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

When agent picks up redo idea:

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

Override review mode by idea label:

```json
"labelRules": {
  "security": { "mode": "per-task", "autoApprove": false },
  "docs": { "mode": "skip" },
  "trivial": { "mode": "auto-approve" }
}
```

Idea with `security` tag always requires per-task review.

---

## Retrospective System

Retrospective runs automatically when a Blue idea completes (all its Greens are done and merged).

### Retrospective Flow

```
Blue completes (all Greens done)
     │
     ▼
Pat triggered for Retrospective
     │
     ▼
Query Yellow ideas from this Blue
     │
     ▼
Check impact on Black idea
     │
     ├── Black satisfied? ──► Project complete 🎉
     │
     ├── Partially satisfied ──► Continue to next Blue
     │
     └── Not satisfied ──► Add new Gray ideas if needed
          │
          ▼
Update dependency tree
     │
     ▼
Revise remaining Gray ideas based on learnings
     │
     ▼
Retrospective complete
```

### Pat's Retrospective Actions

1. **Query Yellow Ideas**: Read all learnings (Yellow ideas) from this Blue's Greens
2. **Check Black Impact**: Does completed Blue satisfy original need?
3. **Revise Grays**: Update remaining Gray ideas based on learnings
4. **Update Dependencies**: Adjust dependency tree if needed
5. **Create New Ideas**: Add new Grays if gaps discovered

---

## Sprint Planning

Configuration wrapper for batch execution. Sprint planning provides a Web UI panel to configure target and settings before starting autopilot.

### Sprint Targets

| Target | Description |
|--------|-------------|
| `count` | Run N Greens then stop |
| `duration` | Run for N hours then stop |
| `until_time` | Run until specific time |
| `no_ready` | Run until no ready Greens |

---

## Sprint Configuration

```json
{
  "sprint": {
    "target": {
      "type": "count",
      "value": 10
    },
    "filters": {
      "includeBlues": ["idea-015"],
      "excludeTags": ["later"]
    },
    "options": {
      "checkpointBefore": true,
      "pauseOnError": false,
      "batchReview": true
    }
  }
}
```

### Sprint Settings

| Setting | Config Key | Default | Description |
|---------|------------|---------|-------------|
| Max iterations | `completion.maxIterations` | 50 | Max iterations per idea |
| Idea timeout | `agents.timeoutMinutes` | 30 min | Timeout per idea |
| Stuck detection | - | 5 iterations | Alert if no git commits |
| Error threshold | - | 3 consecutive | Pause if 3 errors in a row |

---

## Sprint Statistics

Sprint data stored in `.swarm/sprints.jsonl`:

```go
type SprintStats struct {
    ID        string       `json:"id"`
    StartedAt int64        `json:"startedAt"`
    EndedAt   *int64       `json:"endedAt"` // nil if still running
    Target    SprintTarget `json:"target"`

    // Idea counts
    TotalIdeas     int `json:"totalIdeas"`
    CompletedIdeas int `json:"completedIdeas"`
    FailedIdeas    int `json:"failedIdeas"`
    ReviewingIdeas int `json:"reviewingIdeas"`

    // Per-idea stats (for analytics)
    IdeaStats []IdeaStat `json:"ideaStats"`

    // Settings used
    Settings SprintSettings `json:"settings"`
}

type IdeaStat struct {
    IdeaID         string `json:"ideaId"`
    StartedAt      int64  `json:"startedAt"`
    CompletedAt    int64  `json:"completedAt"`
    Iterations     int    `json:"iterations"`
    QualityPassed  bool   `json:"qualityPassed"`
    ReviewDecision string `json:"reviewDecision,omitempty"` // "approved", "redo", "rejected"
}

type SprintSettings struct {
    MaxIterations int  `json:"maxIterations"`
    IdeaTimeout   int  `json:"ideaTimeout"`
    PauseOnStuck  bool `json:"pauseOnStuck"`
    PauseOnErrors bool `json:"pauseOnErrors"`
}
```

---

## State machine Sprint Region

```
sprint:
├── idle
│   on: OPEN_SPRINT_PANEL → configuring
│
├── configuring
│   on: START_SPRINT → running (if hasValidTarget)
│       actions: createCheckpoint, initializeSprintStats
│       CANCEL → idle
│
├── running
│   entry: notifySprintStarted
│   on: IDEA_COMPLETED → updateSprintStats
│       IDEA_FAILED → updateSprintStats
│       TARGET_REACHED → completing
│       PAUSE_SPRINT → paused
│       CANCEL_SPRINT → idle (saveSprintStats)
│   always: → completing (if isTargetReached)
│
├── paused
│   on: RESUME_SPRINT → running
│       CANCEL_SPRINT → idle (saveSprintStats)
│
└── completing
    entry: saveSprintStats, notifySprintCompleted
    always: → idle
```

---

## Sprint Lifecycle

```
Sprint Start
     │
     ▼
Create checkpoint (if enabled)
     │
     ▼
Switch to autopilot
     │
     ▼
Run until target met
     │
     ├── Target met ──► Stop
     │
     ├── Error (if pauseOnError) ──► Pause
     │
     └── No ready Greens ──► Stop
          │
          ▼
Batch review (if enabled)
     │
     ▼
Sprint complete
```

---

## State machine Review Region

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

## State machine Retrospective Events

Retrospective triggered via State machine events:

```
on:
  BLUE_COMPLETED:
    actions: queueRetrospective
  RETROSPECTIVE_START:
    invoke: patRetrospective
  RETROSPECTIVE_DONE:
    actions: [updateGrays, checkBlackSatisfaction]
```
