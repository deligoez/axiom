# Merge Service

Background merge service handles branch integration with conflict resolution.

---

## Merge Queue

Completed ideas are queued for merge. The queue processes entries FIFO with conflict handling. Each entry tracks: idea ID, branch name, and status (pending, merging, conflict, completed).

---

## Merge Flow

```
Idea Completed
     │
     ▼
Queue for Merge
     │
     ▼
Attempt git merge
     │
     ├── No conflict ────► Merge success ───► Cleanup worktree
     │
     └── Conflict ────► Classify conflict
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
            SIMPLE       MEDIUM       COMPLEX
               │            │            │
               ▼            ▼            ▼
          Auto-resolve  Finn tries   Human required
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
| MEDIUM | Semantic conflicts, overlapping changes | Fixer Finn |
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
| `autoMerge` | true | Queue completed ideas automatically |
| `conflictRetries` | 3 | Retries before human escalation |
| `cleanupOnSuccess` | true | Remove worktree after merge |

---

## Fixer Finn

Finn resolves MEDIUM conflicts via AI-assisted merge.

### Finn Workflow

1. Receive conflict context
2. Analyze both branches
3. Understand semantic intent
4. Generate resolution
5. Apply and test
6. Report success or escalate

### Finn Prompt Context

```
Conflict in: src/auth/login.ts
Base commit: abc123
Branch A (main): def456
Branch B (agent/ed-001/idea-004): ghi789

Branch A changes:
  - Added rate limiting to login

Branch B changes:
  - Added 2FA check to login

Conflict region:
<<<<<<< HEAD
  const result = await rateLimit(user);
=======
  const result = await check2FA(user);
>>>>>>> agent/ed-001/idea-004

Idea context:
  idea-004: Add two-factor authentication to login flow
```

---

## Merge Queue Events

| Event | Description |
|-------|-------------|
| `ENQUEUE_MERGE` | Idea completed, add to queue |
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
        removeWorktree(entry.worktree)
      emit('MERGE_COMPLETED', entry.ideaId)

    else if result.conflictLevel == SIMPLE:
      autoResolve(result.conflicts)
      continue  // Retry

    else if result.conflictLevel == MEDIUM:
      if entry.retryCount < config.conflictRetries:
        spawnFinn(result.conflicts)
        entry.retryCount++
      else:
        escalateToHuman(entry)

    else:  // COMPLEX
      escalateToHuman(entry)
```

---

## Worktree Lifecycle

```
Agent Start
     │
     ▼
Create Worktree
.worktrees/{agentId}-{ideaId}/
     │
     ▼
Agent Works
(commits to branch)
     │
     ▼
Idea Complete
     │
     ▼
Queue for Merge
     │
     ├── Success ──► Remove Worktree
     │
     └── Failure ──► Keep Worktree (for debugging)
```

---

## Human Escalation

When conflicts can't be auto-resolved:

1. Web UI shows notification with conflict details
2. Merge queue paused for this entry
3. Human resolves conflict in worktree
4. Approve via Web UI to continue
5. Queue resumes processing

---

## Branch Naming

| Branch | Pattern | Example |
|--------|---------|---------|
| Agent work | `agent/{agentId}/{ideaId}` | `agent/ed-001/idea-004` |
| Finn merge | `merge/{ideaId}` | `merge/idea-004` |
| Main | `main` or `master` | - |

---

## Dependency Wait Behavior

When ideas complete out of order (e.g., idea-002 finishes before idea-001), the merge queue handles gracefully:

```
Queue Processing:
  idea-002 completes (depends on idea-001)
     │
     ▼
  Add to merge queue
     │
     ▼
  Check dependencies
     │
     ├── idea-001 not merged ──► Hold in queue
     │
     └── idea-001 merged ──► Attempt merge
```

Ideas wait in queue until their dependencies merge successfully.

---

## Force-Push Recovery

If main branch is force-pushed (e.g., by human), Swarm detects and recovers:

```
Force-push detected on main
     │
     ▼
Pause merge queue
     │
     ▼
Alert user (Web UI notification)
     │
     ▼
User options:
├── [r] Rebase queued branches on new main
├── [c] Cancel affected merges (ideas → pending)
└── [i] Ignore (continue with current refs)
```

Rebase operation runs in background, re-testing each branch before queue resumes.

---

## Merge Statistics

Carl tracks merge metrics:

| Metric | Description |
|--------|-------------|
| Total merges | Successful merge count |
| Auto-resolved | SIMPLE conflicts resolved |
| Finn-resolved | MEDIUM conflicts resolved |
| Human-resolved | COMPLEX conflicts resolved |
| Avg merge time | Queue to completion |
