# Integration Service

Background integration service handles branch merging with conflict resolution.

---

## Integration Queue

Completed Tasks are queued for merge. The queue processes entries FIFO with conflict handling. Each entry tracks: Task ID, branch name, and status (pending, merging, conflict, completed).

---

## Merge Flow

```
Task Completed
     │
     ▼
Queue for Merge
     │
     ▼
Attempt git merge
     │
     ├── No conflict ────► Merge success ───► Cleanup workspace
     │
     └── Conflict ────► Classify conflict
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
            SIMPLE       MEDIUM       COMPLEX
               │            │            │
               ▼            ▼            ▼
          Auto-resolve  Rex tries    Human required
               │            │
               ▼            │
          Retry merge ◄─────┘
               │
          ┌────┴────┐
          ▼         ▼
      Success    Escalate
```

---

## Conflict Classification

| Level | Description | Resolution |
|-------|-------------|------------|
| SIMPLE | Whitespace, formatting, adjacent lines | Auto-resolve |
| MEDIUM | Semantic conflicts, overlapping changes | Resolver Rex |
| COMPLEX | Structural changes, renames, deletions | Human escalation |

### Classification Criteria

```
classifyConflict(conflict):
  if onlyWhitespaceChanges(conflict):
    return SIMPLE

  if conflictingLogic(conflict) && sameFile(conflict):
    if conflict.lineCount < 20:
      return MEDIUM
    else:
      return COMPLEX

  if renamedOrDeletedFile(conflict):
    return COMPLEX

  return MEDIUM
```

---

## Merge Configuration

```json
{
  "merge": {
    "autoMerge": true,
    "conflictRetries": 3,
    "cleanupOnSuccess": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `autoMerge` | true | Queue completed Tasks automatically |
| `conflictRetries` | 3 | Retries before human escalation |
| `cleanupOnSuccess` | true | Remove workspace after merge |

---

## Resolver Rex

Rex resolves MEDIUM conflicts via AI-assisted merge.

### Rex Workflow

1. Receive conflict context
2. Analyze both branches
3. Understand semantic intent
4. Generate resolution
5. Apply and test
6. Report success or escalate

### Rex Prompt Context

```
Conflict in: src/auth/login.ts
Base commit: abc123
Branch A (main): def456
Branch B (agent/echo-001/task-004): ghi789

Branch A changes:
  - Added rate limiting to login

Branch B changes:
  - Added 2FA check to login

Conflict region:
<<<<<<< HEAD
  const result = await rateLimit(user);
=======
  const result = await check2FA(user);
>>>>>>> agent/echo-001/task-004

Task context:
  task-004: Add two-factor authentication to login flow
```

---

## Integration Queue Events

| Event | Description |
|-------|-------------|
| `ENQUEUE_MERGE` | Task completed, add to queue |
| `MERGE_STARTED` | Processing queue entry |
| `MERGE_COMPLETED` | Successfully merged |
| `MERGE_CONFLICT` | Conflict detected |
| `MERGE_FAILED` | All retries exhausted |
| `HUMAN_ESCALATION` | Complex conflict needs human |

---

## Queue Processing

```
processMergeQueue():
  while queue.hasItems():
    entry = queue.peek()

    result = attemptMerge(entry)

    if result.success:
      queue.dequeue()
      if config.cleanupOnSuccess:
        removeWorkspace(entry.workspace)
      emit('MERGE_COMPLETED', entry.taskId)

    else if result.conflictLevel == SIMPLE:
      autoResolve(result.conflicts)
      continue  // Retry

    else if result.conflictLevel == MEDIUM:
      if entry.retryCount < config.conflictRetries:
        spawnRex(result.conflicts)
        entry.retryCount++
      else:
        escalateToHuman(entry)

    else:  // COMPLEX
      escalateToHuman(entry)
```

### Concurrent Merge Protection

Merges are protected by a single-threaded merge worker:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MERGE WORKER                                  │
│                                                                  │
│  Single goroutine processes queue sequentially                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                 ││
│  │   │ T1  │ →  │ T2  │ →  │ T3  │ →  │ T4  │   Queue         ││
│  │   └─────┘    └─────┘    └─────┘    └─────┘                 ││
│  │      ↓                                                       ││
│  │   [Processing T1]                                            ││
│  │      │                                                       ││
│  │      └── git merge → verify → cleanup                        ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Guarantees:                                                     │
│  • Only ONE merge at a time                                      │
│  • Strict FIFO ordering (respects dependencies)                  │
│  • No race conditions on main branch                             │
│  • Atomic: merge completes or rolls back                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why single-threaded?**
- Git merge is not concurrency-safe on same branch
- Prevents race conditions on `main`
- Ensures conflict detection is accurate
- Simplifies rollback on failure

**Queue guarantees:**
| Guarantee | Description |
|-----------|-------------|
| **FIFO** | First completed Task merges first |
| **Atomic** | Merge succeeds completely or rolls back |
| **Dependency-aware** | Blocked Tasks stay queued until deps merge |
| **Retry-safe** | Failed merges can retry without corruption |

**Merge lock:**
```go
type MergeWorker struct {
    queue    *MergeQueue
    mutex    sync.Mutex  // Protects merge operation
    active   *MergeEntry // Currently processing
}

