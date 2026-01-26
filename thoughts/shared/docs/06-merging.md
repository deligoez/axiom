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

---

## Human Escalation

When conflicts can't be auto-resolved:

1. Web UI shows notification with conflict details
2. Integration queue paused for this entry
3. Human resolves conflict in workspace
4. Approve via Web UI to continue
5. Queue resumes processing

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

If main branch is force-pushed (e.g., by human), AXIOM detects and recovers:

```
Force-push detected on main
     │
     ▼
Pause integration queue
     │
     ▼
Alert user (Web UI notification)
     │
     ▼
User options:
├── [r] Rebase queued branches on new main
├── [c] Cancel affected merges (Tasks → pending)
└── [i] Ignore (continue with current refs)
```

Rebase operation runs in background, re-testing each branch before queue resumes.

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
