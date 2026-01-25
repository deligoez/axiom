# Chorus Intervention & Rollback

**Module:** 09-intervention-rollback.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [01-architecture.md](./01-architecture.md), [07-ralph-loop.md](./07-ralph-loop.md)

---

## Overview

Chorus provides multiple intervention points allowing humans to pause, redirect, or rollback agent work at any time without data loss.

---

## UI Design: Intervention & Rollback

### Intervention Panel (Press 'i')

The main intervention menu accessible from Implementation Mode:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⚠ INTERVENTION PANEL                                                 │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Current State: Autopilot │ 3 agents running │ 5 tasks in progress              │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  SELECTED AGENT                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  ⚙️ ed-001 working on ch-004: Register endpoint                                 │
│  Iteration: 7/50 │ Duration: 12m │ Progress: 50%                                │
│                                                                                  │
│  Agent Actions:                                                                  │
│    [s] Stop agent      - Return task to todo, keep worktree                     │
│    [r] Redirect        - Assign different task to this agent                    │
│    [x] Kill            - Force stop, discard current iteration                  │
│    [l] View logs       - Open agent log panel                                   │
│    [f] Fullscreen      - View agent in fullscreen mode                          │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  TASK ACTIONS (ch-004)                                                          │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│    [b] Block task      - Mark as stuck, provide reason                          │
│    [e] Edit task       - Modify task description                                │
│    [R] Rollback        - Revert all commits for this task                       │
│    [d] Debug           - Open worktree in $EDITOR                               │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  GLOBAL ACTIONS                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│    [Space] Pause all   - Pause at next iteration boundary                       │
│    [m] Toggle mode     - Switch semi-auto ↔ autopilot                          │
│    [c] Checkpoint      - Create manual checkpoint                               │
│    [C] View checkpoints- Open rollback menu                                     │
│    [q] Quit            - Exit Chorus (confirm if agents running)                │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [j/k] Select agent [Tab] Global actions [ESC] Close                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Block Task Dialog

When pressing 'b' to block a task:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⊗ BLOCK TASK: ch-004                                                 │ ESC cancel │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Task: ch-004 Register endpoint                                                  │
│  Agent: ⚙️ ed-001 (will be stopped)                                             │
│                                                                                  │
│  Block Reason:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Need database admin access to create user table_                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  After blocking:                                                                 │
│  • Agent will stop and become available for other tasks                         │
│  • Task status will change to "stuck"                                           │
│  • Worktree will be preserved at: .worktrees/ed-001-ch-004                       │
│  • You can unblock later with 'u' key on the task                               │
│                                                                                  │
│  [Enter] Confirm block   [ESC] Cancel                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Rollback Menu (Press 'C')

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔄 ROLLBACK TO CHECKPOINT                                            │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Current State: 8 tasks done, 3 in progress, 5 pending                          │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  AVAILABLE CHECKPOINTS                                                           │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  #   Time        Type     Name                          Changes Since           │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  ▸1  14:30:00    auto     Before autopilot              3 tasks, 5 commits      │
│   2  14:25:00    manual   pre-refactor                  5 tasks, 12 commits     │
│   3  14:00:00    auto     After ch-001 merge            6 tasks, 15 commits     │
│   4  13:45:00    auto     Session start                 8 tasks, 23 commits     │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  SELECTED CHECKPOINT                                                             │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Time: 2026-01-13 14:30:00                                                       │
│  Type: auto (Before autopilot)                                                   │
│                                                                                  │
│  Will Revert:                                                                    │
│    • 3 completed tasks → todo                                                    │
│    • 5 commits → reverted                                                        │
│    • 2 merged branches → unmerged                                                │
│                                                                                  │
│  ⚠ Warning: This action cannot be undone!                                       │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [j/k] Select [Enter] Confirm rollback [n] Create new [ESC] Cancel                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Task Rollback Confirmation