func (w *MergeWorker) process(entry *MergeEntry) error {
    w.mutex.Lock()
    defer w.mutex.Unlock()

    w.active = entry
    defer func() { w.active = nil }()

    return w.doMerge(entry)
}
```

---

## Workspace Lifecycle

```
Agent Start
     │
     ▼
Create Workspace
.workspaces/{agentId}-{taskId}/
     │
     ▼
Agent Works
(commits to branch)
     │
     ▼
Task Complete
     │
     ▼
Queue for Merge
     │
     ├── Success ──► Remove Workspace
     │
     └── Failure ──► Keep Workspace (for debugging)
```

### Workspace Cleanup Timing

| Scenario | Cleanup | When |
|----------|---------|------|
| Merge success | Automatic | Immediately (if `cleanupOnSuccess: true`) |
| Merge conflict | Keep | Until conflict resolved or Task deferred |
| Task failed | Keep | Until manual cleanup or retry |
| Task timeout | Keep | Until manual cleanup or retry |
| Agent stopped | Keep | Until manual cleanup or Task reassigned |
| Rollback | Remove | Orphaned workspaces cleaned on rollback |
| Disk critical | Auto-clean | Oldest merged workspaces first |

### Preserved Workspaces

Workspaces are preserved for debugging in these cases:

| Failure Type | Workspace State | Preserved Duration |
|--------------|-----------------|-------------------|
| Merge conflict | Has uncommitted conflict markers | Until human resolution |
| Task failed | Contains partial work | 7 days default |
| Agent crash | May have uncommitted changes | 7 days default |
| Verification failed | Has failing code | Until retry or cleanup |

**Why preserve?** Allows debugging by:
- Inspecting git diff/log
- Running tests manually
- Checking agent's intermediate state

### Automatic Cleanup Triggers

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC CLEANUP                             │
│                                                                  │
│  Trigger                │  What's Cleaned                       │
│  ───────────────────────┼───────────────────────────────────────│
│  Successful merge       │  Workspace for merged Task            │
│  Disk < 500MB           │  Oldest preserved workspaces          │
│  Workspace age > 7d     │  Non-active workspaces (configurable) │
│  Rollback command       │  All workspaces for affected Tasks    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Manual Cleanup

**CLI cleanup:**
```bash
# List all workspaces with status
ls -la .workspaces/

# Remove specific workspace
rm -rf .workspaces/echo-001-task-042/

