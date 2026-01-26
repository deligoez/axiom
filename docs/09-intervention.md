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

### Checkpoint Retention Policy

Checkpoints are automatically cleaned up based on configured limits:

**Config Options:**
```json
{
  "checkpoints": {
    "periodic": 5,
    "beforeAutopilot": true,
    "maxCount": 50,
    "maxAgeDays": 30,
    "protectNamed": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `maxCount` | 50 | Maximum number of checkpoints to keep |
| `maxAgeDays` | 30 | Delete checkpoints older than N days |
| `protectNamed` | true | Keep user-named checkpoints regardless of age |

**Automatic Cleanup:**

```
On new checkpoint creation:
     │
     ▼
Count checkpoints
     │
     ├── count > maxCount ──► Delete oldest (non-protected)
     │
     └── Check ages
              │
              └── age > maxAgeDays ──► Delete (non-protected)
```

**Protection Rules:**
| Checkpoint Type | Protected? |
|-----------------|------------|
| Auto (periodic) | No |
| Auto (before-autopilot) | No |
| User-named | Yes (if `protectNamed: true`) |
| Last 3 checkpoints | Always |

**Manual Cleanup:**

Web UI provides checkpoint management:
```
┌─────────────────────────────────────────────────────────────────┐
│                   Checkpoint Manager                             │
│                                                                  │
│  Checkpoints (47/50):                     Space: 234MB           │
│                                                                  │
│  ✓ before-auth-refactor (named)           12MB    [Rollback]     │
│  □ after-task-042                          8MB    [Delete]       │
│  □ after-task-041                          8MB    [Delete]       │
│  ...                                                             │
│                                                                  │
│  [Delete Selected]  [Delete All > 7 days]  [Compact]             │
└─────────────────────────────────────────────────────────────────┘
```

**CLI Cleanup:**
```bash
# Delete checkpoints older than 7 days
axiom checkpoints cleanup --older-than 7d

# Keep only last 10 checkpoints
axiom checkpoints cleanup --keep 10

# Delete specific checkpoint
axiom checkpoints delete before-autopilot-2026-01-13
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

### Event Log Validation

When loading `events.jsonl`, AXIOM validates each line:

```
Load events.jsonl
     │
     ▼
For each line:
     │
     ├── Valid JSON? ──No──► Mark line as corrupted
     │         │
     │        Yes
     │         │
     │         ▼
     │     Valid event schema?
     │         │
     │        No ──► Mark line as corrupted
     │        Yes
     │         │
     │         ▼
     │     Add to valid events
     │
     ▼
Replay valid events only
```

### Corrupted Event Log Recovery

When `events.jsonl` is corrupted (e.g., truncated during crash):

```
Both snapshot and events corrupted:
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Recovery Options                               │
│                                                                  │
│  Snapshot: INVALID (checksum mismatch)                           │
│  Events: PARTIAL (342/400 lines valid, 58 corrupted)             │
│                                                                  │
│  Options:                                                        │
│  [P] Partial recovery - Replay 342 valid events                  │
│      └─ Warning: May lose recent state changes                   │
│                                                                  │
│  [B] Restore from backup - Use events.jsonl.backup               │
│      └─ Backup age: 2 hours ago                                  │
│                                                                  │
│  [C] Reconstruct from cases.jsonl                                │
│      └─ Case states preserved, agent states lost                 │
│                                                                  │
│  [F] Fresh start - Begin with empty state                        │
│      └─ All state lost, cases preserved                          │
└─────────────────────────────────────────────────────────────────┘
```

**Recovery Priority:**
1. **Partial replay** - Replay valid prefix of events
2. **Backup restore** - Use `events.jsonl.backup` if recent
3. **Case reconstruction** - Rebuild from `cases.jsonl`
4. **Fresh start** - Last resort, preserves cases but loses orchestration state

### Event Log Backup

AXIOM maintains rolling backups:

```json
{
  "state": {
    "eventLogBackupInterval": 300,
    "eventLogBackupCount": 3
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `eventLogBackupInterval` | 300 | Seconds between backups |
| `eventLogBackupCount` | 3 | Number of backups to keep |

**Backup files:**
```
.axiom/state/
├── events.jsonl            # Active log
├── events.jsonl.backup     # Latest backup
├── events.jsonl.backup.1   # Previous backup
└── events.jsonl.backup.2   # Oldest backup
```

### Error Codes

| Code | Cause | Recovery |
|------|-------|----------|
| `EVENT_LOG_CORRUPTED` | Invalid JSON lines | Partial replay |
| `EVENT_LOG_TRUNCATED` | Incomplete last line | Skip last line |
| `EVENT_SCHEMA_INVALID` | Event doesn't match schema | Skip event |
| `RECOVERY_FAILED` | All recovery methods failed | Fresh start |

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

## Planning Crash Recovery

If AXIOM crashes during planning phase:

### Planning State Persistence

Planning state is continuously persisted to `.axiom/planning-state.json`:

```json
{
  "status": "planning",
  "phase": "decompose",
  "directiveCase": { "id": "case-001", "jtbd": "..." },
  "clarifications": [...],
  "proposals": [{ "version": 1, "approved": true }, ...],
  "partialCases": {
    "created": ["op-001", "op-002", "op-003"],
    "pending": ["op-004", "op-005"]
  },
  "lastCheckpoint": "2026-01-15T10:30:00Z"
}
```

### Recovery Flow

```
AXIOM restarts after crash
     │
     ▼
