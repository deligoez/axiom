# Chorus Task Management

**Module:** 04-task-management.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [03-planning-phase.md](./03-planning-phase.md), [07-ralph-loop.md](./07-ralph-loop.md)

---

## Overview

Chorus uses a native **TaskStore** service for task management. This provides:

1. Direct, in-process task management (no subprocess overhead)
2. Eight task statuses for complete lifecycle control
3. Sequential IDs (`ch-1`, `ch-2`, ...)
4. **Intelligent task selection** (replaces manual priority)
5. Native XState actor model integration
6. No external tool dependencies

---

## UI Design: Task Management

This section defines the TUI components for task display and interaction in Implementation Mode.

### Task Panel (Left Side - 30%)

The task panel shows all tasks with status indicators and selection state.

```
┌──────────────────────────┐
│ Tasks (12)               │
│ ──────────────────────── │
│ ▸ ch-001 F01: User mo... │  ← Selected (▸)
│ → ch-002 F02: JWT tok... │  ← Ready (→)
│ → ch-003 F03: Login e... │
│ ● ch-004 F04: Register.. │  ← In Progress (●)
│ ✓ ch-005 F05: JWT val... │  ← Done (✓)
│ ✓ ch-006 F06: Refresh... │
│ ⊗ ch-007 F07: Logout...  │  ← Blocked (⊗)
│ ⊗ ch-008 F08: Protected. │
│ → ch-009 F09: Rate lim.. │
│ ✗ ch-010 F10: Error ha.. │  ← Failed (✗)
│ ⏱ ch-011 F11: Timeout... │  ← Timeout (⏱)
│ ○ ch-012 F12: Future...  │  ← Deferred (○)
│                          │
└──────────────────────────┘
```

### Status Indicators

| Symbol | Status | Description | Color |
|--------|--------|-------------|-------|
| `→` | todo | Ready to work | White |
| `●` | doing | Agent working | Blue (pulsing) |
| `✓` | done | Completed | Green |
| `⊗` | stuck | Has blockers | Yellow |
| `✗` | failed | Agent error | Red |
| `⏱` | timeout | Agent timed out | Orange |
| `○` | later | Deferred | Gray |
| `◐` | review | Awaiting human | Cyan |

### Task Detail View (Right Side - 70%)

When a task is selected (Enter or direct click), the right panel shows full markdown content:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ implementation │ semi-auto │ ⚙️ 2/3 agents │ 12 tasks     │ ? help │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ Tasks (12)                   │ ch-003: F03: Login endpoint                      │
│ ────────────────────────────-│──────────────────────────────────────────────────│
│ → ch-001 F01: User model     │ ID: ch-003         Status: todo                  │
│ → ch-002 F02: JWT token...   │ Type: feature      Tags: m1-auth, api            │
│ ▸ ch-003 F03: Login endp...  │ Deps: ch-001, ch-002                             │
│ ● ch-004 F04: Register...    │ ─────────────────────────────────────────────────│
│ ✓ ch-005 F05: JWT valid...   │                                                  │
│ ✓ ch-006 F06: Refresh...     │ ## Description                                   │
│ ⊗ ch-007 F07: Logout...      │ Create POST /auth/login endpoint that validates  │
│ ⊗ ch-008 F08: Protected...   │ credentials and returns JWT tokens.              │
│ → ch-009 F09: Rate lim...    │                                                  │
│ ✗ ch-010 F10: Error han...   │ ## Acceptance Criteria                           │
│ ⏱ ch-011 F11: Timeout...     │ - [ ] Accepts email + password in request body   │
│ ○ ch-012 F12: Future...      │ - [ ] Validates against User model               │
│                              │ - [ ] Returns 401 for invalid credentials        │
│                              │ - [ ] Returns access + refresh tokens on success │
│                              │ - [ ] Sets httpOnly cookie for refresh token     │
│                              │ - [ ] 6 tests pass                               │
│                              │                                                  │
│                              │ ## Files                                         │
│                              │ - src/routes/auth.ts                             │
│                              │ - src/routes/auth.test.ts                        │
│                              │                                                  │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ ✓5 ●1 →3 ⊗2 ✗1 │ [j/k] Nav [Enter] Assign [e] Edit [d] Done [?] Help           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Task Detail Header

