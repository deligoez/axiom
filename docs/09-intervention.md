# Intervention and Rollback

Human intervention controls and crash recovery mechanisms.

---

## Intervention Actions

The Intervention Panel provides quick actions for controlling agents and managing state.

### Pause

Pauses all agents at Checkpoints:
1. Stop spawning new agents
2. Let running iterations complete
3. Hold at iteration boundary
4. Resume when ready

### Stop Agent

Stops selected agent immediately:
1. Kill agent process
2. Task status → pending
3. Preserve workspace (for debugging)
4. Free slot

### Redirect

Changes agent to different Task:
1. Stop current work
2. Commit any changes (WIP)
3. Select new Task
4. Continue in same workspace or create new

### Create Checkpoint

Saves current state for rollback:
1. Tag current commit
2. Snapshot State machine
3. Record case states
4. Store in `.axiom/checkpoints/`

---

## Checkpoint System

### Automatic Checkpoints

| Trigger | Config | Description |
|---------|--------|-------------|
| Periodic | `checkpoints.periodic: 5` | Every N completed Tasks |
| Before autopilot | `checkpoints.beforeAutopilot: true` | Safety snapshot |

### Manual Checkpoints

User can create named checkpoints via Web UI dialog.

### Checkpoint Storage

```
.axiom/checkpoints/
├── before-autopilot-2026-01-13T10-00-00.json
├── after-task-003-2026-01-13T11-00-00.json
└── before-auth-refactor-2026-01-13T12-00-00.json
```

### Checkpoint Data

```json
{
  "name": "before-auth-refactor",
  "createdAt": "2026-01-13T12:00:00Z",
  "gitCommit": "abc123",
  "caseStates": {
    "task-001": "done",
    "task-002": "active",
    "task-003": "pending"
  },
  "stateSnapshot": { ... },
  "agentStates": [
    { "id": "echo-001", "taskId": "task-002", "iteration": 5 }
  ]
}
```

---

## Rollback

### Rollback Flow

```
Select checkpoint
     │
     ▼
Confirm dialog
     │
     ▼
Stop all agents
     │
     ▼
Git reset to checkpoint commit
     │
     ▼
Restore case states
     │
     ▼
Restore State machine snapshot
     │
     ▼
Clean up orphaned workspaces
     │
     ▼
Resume operation
```

Rollback confirmation shows what will be lost (in-progress Tasks, completed work since checkpoint).

---

## Crash Recovery

### State machine Persistence

```
.axiom/state/
├── snapshot.json     # Primary: full actor state
└── events.jsonl      # Fallback: event log
```

### Recovery Strategy

```
recover():
  try:
    // Primary: Snapshot restore (fast)
    snapshot = load('snapshot.json')
    actor = createActor(machine, { snapshot })

    if actor.status != 'active':
      throw Error('Snapshot invalid')

    return actor

  catch:
    // Fallback: Event replay (reliable)
    events = load('events.jsonl').lines()
    actor = createActor(machine)

    for event in events:
      actor.send(event)

    return actor
```

### What's Recovered

| Data | Method | Completeness |
|------|--------|--------------|
| State machine context | Snapshot | Full |
| Agent states | Snapshot | Full |
| Case states | JSONL | Full |
| Workspaces | Git | Full |
| Agent memory | Lost | None |

---

## Task Recovery

### Orphaned Tasks

Tasks in "active" state with no running agent:

```
recoverOrphanedTasks():
  orphaned = caseStore.list({ type: 'task', status: 'active' })

  for task in orphaned:
    caseStore.audit(task.id, 'crash_recovery')
    caseStore.update(task.id, {
      status: 'pending',
      execution: {
        retryCount: task.execution.retryCount + 1
      }
    })
```

### Retry Context

When retried Task is claimed, audit log injected into prompt with previous attempt details.

### Recovery Context Injection

```go
type RecoveryContext struct {
    PreviousAttempts   int          `json:"previousAttempts"`
    AuditLog           []AuditEntry `json:"auditLog"`
    WorkspaceHasChanges bool        `json:"workspaceHasChanges"`
    Instruction        string       `json:"instruction"` // "Previous attempt crashed. Review log."
}

type AuditEntry struct {
    Timestamp string       `json:"timestamp"`
    Event     string       `json:"event"` // "start", "iteration", "signal", "crash"
    Details   AuditDetails `json:"details"`
}

type AuditDetails struct {
    FilesModified []string    `json:"filesModified,omitempty"`
    TestStatus    *TestStatus `json:"testStatus,omitempty"`
    LastCommit    string      `json:"lastCommit,omitempty"`
    Error         string      `json:"error,omitempty"`
}

type TestStatus struct {
    Passed int `json:"passed"`
    Failed int `json:"failed"`
}
```

Injected into agent prompt:

```markdown
## Recovery Context

This Task was previously attempted but crashed.

**Previous attempts:** 2
**Workspace has uncommitted changes:** Yes

### Last Attempt Log
- Started: 2026-01-15T10:00:00Z
- Files modified: src/auth.ts, src/auth.test.ts
- Tests: 4/6 passing
- Last commit: abc123 "feat: add auth module"
- Crashed during iteration 5

Please review the workspace state and continue from where the previous attempt left off.
```

---

## Emergency Stop

`Ctrl+C` triggers graceful shutdown:

1. Stop accepting new Tasks
2. Signal agents to pause
3. Wait for Checkpoints (5s timeout)
4. Persist State machine snapshot
5. Exit cleanly

Second `Ctrl+C` forces immediate exit without graceful shutdown.
