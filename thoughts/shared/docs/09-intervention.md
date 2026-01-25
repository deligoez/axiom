# Intervention and Rollback

Human intervention controls and crash recovery mechanisms.

---

## Intervention Actions

The Intervention Panel provides quick actions for controlling agents and managing state.

### Pause

Pauses all agents at safe boundaries:
1. Stop spawning new agents
2. Let running iterations complete
3. Hold at iteration boundary
4. Resume when ready

### Stop Agent

Stops selected agent immediately:
1. Kill agent process
2. Idea status → pending
3. Preserve worktree (for debugging)
4. Free slot

### Redirect

Changes agent to different idea:
1. Stop current work
2. Commit any changes (WIP)
3. Select new idea
4. Continue in same worktree or create new

### Create Checkpoint

Saves current state for rollback:
1. Tag current commit
2. Snapshot State machine
3. Record idea states
4. Store in `.swarm/checkpoints/`

---

## Checkpoint System

### Automatic Checkpoints

| Trigger | Config | Description |
|---------|--------|-------------|
| Periodic | `checkpoints.periodic: 5` | Every N completed ideas |
| Before autopilot | `checkpoints.beforeAutopilot: true` | Safety snapshot |

### Manual Checkpoints

User can create named checkpoints via Web UI dialog.

### Checkpoint Storage

```
.swarm/checkpoints/
├── before-autopilot-2026-01-13T10-00-00.json
├── after-idea-003-2026-01-13T11-00-00.json
└── before-auth-refactor-2026-01-13T12-00-00.json
```

### Checkpoint Data

```json
{
  "name": "before-auth-refactor",
  "createdAt": "2026-01-13T12:00:00Z",
  "gitCommit": "abc123",
  "ideaStates": {
    "idea-001": "done",
    "idea-002": "active",
    "idea-003": "pending"
  },
  "stateSnapshot": { ... },
  "agentStates": [
    { "id": "ed-001", "ideaId": "idea-002", "iteration": 5 }
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
Restore idea states
     │
     ▼
Restore State machine snapshot
     │
     ▼
Clean up orphaned worktrees
     │
     ▼
Resume operation
```

Rollback confirmation shows what will be lost (in-progress ideas, completed work since checkpoint).

---

## Crash Recovery

### State machine Persistence

```
.swarm/state/
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
| Idea states | JSONL | Full |
| Worktrees | Git | Full |
| Agent memory | Lost | None |

---

## Hooks System

User-defined hooks allow custom scripts to run at key lifecycle events.

### Hook File Structure

```
.swarm/hooks/
├── pre-start.sh               # Before agent starts idea
├── post-complete.sh           # After idea completes
├── pre-merge.sh               # Before branch merge
├── post-merge.sh              # After successful merge
├── on-conflict.sh             # When merge conflict detected
├── on-learning.sh             # When learning extracted
├── on-pause.sh                # When session paused
└── on-error.sh                # When error occurs
```

### Hook Events

| Hook | Trigger | Variables |
|------|---------|-----------|
| `pre-start` | Agent claims idea | IDEA_ID, AGENT, WORKTREE |
| `post-complete` | Idea done/failed | IDEA_ID, AGENT, STATUS, DURATION |
| `pre-merge` | Before merge attempt | IDEA_ID, BRANCH, TARGET |
| `post-merge` | After successful merge | IDEA_ID, COMMIT_HASH |
| `on-conflict` | Merge conflict detected | IDEA_ID, FILES, LEVEL |
| `on-learning` | Learning extracted | LEARNING_ID, SCOPE, CONTENT |
| `on-pause` | Session paused | REASON, RUNNING_IDEAS |
| `on-error` | Error occurred | ERROR_TYPE, MESSAGE, IDEA_ID |

### Hook Interface

```bash
#!/bin/bash
# .swarm/hooks/post-complete.sh

# Environment variables available:
# SWARM_IDEA_ID     - Idea ID (e.g., idea-001)
# SWARM_AGENT       - Agent name (e.g., ed-001)
# SWARM_STATUS      - Completion status (done, failed)
# SWARM_DURATION    - Duration in seconds
# SWARM_BRANCH      - Git branch name

# Example: Notify on completion
if [ "$SWARM_STATUS" = "done" ]; then
  echo "Idea $SWARM_IDEA_ID completed by $SWARM_AGENT"
  # notify-send "Swarm: $SWARM_IDEA_ID done"
fi
```

### Hook Configuration

```json
{
  "hooks": {
    "post-complete": "scripts/notify-slack.sh",
    "pre-merge": "scripts/run-e2e.sh"
  }
}
```

### Hook Timeout

Hooks have a default timeout of 30 seconds. If a hook doesn't complete, Swarm logs a warning and continues.

---

## Idea Recovery

### Orphaned Ideas

Ideas in "active" state with no running agent:

```
recoverOrphanedIdeas():
  orphaned = ideaStore.list({ status: 'active' })

  for idea in orphaned:
    ideaStore.audit(idea.id, 'crash_recovery')
    ideaStore.update(idea.id, {
      status: 'pending',
      execution: {
        retryCount: idea.execution.retryCount + 1
      }
    })
```

### Retry Context

When retried idea is claimed, audit log injected into prompt with previous attempt details.

### Recovery Context Injection

```go
type RecoveryContext struct {
    PreviousAttempts   int          `json:"previousAttempts"`
    AuditLog           []AuditEntry `json:"auditLog"`
    WorktreeHasChanges bool         `json:"worktreeHasChanges"`
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

This idea was previously attempted but crashed.

**Previous attempts:** 2
**Worktree has uncommitted changes:** Yes

### Last Attempt Log
- Started: 2026-01-15T10:00:00Z
- Files modified: src/auth.ts, src/auth.test.ts
- Tests: 4/6 passing
- Last commit: abc123 "feat: add auth module"
- Crashed during iteration 5

Please review the worktree state and continue from where the previous attempt left off.
```

---

## Emergency Stop

`Ctrl+C` triggers graceful shutdown:

1. Stop accepting new ideas
2. Signal agents to pause
3. Wait for safe boundaries (5s timeout)
4. Persist State machine snapshot
5. Exit cleanly

Second `Ctrl+C` forces immediate exit without graceful shutdown.