When pressing 'R' to rollback a specific task:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔄 ROLLBACK TASK: ch-004                                             │ ESC cancel │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Task: ch-004 Register endpoint                                                  │
│  Status: done (completed by ⚙️ ed-001)                                          │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  COMMITS TO REVERT                                                               │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│    a1b2c3d  feat: add register endpoint #ch-004 @ed-001                         │
│    d4e5f6g  test: add register tests #ch-004 @ed-001                            │
│    h7i8j9k  fix: handle duplicate email #ch-004 @ed-001                         │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  AFTER ROLLBACK                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│    • Task status: done → todo                                                    │
│    • Branch: Reverted to pre-task state                                          │
│    • Merge: Undone (if merged)                                                   │
│    • Files: Restored to previous state                                           │
│                                                                                  │
│  ⚠ Warning: This will revert 3 commits!                                         │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Confirm rollback   [ESC] Cancel                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Pause Confirmation

When pressing Space to pause:

```
┌────────────────────────────────────────┐
│ ⏸ PAUSING...                          │
│                                        │
│   Waiting for 3 agents to reach        │
│   safe iteration boundary...           │
│                                        │
│   ⚙️ ed-001: Paused ✓                 │
│   ⚙️ ed-002: Waiting... (iteration 4) │
│   ⚙️ ed-003: Paused ✓                 │
│                                        │
│   Press [Space] again to force stop    │
└────────────────────────────────────────┘
```

### Redirect Agent Dialog

When pressing 'r' to redirect an agent:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔄 REDIRECT AGENT: ⚙️ ed-001                                         │ ESC cancel │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Current Task: ch-004 Register endpoint (iter 7/50, 50% complete)               │
│                                                                                  │
│  After redirect:                                                                 │
│  • Current task → todo (progress lost)                                           │
│  • Worktree preserved at: .worktrees/ed-001-ch-004                               │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  SELECT NEW TASK                                                                 │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  Ready Tasks (3):                                                                │
│  ▸ ch-001  F01: User model                    m1-auth       (unblocks 2)        │
│    ch-002  F02: JWT token generation          m1-auth       (atomic)            │
│    ch-009  F09: Rate limiting                 m1-core       (atomic)            │
│                                                                                  │
│  [Recommended: ch-001 - highest unblocking power]                               │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [j/k] Select task [Enter] Confirm redirect [ESC] Cancel                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Quit Confirmation

When pressing 'q' with agents running:

```
┌────────────────────────────────────────┐
│ ⚠ QUIT CHORUS?                        │
│                                        │
│   3 agents are currently running:      │
│   • ⚙️ ed-001 on ch-004 (50%)         │
│   • ⚙️ ed-002 on ch-006 (20%)         │
│   • ⚙️ ed-003 on ch-009 (10%)         │
│                                        │
│   Uncommitted changes will be lost!    │
│                                        │
│   [q] Quit anyway                      │
│   [s] Save checkpoint then quit        │
│   [ESC] Cancel                         │
└────────────────────────────────────────┘
```

### Intervention Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `i` | Open panel | Open intervention panel |
| `Space` | Pause/Resume | Toggle pause state |
| `s` | Stop agent | Stop selected agent |
| `r` | Redirect | Redirect agent to new task |
| `x` | Kill | Force stop agent |
| `b` | Block | Block current task |
| `e` | Edit | Edit task description |
| `R` | Rollback | Rollback task changes |
| `c` | Checkpoint | Create manual checkpoint |
| `C` | Checkpoints | View checkpoint list |
| `m` | Mode | Toggle semi-auto/autopilot |
| `d` | Debug | Open worktree in editor |
| `l` | Logs | View agent logs |
| `q` | Quit | Exit Chorus |
| `ESC` | Close | Close panel |

---

## Human Intervention

### Intervention Points

```
┌─────────────────────────────────────────────────────────────────┐
│                 HUMAN INTERVENTION POINTS                        │
└─────────────────────────────────────────────────────────────────┘

1. PAUSE (Space key)
   - All agents pause at next iteration boundary
   - No data loss, worktrees preserved
   - Resume with Space again

2. STOP AGENT (s key)
   - Stop specific agent immediately
   - Task returns to todo status
   - Worktree preserved for inspection

3. BLOCK TASK (b key)
   - Mark task as blocked
   - Agent stops working
   - Reason logged

4. REDIRECT (r key)
   - Stop current task
   - Assign different task to agent
   - Original task returns to todo

5. INTERVENTION MENU (i key)
   - Full control panel
   - View all options
   - Execute any intervention
```