The detail header shows task metadata in a compact format:

```
┌──────────────────────────────────────────────────────────────────┐
│ ch-003: F03: Login endpoint                                      │  ← Title
│──────────────────────────────────────────────────────────────────│
│ ID: ch-003         Status: todo                                  │  ← Metadata row 1
│ Type: feature      Tags: m1-auth, api                            │  ← Metadata row 2
│ Deps: ch-001, ch-002                                             │  ← Dependencies
│ Assignee: -        Model: claude-sonnet                          │  ← Assignment (if any)
│──────────────────────────────────────────────────────────────────│
```

### Task with Execution Stats (In Progress or Done)

When a task has execution data, show additional info:

```
┌──────────────────────────────────────────────────────────────────┐
│ ch-004: F04: Register endpoint                                   │
│──────────────────────────────────────────────────────────────────│
│ ID: ch-004         Status: doing                                 │
│ Type: feature      Tags: m1-auth, api                            │
│ Assignee: ⚙️ ed-001 Model: claude-sonnet                         │
│──────────────────────────────────────────────────────────────────│
│                                                                  │
│ ## Execution                                                     │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Started: 10:15:32    Duration: 5m 23s                      │   │
│ │ Iteration: 3/50      Progress: ▓▓▓▓▓▓░░░░ 60%             │   │
│ │ Branch: agent/ed-001/ch-004                                │   │
│ │ Worktree: .worktrees/ed-001-ch-004                         │   │
│ │                                                            │   │
│ │ Last Signal: PROGRESS:60                                   │   │
│ │ Tests: 4/6 passing                                         │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ## Description                                                   │
│ Create POST /auth/register endpoint...                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Completed Task Detail

```
┌──────────────────────────────────────────────────────────────────┐
│ ch-005: F05: JWT validation middleware                           │
│──────────────────────────────────────────────────────────────────│
│ ID: ch-005         Status: done ✓                                │
│ Type: feature      Tags: m1-auth                                 │
│ Completed: ⚙️ ed-002 on 2026-01-13 10:45:00                      │
│──────────────────────────────────────────────────────────────────│
│                                                                  │
│ ## Execution Summary                                             │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Duration: 8m 15s     Iterations: 5                         │   │
│ │ Tests: 8/8 passing   Quality: ✓ All checks passed          │   │
│ │ Commit: a1b2c3d "feat: add JWT validation #ch-005 @ed-002"  │   │
│ │ Changes: 3 files, +127 -12 lines                           │   │
│ │ Learnings: 2 extracted                                     │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ## Description                                                   │
│ ...                                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Failed Task Detail

```
┌──────────────────────────────────────────────────────────────────┐
│ ch-010: F10: Error handling middleware                           │
│──────────────────────────────────────────────────────────────────│
│ ID: ch-010         Status: failed ✗                              │
│ Type: feature      Tags: m1-core                                 │
│ Failed: ⚙️ ed-003 on 2026-01-13 11:00:00                         │
│──────────────────────────────────────────────────────────────────│
│                                                                  │
│ ## Failure Details                                               │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ✗ FAILED after 12 iterations                               │   │
│ │                                                            │   │
│ │ Last Error:                                                │   │
│ │ TypeError: Cannot read property 'status' of undefined      │   │
│ │   at errorHandler (src/middleware/error.ts:45)             │   │
│ │                                                            │   │
│ │ Signal: BLOCKED:Cannot resolve type mismatch               │   │
│ │ Retry Count: 2                                             │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [r] Retry   [e] Edit task   [x] Mark as later                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Blocked Task Detail

```
┌──────────────────────────────────────────────────────────────────┐
│ ch-007: F07: Logout endpoint                                     │
│──────────────────────────────────────────────────────────────────│
│ ID: ch-007         Status: stuck ⊗                               │
│ Type: feature      Tags: m1-auth                                 │
│──────────────────────────────────────────────────────────────────│
│                                                                  │
│ ## Blocked By                                                    │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ⊗ This task is waiting on:                                 │   │
│ │                                                            │   │
│ │   → ch-003 F03: Login endpoint (todo)                      │   │
│ │   ● ch-004 F04: Register endpoint (doing - 60%)            │   │
│ │                                                            │   │
│ │ Will become ready when both complete.                      │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ## Description                                                   │
│ ...                                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Task Panel Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `j` / `↓` | Move down | Select next task |
| `k` / `↑` | Move up | Select previous task |
| `Enter` | Assign | Start agent on selected task |
| `e` | Edit | Open task editor |
| `d` | Done | Manually mark as done |
| `r` | Retry | Retry failed task |
| `x` | Defer | Move to later |
| `b` | Block | Add/view blockers |
| `n` | New | Create new task |
| `/` | Search | Filter tasks by text |
| `Tab` | Switch | Focus agent panel |