# Clean all workspaces for completed Tasks
find .workspaces -name "*.completed" -exec rm -rf {} \;
```

**Web UI cleanup:**
1. Open Intervention Panel → Workspace tab
2. Select workspace(s) to remove
3. Click "Clean Up" (with confirmation)

### Workspace Retention Config

```json
{
  "workspace": {
    "retentionDays": 7,
    "cleanupOnSuccess": true,
    "preserveOnFailure": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `retentionDays` | 7 | Days to keep failed/stopped workspaces |
| `cleanupOnSuccess` | true | Auto-remove after successful merge |
| `preserveOnFailure` | true | Keep workspace on Task failure |

---

## Human Escalation

When conflicts can't be auto-resolved:

1. Web UI shows notification with conflict details
2. Integration queue paused for this entry
3. Human resolves conflict in workspace
4. Approve via Web UI to continue
5. Queue resumes processing

### Escalation Timeout

Human escalations have configurable timeouts to prevent indefinite blocking:

**Config:**
```json
{
  "merge": {
    "escalationTimeout": 3600,
    "escalationAction": "defer"
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `escalationTimeout` | 3600 | Seconds before timeout (1 hour) |
| `escalationAction` | defer | Action on timeout |

**Timeout actions:**

| Action | Description |
|--------|-------------|
| `defer` | Move Task to deferred, continue queue |
| `skip` | Skip this merge, Task stays pending |
| `retry` | Retry merge (may fail again) |
| `notify` | Send notification, keep waiting |

**Timeout flow:**
```
Human escalation triggered
     │
     ▼
Timer starts (escalationTimeout)
     │
     ├── Human resolves before timeout ──► Continue merge
     │
     └── Timeout reached
              │
              ▼
         escalationAction:
         ├── defer ──► Task → deferred, queue continues
         ├── skip ──► Task → pending, queue continues
         ├── retry ──► Attempt merge again
         └── notify ──► Send on-escalation hook, keep waiting
```

### Escalation Notifications

Configure `on-escalation` hook for alerts:

```bash
#!/bin/bash
# .axiom/hooks/on-escalation.sh

# Variables:
# AXIOM_TASK_ID        - Task ID
# AXIOM_CONFLICT_FILES - Conflicting files
# AXIOM_CONFLICT_LEVEL - COMPLEX
# AXIOM_WORKSPACE      - Workspace path

# Example: Slack alert
curl -X POST "$SLACK_WEBHOOK" \
  -d "{\"text\": \"⚠️ Human intervention needed for $AXIOM_TASK_ID\"}"

# Example: Email
echo "Conflict in $AXIOM_TASK_ID" | mail -s "AXIOM Escalation" team@example.com
```

### AFK Handling

For overnight or weekend scenarios:

| Scenario | Recommendation |
|----------|----------------|
| Overnight batch | Set `escalationAction: defer` |
| CI/CD pipeline | Set `escalationAction: skip` |
| Attended session | Set `escalationAction: notify` |

---

## Branch Naming

| Branch | Pattern | Example |
|--------|---------|---------|
| Agent work | `agent/{agentId}/{taskId}` | `agent/echo-001/task-004` |
| Rex merge | `merge/{taskId}` | `merge/task-004` |
| Main | `main` or `master` | - |

---

## Dependency Wait Behavior

When Tasks complete out of order (e.g., task-002 finishes before task-001), the integration queue handles gracefully:

```
Queue Processing:
  task-002 completes (depends on task-001)
     │
     ▼
  Add to integration queue
     │
     ▼
  Check dependencies
     │
     ├── task-001 not merged ──► Hold in queue
     │
     └── task-001 merged ──► Attempt merge
```

Tasks wait in queue until their dependencies merge successfully.

---

## Force-Push Recovery

If main branch is force-pushed (e.g., by human), AXIOM detects and recovers.

### Detection Mechanism

AXIOM checks for remote divergence before each merge attempt:

```
Pre-merge check
     │
     ▼
git fetch origin main
     │
     ▼
Compare: local main vs origin/main
     │
     ├── Same commit ──► Proceed with merge
     │
     ├── Remote ahead ──► Fast-forward local, proceed
     │
     └── Diverged ──► Force-push detected
```

**Detection triggers:**
- Before each merge attempt (inline check)
- Periodic sync check (every 5 minutes, configurable)
- On user request (manual refresh)

### Recovery Flow

```
Force-push detected on main
     │
     ▼
Pause integration queue
     │
     ▼
Alert user (Web UI notification + on-error hook)
     │
     ▼
User options:
├── [r] Rebase queued branches on new main
├── [c] Cancel affected merges (Tasks → pending)
└── [i] Ignore (continue with current refs)
```

Rebase operation runs in background, re-testing each branch before queue resumes.

### Rebase Recovery Detail

When user selects [r] Rebase:

```
For each queued branch:
     │
     ├── git rebase origin/main
     │
     ├── Rebase success ──► Re-run verification ──► Re-queue for merge
     │
     └── Rebase conflict ──► Mark branch as conflict ──► Classify and handle
```

### Config Options

```json
{
  "merge": {
    "remoteSyncInterval": 300,
    "autoFetchBeforeMerge": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `remoteSyncInterval` | 300 | Seconds between remote sync checks |
| `autoFetchBeforeMerge` | true | Fetch before each merge attempt |

### Error Codes

| Code | Trigger | Severity |
|------|---------|----------|
| `REMOTE_FORCE_PUSH` | Remote diverged (force push) | High |
| `REMOTE_AHEAD` | Remote has new commits (normal) | Info |
| `REMOTE_FETCH_FAILED` | Network error on fetch | Medium |
| `REBASE_CONFLICT` | Rebase failed due to conflicts | High |

---

## Integration Statistics

Auditor Ash tracks merge metrics:

| Metric | Description |
|--------|-------------|
| Total merges | Successful merge count |
| Auto-resolved | SIMPLE conflicts resolved |
| Rex-resolved | MEDIUM conflicts resolved |
| Human-resolved | COMPLEX conflicts resolved |
| Avg merge time | Queue to completion |