### Intervention Menu UI

```
┌─────────────────────────────────────────────────────────────────┐
│ INTERVENTION PANEL                                    [ESC] Close│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Selected: ed-001 working on ch-123                           │
│                                                                  │
│  Actions:                                                        │
│  [s] Stop agent - Return task to todo                           │
│  [b] Block task - Mark as stuck, agent stops                    │
│  [r] Redirect - Assign different task                           │
│  [R] Rollback - Revert commits, restart                         │
│  [e] Edit task - Modify description                             │
│  [l] View logs - See agent output                               │
│  [d] Debug - Open worktree in editor                            │
│                                                                  │
│  Global Actions:                                                 │
│  [Space] Pause/Resume all                                        │
│  [m] Toggle mode (semi-auto/autopilot)                          │
│  [q] Quit (confirm if agents running)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Rollback & Recovery

### Checkpoint System

Chorus creates checkpoints at key moments:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKPOINT SYSTEM                             │
└─────────────────────────────────────────────────────────────────┘

Auto-checkpoints (config-driven):
├── Before autopilot starts
├── Before each merge
├── Every N completed tasks (config.checkpoints.periodic)
└── Before risky operations

Manual checkpoints:
├── Press 'C' to create named checkpoint
└── chorus checkpoint create <name>

Checkpoint storage:
├── Git tags: chorus-checkpoint-{timestamp}
├── State snapshot: .chorus/checkpoints/{timestamp}/
└── Task state preserved
```

### Rollback Options

```
1. TASK ROLLBACK (R key on task)
   - Revert commits made by agent for this task
   - Task returns to todo status
   - Worktree reset to pre-work state

2. CHECKPOINT ROLLBACK (c key)
   - Return to specific checkpoint
   - All changes since checkpoint reverted
   - Tasks re-queued as they were

3. FULL SESSION ROLLBACK (Shift+R key)
   - Returns to state before session started
   - Nuclear option, rarely needed
```

### Rollback UI

```
┌─────────────────────────────────────────────────────────────────┐
│ ROLLBACK TO CHECKPOINT                                [ESC] Back │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Available Checkpoints:                                          │
│                                                                  │
│  → [1] 2026-01-13 14:30 - Before autopilot (auto)               │
│    [2] 2026-01-13 14:25 - Manual: pre-refactor                  │
│    [3] 2026-01-13 14:00 - After ch-001 merge (auto)             │
│    [4] 2026-01-13 13:45 - Session start (auto)                  │
│                                                                  │
│  Selected: 2026-01-13 14:30 - Before autopilot                  │
│  Changes to revert: 3 tasks, 5 commits                          │
│                                                                  │
│  [Enter] Confirm rollback    [ESC] Cancel                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hooks Integration

Hooks allow custom scripts to run at key lifecycle events:

```
.chorus/hooks/
├── pre-task-start.sh          # Before agent starts task
├── post-task-complete.sh      # After task completes
├── pre-merge.sh               # Before branch merge
├── post-merge.sh              # After successful merge
├── on-conflict.sh             # When merge conflict detected
├── on-learning.sh             # When learning extracted
├── on-pause.sh                # When session paused
└── on-error.sh                # When error occurs
```

### Hook Interface

```bash
#!/bin/bash
# .chorus/hooks/post-task-complete.sh

# Environment variables available:
# CHORUS_TASK_ID     - Task ID (e.g., ch-001)
# CHORUS_AGENT       - Agent name (e.g., ed-001)
# CHORUS_STATUS      - Completion status (done, failed)
# CHORUS_DURATION    - Duration in seconds
# CHORUS_BRANCH      - Git branch name

# Example: Notify on completion
if [ "$CHORUS_STATUS" = "done" ]; then
  echo "Task $CHORUS_TASK_ID completed by $CHORUS_AGENT"
  # notify-send "Chorus: $CHORUS_TASK_ID done"