### Task Filter Mode

Pressing `/` opens filter mode:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ implementation │ semi-auto │ ⚙️ 2/3 agents │ 12 tasks     │ ? help │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ Tasks (3 of 12)              │                                                  │
│ ────────────────────────────-│  Filter active: "auth"                           │
│ Filter: auth█                │  Showing 3 matching tasks                        │
│ ────────────────────────────-│                                                  │
│ ▸ ch-001 F01: User model     │                                                  │
│ → ch-003 F03: Login endp...  │  Press ESC to clear filter                       │
│ ● ch-004 F04: Register...    │  Press Enter to select first match               │
│                              │                                                  │
│                              │                                                  │
│                              │                                                  │
│                              │                                                  │
│                              │                                                  │
│                              │                                                  │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ [ESC] Clear [Enter] Select first [j/k] Navigate filtered                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Task Stats (Footer)

The footer shows aggregated task statistics:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✓5 ●1 →3 ⊗2 ✗1 ○1 │ 12 total │ Merge: 2 queued │ Runtime: 45m      │ ? help   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Description |
|-----------|-------------|
| `✓5` | 5 done |
| `●1` | 1 in progress |
| `→3` | 3 ready |
| `⊗2` | 2 blocked |
| `✗1` | 1 failed |
| `○1` | 1 deferred |
| `12 total` | Total task count |
| `Merge: 2 queued` | Merge queue status |
| `Runtime: 45m` | Session duration |

---

## Task Data Model

### Task Statuses

```typescript
export type TaskStatus =
  | 'todo'      // Ready to work
  | 'doing'     // Agent working on it
  | 'done'      // Completed successfully
  | 'stuck'     // Has unmet dependencies
  | 'later'     // Deferred, not for now
  | 'failed'    // Agent encountered error
  | 'timeout'   // Agent couldn't finish in time (distinct from failed)
  | 'review';   // Awaiting human review
```

### Task Types

```typescript
export type TaskType = 'task' | 'bug' | 'feature' | 'chore';
```

### Task Interface

```typescript
export interface Task {
  // Identity
  id: string;                    // Sequential: "ch-1", "ch-2", etc.
  title: string;
  description?: string;          // Markdown - what to do

  // Classification (NO priority - uses intelligent selection)
  status: TaskStatus;
  type?: TaskType;               // Optional, defaults to 'task'
  tags: string[];                // ["m12-tui", "critical", "refactor"]

  // Dependencies
  dependencies: string[];        // IDs of blocking tasks

  // Agent Configuration
  assignee?: string;             // Agent ID when claimed
  model?: string;                // "opus-4.5", "sonnet" - override default
  acceptanceCriteria?: string[]; // Structured list for agent verification

  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  // Execution Stats
  execution?: TaskExecution;

  // Review Summary
  reviewCount: number;
  lastReviewedAt?: string;
  reviewResult?: 'approved' | 'rejected' | 'revision';

  // Learning Summary
  learningsCount: number;
  hasLearnings: boolean;
}
```

### Task Execution Stats

```typescript
export interface TaskExecution {
  // Timing
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;

  // Iteration tracking
  iterations: number;            // Ralph loop iterations
  retryCount: number;            // Restart count after crash/failure

  // Worktree context
  worktree?: string;             // .worktrees/ed-001-ch-xxx
  branch?: string;               // agent/ed-001/ch-xxx

  // Results
  finalCommit?: string;
  testsPassed?: number;
  testsTotal?: number;
  qualityPassed?: boolean;

  // Code changes
  codeChanges?: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
  };

  // Failure tracking
  lastError?: string;
  failedAt?: string;

  // Signals received from agent
  signals?: string[];            // ['PROGRESS:50', 'COMPLETE']
}
```

---

## Intelligent Task Selection