┌─────────────────────────┐
│ Load planning-state.json│
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │ Was in      │
     │ planning?   │
     └──────┬──────┘
            │
      Yes   │   No
            │
     ┌──────┴──────────────────┐
     │ Planning Recovery       │
     │ Options:                │
     │ [R] Resume from phase   │
     │ [S] Start planning over │
     │ [K] Keep cases, skip    │
     └─────────────────────────┘
```

### Recovery Options

| Option | Description | Effect |
|--------|-------------|--------|
| **Resume** | Continue from last phase | Axel resumes from saved state |
| **Start Over** | Restart planning | Archive partial cases, begin fresh |
| **Keep and Skip** | Accept partial work | Mark created cases as ready, skip planning |

### Phase-Specific Recovery

| Crashed During | Recovery Behavior |
|----------------|-------------------|
| **UNDERSTAND** | Resume Q&A (clarifications preserved) |
| **ANALYZE** | Re-run analysis (fast, no user input needed) |
| **PROPOSE** | Resume with last proposal version |
| **DECOMPOSE** | Resume case generation from `partialCases.pending` |
| **VALIDATE** | Resume validation loop |

### Partial Case Handling

When crash occurs during DECOMPOSE with partial cases:

```
Created before crash:     Pending (not created):
├── op-001 (complete)     ├── op-004 (in partialCases.pending)
├── op-002 (complete)     └── op-005 (in partialCases.pending)
└── op-003 (complete)

Recovery options:
1. Resume: Create op-004, op-005, then validate all
2. Start Over: Archive op-001..003, begin fresh
3. Keep and Skip: Validate op-001..003 only, proceed to implementation
```

### Non-Interactive Recovery

With `--non-interactive` or in CI:
1. If < 50% cases created: Start over
2. If >= 50% cases created: Keep and skip
3. Log decision for audit

See [03-planning.md](./03-planning.md#planning-state) for planning state details and phase descriptions.

---

## Config Recovery

If `config.json` is corrupted at startup:

1. AXIOM attempts to load `config.json.backup`
2. If backup exists and is valid, uses it (logs `CONFIG_BACKUP_RESTORED`)
3. If no valid backup, offers recovery options:
   - Restore from backup
   - Reset to defaults
   - Quit and fix manually

See [01-configuration.md](./01-configuration.md#config-validation-and-recovery) for details.

---

## Disk Space Recovery

When Monitor Max detects critically low disk space:

### Automatic Cleanup

```
Max detects disk < 500MB
     │
     ▼
Pause agent spawning
     │
     ▼
Auto-cleanup triggers:
├── Remove merged workspaces (status: done, merged: true)
├── Git garbage collection (git gc --prune=now)
├── Remove stale temp files (.axiom/tmp/*)
└── Compress old logs (> 7 days)
     │
     ▼
Re-check disk space
     │
     ├── >= 500MB ──► Resume normal operation
     │
     └── < 500MB ──► Manual intervention required
```

### Manual Cleanup Options

If auto-cleanup insufficient:

```
┌─────────────────────────────────────────────────────────────────┐
│                   DISK SPACE CRITICAL                            │
│                                                                  │
│  Current free: 234MB (need 500MB minimum)                        │
│  Auto-cleanup freed: 150MB                                       │
│                                                                  │
│  Manual cleanup options:                                         │
│  [1] Remove old checkpoints (43 checkpoints, ~120MB)             │
│  [2] Remove failed workspaces (2 workspaces, ~85MB)              │
│  [3] Archive old sprint logs (15 sprints, ~60MB)                 │
│  [Q] Quit and handle manually                                    │
│                                                                  │
│  Or free space externally and press [R] to retry                 │
└─────────────────────────────────────────────────────────────────┘
```

### Config Options

```json
{
  "system": {
    "diskWarningThreshold": 1000,
    "diskCriticalThreshold": 500,
    "diskEmergencyThreshold": 100,
    "autoCleanupEnabled": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `diskWarningThreshold` | 1000 | MB free before warning |
| `diskCriticalThreshold` | 500 | MB free before pause |
| `diskEmergencyThreshold` | 100 | MB free before emergency stop |
| `autoCleanupEnabled` | true | Allow automatic cleanup |

### Error Codes

| Code | Trigger | Severity |
|------|---------|----------|
| `DISK_WARNING` | < 1GB free | Low |
| `DISK_CRITICAL` | < 500MB free | High |
| `DISK_EMERGENCY` | < 100MB free | Critical |
| `DISK_CHECKOUT_FAILED` | git worktree fails | High |

See [15-errors.md](./15-errors.md#disk-errors) for detailed error handling.

---

## Emergency Stop

`Ctrl+C` triggers graceful shutdown:

1. Stop accepting new Tasks
2. Signal agents to pause
3. Wait for Checkpoints (5s timeout)
4. Persist State machine snapshot
5. Exit cleanly

Second `Ctrl+C` forces immediate exit without graceful shutdown.