fi
```

### Hook Events

| Hook | Trigger | Variables |
|------|---------|-----------|
| `pre-task-start` | Agent claims task | TASK_ID, AGENT, WORKTREE |
| `post-task-complete` | Task done/failed | TASK_ID, AGENT, STATUS, DURATION |
| `pre-merge` | Before merge attempt | TASK_ID, BRANCH, TARGET |
| `post-merge` | After successful merge | TASK_ID, COMMIT_HASH |
| `on-conflict` | Merge conflict detected | TASK_ID, FILES, LEVEL |
| `on-learning` | Learning extracted | LEARNING_ID, SCOPE, CONTENT |
| `on-pause` | Session paused | REASON, RUNNING_TASKS |
| `on-error` | Error occurred | ERROR_TYPE, MESSAGE, TASK_ID |

---

## Crash Recovery

When Chorus crashes, recovery is automatic:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRASH RECOVERY                               │
└─────────────────────────────────────────────────────────────────┘

On Restart:
1. Load snapshot from .chorus/state/snapshot.json
2. If snapshot invalid, replay events from .chorus/state/events.jsonl
3. Find orphaned tasks (status = doing, no running process)
4. Reset orphaned tasks to todo, increment retryCount
5. Resume from last known state

What's Preserved:
├── Task state (.chorus/tasks.jsonl)
├── XState snapshot (.chorus/state/snapshot.json)
├── Event log (.chorus/state/events.jsonl)
├── Agent logs (.chorus/agents/{persona}/logs/{taskId}.jsonl)
├── Worktrees (with uncommitted changes)
└── Learnings (.chorus/learnings.md, .chorus/agents/*/learnings.md)

What's Lost:
├── In-memory agent state
├── Uncommitted changes in memory
└── Real-time output buffer
```

### Recovery Context Injection

When a crashed task is re-claimed:

```typescript
interface RecoveryContext {
  previousAttempts: number;
  auditLog: AuditEntry[];
  worktreeHasChanges: boolean;
  instruction: string;  // "Previous attempt crashed. Review log."
}
```

---

## State Preservation

### Persistence Strategy

| Data | Storage | Recovery |
|------|---------|----------|
| XState snapshot | `.chorus/state/snapshot.json` | Primary - fast restore |
| Event log | `.chorus/state/events.jsonl` | Fallback - replay events |
| Task data | `.chorus/tasks.jsonl` | Always preserved |
| Agent logs | `.chorus/agents/{persona}/logs/{taskId}.jsonl` | Per-task history |
| Learnings | `.chorus/learnings.md`, `.chorus/agents/*/learnings.md` | Always preserved |

### Persistence Points

| Event | Persist |
|-------|---------|
| Agent spawned | ✓ |
| Agent completed | ✓ |
| Agent failed | ✓ |
| Mode changed | ✓ |
| Merge completed | ✓ |
| User checkpoint | ✓ |
| Every 5 seconds | Snapshot only |

---

## TUI Commands

All checkpoint and rollback operations are triggered via TUI keyboard shortcuts:

| Key | Action | Description |
|-----|--------|-------------|
| `c` | Checkpoint menu | Create/list/select checkpoints |
| `R` | Task rollback | Revert commits for selected task |
| `Shift+R` | Full rollback | Full session rollback (nuclear) |

> **Note:** These operations are intentionally TUI-only to ensure visual feedback and confirmation dialogs.

---

## Configuration

```json
{
  "checkpoints": {
    "beforeAutopilot": true,
    "beforeMerge": true,
    "periodic": 5
  },
  "recovery": {
    "autoResetOrphaned": true,
    "injectAuditLog": true,
    "maxRetries": 3
  }
}
```

---

## References

- [01-architecture.md](./01-architecture.md) - XState persistence strategy
- [07-ralph-loop.md](./07-ralph-loop.md) - Agent exit handling
- [06-merge-service.md](./06-merge-service.md) - Merge conflict escalation

---

**End of Intervention & Rollback Module**