Instead of manual priority levels (P0-P4), Chorus uses an intelligent algorithm to select the next task. This removes cognitive load and ensures optimal task ordering.

### Selection Criteria

| # | Criterion | Bonus | Rationale |
|---|-----------|-------|-----------|
| 1 | **User Hint (`next` tag)** | +200 | User explicitly wants this next |
| 2 | **Unblocking Power** | +100 per stuck dependent | Complete blockers first |
| 3 | **Milestone Focus** | +30 per same-milestone task done | Complete milestones |
| 4 | **Series Continuation** | +25 per shared tag | Don't context-switch |
| 5 | **Atomicity** | +50 if no dependencies | Simple tasks first |
| 6 | **FIFO** | Tiebreaker | Oldest task wins |

### Selection Algorithm

```typescript
export interface TaskSelectionContext {
  lastCompletedTaskId?: string;    // For series continuation
  preferredTags?: string[];        // Optional tag preferences
  excludeIds?: string[];           // Tasks to skip (for parallel agents)
}

export function selectNextTask(
  tasks: Task[],
  context?: TaskSelectionContext
): Task | undefined {
  let ready = tasks.filter(t => t.status === 'todo');

  // Exclude specified tasks (for parallel agent coordination)
  if (context?.excludeIds?.length) {
    ready = ready.filter(t => !context.excludeIds!.includes(t.id));
  }

  if (ready.length === 0) return undefined;

  // Score each task
  const scored = ready.map(task => ({
    task,
    score: calculateScore(task, tasks, context),
  }));

  // Sort by score (descending) then by createdAt (ascending)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
  });

  return scored[0]?.task;
}

function calculateScore(
  task: Task,
  allTasks: Task[],
  context?: TaskSelectionContext
): number {
  let score = 0;

  // 1. User hint (highest priority)
  if (task.tags.includes('next')) {
    score += 200;
  }

  // 2. Dependency unblocking bonus
  const dependentsCount = allTasks.filter(t =>
    t.dependencies.includes(task.id) && t.status === 'stuck'
  ).length;
  score += dependentsCount * 100;

  // 3. Milestone focus bonus
  if (context?.lastCompletedTaskId) {
    const lastTask = allTasks.find(t => t.id === context.lastCompletedTaskId);
    if (lastTask) {
      const milestone = lastTask.tags.find(t => t.startsWith('m'));
      if (milestone && task.tags.includes(milestone)) {
        const milestoneProgress = allTasks.filter(t =>
          t.tags.includes(milestone) && t.status === 'done'
        ).length;
        score += milestoneProgress * 30;
      }

      // Series continuation (shared tags)
      const sharedTags = task.tags.filter(t => lastTask.tags.includes(t));
      score += sharedTags.length * 25;
    }
  }

  // 4. Atomicity bonus (no dependencies = simpler)
  if (task.dependencies.length === 0) {
    score += 50;
  }

  return score;
}
```

### Benefits over Manual Priority

- No cognitive overhead deciding P0/P1/P2
- Optimal task ordering based on dependency graph
- Context-aware selection (series continuation, milestone focus)
- Self-adjusting as tasks complete
- User can override with `next` tag

---

## TaskStore Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TaskStore                                │
│  (In-memory store + JSONL persistence + EventEmitter)       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Tasks Map  │  │  Deps Graph  │  │  File Watcher    │  │
│  │  (in-memory) │  │  (computed)  │  │  (chokidar)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  Events: 'change' | 'task:created' | 'task:updated' |       │
│          'task:closed' | 'task:deleted'                      │
└──────────────────────────────────────────────────────────────┘
              │
              │ Consumers
              │
    ┌─────────┼─────────┬─────────────────┐
    ▼         ▼         ▼                 ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────┐
│ Orch.  │ │  TUI   │ │ Completion │ │  XState  │
│Service │ │ Panel  │ │  Handler   │ │ Machines │
└────────┘ └────────┘ └────────────┘ └──────────┘
```

### Data Flow

**Read Path (hot path, must be fast):**
```
Component.getReadyTasks()
    → TaskStore.ready()
    → Filter in-memory Map
    → Return Task[]
    ⏱️ <1ms
