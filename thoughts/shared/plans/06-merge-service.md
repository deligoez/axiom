# Chorus Merge Service

**Module:** 06-merge-service.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [05-agent-personas.md](./05-agent-personas.md), [07-ralph-loop.md](./07-ralph-loop.md)

---

## Overview

MergeService runs as a background process, handling branch integration with intelligent conflict resolution. Key approach: **Agent-first, human-fallback**.

---

## UI Design: Merge Queue Panel

The Merge Queue Panel is accessible via the 'M' key from Implementation Mode. It shows the status of branch merges and conflict resolution.

### Merge Queue Panel (Modal)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔀 MERGE QUEUE                                                       │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Queue Status: 3 items │ 1 merging │ 1 waiting │ 1 resolving                    │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  QUEUE                                                                           │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  #  Task ID    Branch                         Status           Agent            │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  1  ch-004     agent/ed-001/ch-004              ● Merging...     -                │
│  2  ch-006     agent/ed-002/ch-006              ○ Waiting        -                │
│  3  ch-009     agent/ed-003/ch-009              🔧 Conflict      Finn        │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  TODAY'S ACTIVITY                                                                │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  ✓ 12 merged successfully                                                        │
│  🔧 2 conflicts resolved (1 auto, 1 agent)                                       │
│  ⚠ 0 escalated to human                                                          │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [j/k] Navigate [Enter] View details [a] Approve [ESC] Close                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Merge Item Status Icons

| Icon | Status | Description |
|------|--------|-------------|
| `●` | Merging | Currently being merged |
| `○` | Waiting | In queue, waiting for turn |
| `🔧` | Conflict | 🔧 Fixer Finn resolving |
| `✓` | Complete | Successfully merged |
| `⚠` | Escalated | Needs human intervention |
| `✗` | Failed | Merge failed |

### Merge Detail View (Press Enter on item)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔀 MERGE DETAIL: ch-009                                              │ ESC back │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Task:    ch-009 Rate limiting middleware                                        │
│  Branch:  agent/ed-003/ch-009                                                     │
│  Status:  🔧 Conflict Resolution                                                │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  CONFLICT DETAILS                                                                │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Conflicting Files (2):                                                          │
│    • src/middleware/rateLimit.ts                                                 │
│    • src/config/limits.ts                                                        │
│                                                                                  │
│  Conflict Type: COMPLEX (same lines edited)                                      │
│  Resolution:    🔧 Fixer Finn assigned                                      │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  🔧 FIXER FINN STATUS                                                           │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Iteration: 2/5                                                                  │
│  Progress:  ▓▓▓▓░░░░░░ 40%                                                      │
│                                                                                  │
│  Last Action: Analyzing semantic differences...                                  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [l] View logs [h] Escalate to human [ESC] Back                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Conflict Type Indicators

| Type | Description | Resolution |
|------|-------------|------------|
| SIMPLE | Auto-generated files, lock files | Auto-resolve |
| MEDIUM | Same file, different sections | Rebase + retry |
| COMPLEX | Same lines edited, semantic conflict | 🔧 Fixer Finn |

### Merge Notification Toast

When a merge completes or fails, show a toast notification:

```
┌────────────────────────────────────────┐
│ ✓ Merged: ch-004 Register endpoint     │
│   Duration: 2.3s │ No conflicts        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🔧 Conflict: ch-009 Rate limiting      │
│   2 files │ Finn assigned         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚠ Escalated: ch-012 Database schema    │
│   Needs human review │ Press 'M'       │
└────────────────────────────────────────┘
```

### Merge Keyboard Shortcuts (in Merge Panel)

| Key | Action | Description |
|-----|--------|-------------|
| `j` / `↓` | Move down | Select next item |
| `k` / `↑` | Move up | Select previous item |
| `Enter` | Details | View merge details |
| `a` | Approve | Approve escalated merge |
| `h` | Escalate | Escalate to human |
| `l` | Logs | View merge logs |
| `r` | Retry | Retry failed merge |
| `ESC` | Close | Close panel |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 MERGE SERVICE ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

                     Orchestrator
                          │
                          │ enqueue(completedTask)
                          ▼
                   ┌─────────────┐
                   │ MergeQueue  │
                   │   (FIFO +   │
                   │  priority)  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │MergeWorker  │ (async background)
                   │             │
                   │ 1. Pull main│
                   │ 2. Merge    │
                   │ 3. Resolve  │
                   │ 4. Push     │
                   │ 5. Cleanup  │
                   └─────────────┘