```

**Write Path:**
```
Component.closeTask(id)
    → TaskStore.close(id)
    → Update in-memory Map
    → Write to JSONL (atomic)
    → Emit 'task:closed' event
    → File watcher detects (external changes)
    ⏱️ ~5ms
```

---

## TaskStore API

### CRUD Operations

```typescript
export class TaskStore extends EventEmitter<TaskStoreEvents> {
  constructor(projectDir: string);

  // Create a new task
  create(input: CreateTaskInput): Task;

  // Get a task by ID
  get(id: string): Task | undefined;

  // Update a task
  update(id: string, changes: UpdateTaskInput): Task;

  // Soft-delete a task
  delete(id: string, reason?: string): void;
}
```

### Lifecycle Operations

```typescript
// Claim a task (status → doing)
claim(id: string): Task;

// Release a task back to todo status
release(id: string): Task;

// Complete a task (status → done)
complete(id: string, reason?: string): Task;

// Reopen a done task (status → todo)
reopen(id: string): Task;

// Defer a task (status → later)
defer(id: string): Task;

// Mark a task as failed (status → failed)
fail(id: string, reason?: string): Task;
```

### Query Operations

```typescript
// List all tasks matching filters
list(filters?: TaskFilters): Task[];

// Get tasks ready for assignment (todo, no unmet deps)
ready(filters?: Pick<TaskFilters, 'tags' | 'excludeTags' | 'type'>): Task[];

// Get the next best task using intelligent selection
selectNext(context?: TaskSelectionContext): Task | undefined;

// Get stuck tasks (have unmet dependencies)
stuck(): Task[];

// Get tasks currently being worked on
doing(): Task[];

// Get completed tasks
done(): Task[];

// Get deferred tasks
later(): Task[];
```

### Dependency Operations

```typescript
// Add a dependency (taskId depends on dependsOnId)
addDependency(taskId: string, dependsOnId: string): void;

// Remove a dependency
removeDependency(taskId: string, dependsOnId: string): void;

// Get tasks that depend on this one
getDependents(taskId: string): Task[];

// Get unmet dependencies for a task
getBlockers(taskId: string): Task[];
```

---

## Task State Transitions

```
                    ┌────────────────┐
                    │     todo       │
                    │  (ready to     │
                    │    work)       │
                    └───────┬────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │  doing   │    │  later   │    │  stuck   │
     │ (agent   │    │(deferred)│    │(blocked) │
     │ working) │    │          │    │          │
     └────┬─────┘    └──────────┘    └──────────┘
          │                ▲               ▲
          │                │               │
    ┌─────┼─────┐    undefer         dep satisfied
    │     │     │          │               │
    ▼     ▼     ▼          │               │
┌──────┐ │ ┌──────┐   ┌────┴───┐     ┌────┴───┐
│ done │ │ │failed│   │  todo  │     │  todo  │
│      │ │ │      │   └────────┘     └────────┘
└──────┘ │ └──────┘
         │
         ▼
    ┌──────────┐
    │ review   │
    │(awaiting │
    │ human)   │
    └──────────┘