```

---

## Merge Queue Flow

```
Agent completes (signal + tests pass)
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ENQUEUE                                                          │
│                                                                  │
│ mergeQueue.enqueue({                                             │
│   taskId: 'ch-001',                                              │
│   branch: 'agent/ed-001/ch-001',                                    │
│   worktree: '.worktrees/ed-001-ch-001',                             │
│   timestamp: Date.now()                                          │
│ })                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ MERGE WORKER (background, async)                                 │
│                                                                  │
│ while (queue.length > 0) {                                       │
│   const item = queue.dequeue();  // respects dependencies        │
│   const result = await attemptMerge(item);                       │
│                                                                  │
│   if (result.success) {                                          │
│     await cleanup(item);                                         │
│   } else {                                                       │
│     await handleConflict(item, result);                          │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conflict Resolution Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│           CONFLICT RESOLUTION: AGENT-FIRST APPROACH              │
└─────────────────────────────────────────────────────────────────┘

                     MERGE CONFLICT DETECTED
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Classify conflict     │
                  └───────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
      [SIMPLE]            [MEDIUM]           [COMPLEX]
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
   │Auto-resolve │    │Rebase+retry │    │Spawn Resolver   │
   │(merge driver│    │             │    │🔧 Agent (Finn)   │
   └─────────────┘    └─────────────┘    └────────┬────────┘
          │                   │                   │
          └─────────┬─────────┴───────────────────┤
                    │                             │
                    ▼                             ▼
            ┌─────────────┐               ┌─────────────────┐
            │ RUN TESTS   │               │HUMAN INTERVENTION│
            └──────┬──────┘               │(if agent fails)  │
                   │                      └─────────────────┘
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
       [PASS]            [FAIL]
          │                 │
          ▼                 ▼
     ✓ MERGED         ESCALATE
```

### Conflict Classification

**SIMPLE (Auto-resolve):**
- `.chorus/tasks.jsonl` → Use custom merge driver
- `package-lock.json` → Regenerate
- Auto-generated files → Regenerate

**MEDIUM (Rebase+retry):**
- Same file, different sections
- No semantic overlap

**COMPLEX (Agent-resolve):**
- Same lines edited
- Semantic conflicts
- Core files (types, config)

---

## 🔧 Resolver Agent (Fixer Finn)

When complex conflicts need agent resolution, 🔧 Fixer Finn is spawned with:

```markdown
# Merge Conflict Resolution Task

## Conflict Details
- Your Branch: agent/ed-001/ch-001
- Target: main
- Conflicting Files: {list}

## Your Changes
```diff
{diff from agent branch}
```

## Main Branch Changes (since you branched)
```diff
{diff from main}
```

## Instructions
1. Analyze both changes semantically
2. Understand the intent of each change
3. Determine if they can coexist
4. If YES: Resolve the conflict and commit
5. Run required quality commands (test, typecheck, lint)
6. If all pass: <chorus>RESOLVED</chorus>
7. If cannot resolve: <chorus>NEEDS_HUMAN: explanation</chorus>

## Important
- Preserve functionality from BOTH changes when possible
- If changes are mutually exclusive, prefer main (safer)
- Document your resolution reasoning in commit message
```

---

## Merge Ordering Rules

```
1. DEPENDENCY ORDER (highest priority)
   If ch-002 depends on ch-001, ch-001 must merge first.

   DEPENDENCY WAIT BEHAVIOR:
   - If ch-002 completes before ch-001:
     a. ch-002 enters queue with status "waiting_dependency"
     b. ch-002 waits until ch-001 merges successfully
     c. After ch-001 merges, ch-002 rebases onto new main
     d. ch-002 proceeds to merge
   - If ch-001 merge fails: ch-002 stays waiting, alert user
   - TUI shows: "ch-002 waiting on ch-001 merge"

2. FIFO within same dependency level

3. CONFLICT DEFERRAL
   Conflicted items go to end after retry.
   After 3 retries without resolution: escalate to human.

4. FORCE-PUSH RECOVERY
   If main branch is force-pushed during merge:
   - Detect via git fetch + ref comparison
   - Pull latest main
   - Rebase agent branch onto new main
   - Retry merge from beginning
   - After 2 force-push recoveries: pause and alert user
```

---

## Worktree Management

### Cleanup on Success

After successful merge:
1. Remove worktree: `git worktree remove .worktrees/{agentId}-{taskId}`
2. Delete branch: `git branch -d agent/{agentId}/{taskId}`
3. Update state to reflect completion

### Preservation on Failure

On merge failure:
- Keep worktree for debugging
- Keep branch for recovery
- Alert user with options

### Cleanup Commands

```bash
# Cleanup specific failed task worktree
chorus worktree clean <task-id>

# Cleanup all failed/timeout task worktrees
chorus worktree clean --failed

# Cleanup all worktrees (nuclear option)
chorus worktree clean --all

# List orphaned worktrees
chorus worktree list --orphaned
```

---

## Merge Events

Events logged during merge operations:

| Event | Details |
|-------|---------|
| `merge_queued` | `{taskId, branch}` |
| `merge_started` | `{taskId}` |
| `merge_completed` | `{taskId}` |
| `merge_conflict` | `{taskId, files, level}` |
| `conflict_resolved` | `{taskId, resolver: 'auto'\|'agent'\|'human'}` |
| `merge_failed` | `{taskId, reason}` |

---

## XState Integration

Merge queue is a parallel region in the ChorusMachine:

```typescript
mergeQueue: {
  initial: 'idle',
  states: {
    idle: {
      on: { ENQUEUE_MERGE: 'processing' }
    },
    processing: {
      invoke: {
        src: 'mergeWorker',
        onDone: 'idle',
        onError: 'conflict'
      }
    },
    conflict: {
      on: {
        RESOLVED: 'processing',
        ESCALATE: 'awaiting_human'
      }
    },
    awaiting_human: {
      on: { HUMAN_RESOLVED: 'processing' }
    }
  }
}
```

---

## References

- [05-agent-personas.md](./05-agent-personas.md) - Fixer Finn resolver persona
- [07-ralph-loop.md](./07-ralph-loop.md) - Completion triggers merge queue
- [09-intervention-rollback.md](./09-intervention-rollback.md) - Human intervention for conflicts

---

**End of Merge Service Module**