```

---

## JSONL Storage Format

```typescript
export interface TaskJSONL {
  id: string;
  title: string;
  description?: string;
  status: string;
  type?: string;
  tags?: string[];
  dependencies?: string[];
  assignee?: string;
  model?: string;
  acceptance_criteria?: string[];
  created_at: string;
  updated_at: string;
  execution?: {
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    iterations: number;
    retry_count: number;
    worktree?: string;
    branch?: string;
    final_commit?: string;
    tests_passed?: number;
    tests_total?: number;
    quality_passed?: boolean;
    code_changes?: {
      files_changed: number;
      lines_added: number;
      lines_removed: number;
    };
    last_error?: string;
    failed_at?: string;
    signals?: string[];
  };
  review_count: number;
  last_reviewed_at?: string;
  review_result?: string;
  learnings_count: number;
  has_learnings: boolean;
}
```

---

## ID Generation

Sequential IDs with configurable prefix:

```json
// .chorus/config.json (project section)
{
  "project": {
    "name": "my-awesome-app",
    "type": "node",
    "taskIdPrefix": "ch-"
  }
}
```

IDs are generated as `{prefix}{sequential-number}`:

| Example | Pattern | Notes |
|---------|---------|-------|
| `ch-1`, `ch-2`, `ch-10` | Simple numeric | Default |
| `ch-001`, `ch-002`, `ch-010` | Padded numeric | Better for lexical sorting |

> **Implementation Note:** TaskStore generates sequential IDs. Format (simple vs padded) is determined by implementation, not config.

---

## Crash Recovery

When Chorus crashes, tasks may be left in "doing" state with no running process.

### Recovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CRASH HAPPENS                            │
│  - Task ch-5 status: "doing"                                │
│  - Worktree: .worktrees/ed-001-ch-5/ (has changes)          │
│  - Audit log: .chorus/audit/ch-5.jsonl                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CHORUS RESTARTS                            │
│  1. TaskStore.load() runs                                   │
│  2. Find all tasks with status = "doing"                    │
│  3. For each: status → "todo", retryCount++                 │
│  4. Log recovery event to audit                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   TASK RE-CLAIMED                            │
│  1. selectNext() picks ch-5 (or another ready task)         │
│  2. claim() checks retryCount > 0                           │
│  3. If yes, read audit log and inject into prompt           │
│  4. Agent sees: "Previous attempt crashed. Review log."     │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Implementation

```typescript
export function recoverOrphanedTasks(store: TaskStore): RecoveryResult {
  const orphaned = store.list({ status: 'doing' });
  const recovered: string[] = [];

  for (const task of orphaned) {
    // Log crash recovery event
    store.audit(task.id, { event: 'crash_recovery', at: new Date().toISOString() });

    // Reset to todo, increment retry count
    store.update(task.id, {
      status: 'todo',
      execution: {
        ...task.execution,
        retryCount: (task.execution?.retryCount || 0) + 1,
      },
    });

    recovered.push(task.id);
  }

  return { recoveredCount: recovered.length, taskIds: recovered };
}
```

### What Gets Preserved

| Data | Location | Survives Crash? |
|------|----------|-----------------|
| Task status/metadata | `.chorus/tasks.jsonl` | Yes |
| Audit log | `.chorus/audit/{id}.jsonl` | Yes |
| Code changes | `.worktrees/{agentId}-{taskId}/` | Yes |
| Agent memory | Lost | No (but audit log helps) |

---

## Hybrid Data Storage

Summary data lives in the task. Detailed history lives in separate files.

| Data Type | In Task (Summary) | Separate File (Detail) |
|-----------|-------------------|------------------------|
| **Reviews** | `reviewCount`, `reviewResult` | `.chorus/reviews/{task-id}.jsonl` |
| **Learnings** | `learningsCount`, `hasLearnings` | `.chorus/learnings/{task-id}.jsonl` |
| **Audit** | Just current state | `.chorus/audit/{task-id}.jsonl` |

---

## Parallel Agent Coordination

When multiple agents work simultaneously, they must not claim the same task:

```typescript
async function assignTasksToAgents(agents: Agent[], store: TaskStore): Promise<void> {
  const claimedIds: string[] = [];

  for (const agent of agents) {
    // Pass already-claimed tasks to exclude
    const task = store.selectNext({
      lastCompletedTaskId: agent.lastTaskId,
      excludeIds: claimedIds,
    });

    if (task) {
      try {
        store.claim(task.id);  // Atomic - throws if already claimed
        claimedIds.push(task.id);
        agent.startTask(task);
      } catch (e) {
        // Another agent claimed it (race condition) - retry
        continue;
      }
    }
  }
}
```

---

## XState Integration

TaskStore is **NOT** an XState machine. It's a service that:

1. **Provides data** to XState machines via queries
2. **Receives commands** from XState actions
3. **Emits events** that XState can observe

```typescript
// In ChorusMachine actions
actions: {
  claimTask: ({ context, event }) => {
    context.taskStore.claim(event.taskId);
  },
  closeTask: ({ context, event }) => {
    context.taskStore.complete(event.taskId, event.comment);
  }
}

// In ChorusMachine guards
guards: {
  hasReadyTasks: ({ context }) => {
    return context.taskStore.ready().length > 0;
  }
}
```

---

## References

- [03-planning-phase.md](./03-planning-phase.md) - Task validation rules
- [07-ralph-loop.md](./07-ralph-loop.md) - Task iteration control
- [09-intervention-rollback.md](./09-intervention-rollback.md) - Task recovery

---

**End of Task Management Module**
