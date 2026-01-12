# Native TaskStore: Replacing Beads CLI with Built-in Task Management

**Date:** 2026-01-12
**Status:** DRAFT - Pending Review
**Version:** 3.2
**Author:** Chorus Development Team

> **Important Context:** This document describes the task management system that **Chorus will use to manage agent work**, not the system used to develop Chorus itself. TaskStore tracks tasks that agents work on.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Rationale](#strategic-rationale)
3. [Current State Analysis](#current-state-analysis)
4. [Architecture Design](#architecture-design)
5. [Data Model](#data-model)
6. [API Design](#api-design)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Risk Assessment](#risk-assessment)
10. [Appendices](#appendices)
11. [Task Plan](#task-plan)

---

## Executive Summary

### The Problem

Chorus currently uses Beads CLI (`bd`) as an external dependency for task management. Every task operation spawns a subprocess, adding 50-100ms latency. The external tool also:

- Limits status types (no native "deferred" support in ecosystem tools like perles)
- Requires users to install `bd` separately
- Provides features Chorus doesn't need (BQL, daemon, git sync)
- Creates friction for XState integration

### The Proposal

Build a native **TaskStore** service that:

1. Provides direct, in-process task management (no subprocess overhead)
2. Supports all statuses Chorus needs (`todo`, `doing`, `done`, `stuck`, `later`, `failed`, `review`)
3. Uses sequential IDs (`ch-1`, `ch-2`, ...) since `bd` is removed
4. **Replaces manual priority with intelligent task selection** (dependency-aware, context-aware)
5. Integrates natively with XState actor model
6. Eliminates external tool dependency

### Effort & Impact

| Metric | Value |
|--------|-------|
| Estimated effort | 12-14 hours (2 days) |
| Lines to add | ~600 (core) + ~400 (tests) |
| Lines to remove | ~500 (BeadsCLI wrapper) |
| Net change | +500 lines |
| Files affected | 82 consumers to migrate |
| External deps removed | 1 (bd CLI) |
| Performance gain | 50-100x for read operations |

---

## Strategic Rationale

### Why Task Tracking is Core to Chorus

Chorus is fundamentally a **task orchestrator**. Its primary functions are:

1. **Taking tasks** from a queue
2. **Assigning tasks** to agents
3. **Tracking progress** of tasks
4. **Managing dependencies** between tasks
5. **Orchestrating completion** across agents

Task tracking is not a peripheral feature - it's the central nervous system. Using an external tool for this core function creates unnecessary friction and coupling.

### Build vs Buy Analysis

| Factor | Build (Native) | Buy (Beads) |
|--------|---------------|-------------|
| Core to product? | **YES** - orchestrator's heart | External dependency |
| Complexity? | **LOW** - CRUD + deps + filter | Provides BQL, daemon, sync |
| Customization needs? | **HIGH** - XState, sprint, agents | Generic issue tracker |
| Integration depth? | **DEEP** - every component uses | Subprocess boundary |
| Long-term maintenance? | **Can handle** - TypeScript | External project |
| Performance? | **<1ms** per operation | 50-100ms subprocess |

**Verdict: BUILD** - The cost is modest (2 days), the benefits are significant, and task management is too central to outsource.

### What Beads Provides vs What Chorus Needs

| Feature | Beads Provides | Chorus Uses | Verdict |
|---------|---------------|-------------|---------|
| CRUD operations | Yes | Yes | Keep |
| Dependencies | Yes | Yes | Keep |
| Priorities (P0-P4) | Yes | No | **Remove** - intelligent selection instead |
| Labels/milestones | Yes | Yes (as tags) | Keep |
| Status tracking | 3 statuses | 7 statuses | **Extend** |
| JSONL storage | Yes | Yes | Keep format |
| BQL query language | Yes | No | **Remove** |
| Git sync | Yes | No (own worktree mgmt) | **Remove** |
| Daemon mode | Yes | No | **Remove** |
| Interactive CLI | Yes | No (own TUI) | **Remove** |

---

## Current State Analysis

### Beads Integration Components

The current codebase has 606 lines of Beads-related code:

| File | Lines | Purpose |
|------|-------|---------|
| `BeadsCLI.ts` | 246 | Subprocess wrapper for `bd` commands |
| `BeadsService.ts` | 101 | JSONL file reader + watcher |
| `BeadsParser.ts` | 129 | JSONL parsing/serialization |
| `bead.ts` | 42 | Type definitions |
| `recoverBeads.ts` | 88 | Database recovery utility |
| **Total** | **606** | |

Plus 1,179 lines of tests:

| File | Tests | Lines |
|------|-------|-------|
| `BeadsCLI.test.ts` | 26 | 596 |
| `BeadsService.test.ts` | 12 | 188 |
| `BeadsParser.test.ts` | 23 | 233 |
| `beads-cli.e2e.test.ts` | 11 | 162 |
| **Total** | **72** | **1,179** |

### Usage Analysis

**82 files** (17% of codebase) interact with task data:

| Category | Files | Read/Write |
|----------|-------|------------|
| Services | 19 | Read-write |
| UI Components | 8 | Read-only |
| Hooks | 9 | Read-only |
| XState Machines | 6 | Via events |
| E2E Tests | 28 | Both |
| CLI/Commands | 3 | Both |
| Test Utilities | 4 | Both |
| Types | 1 | N/A |

### Data Analysis

Current task database (`.beads/issues.jsonl`):

| Metric | Value |
|--------|-------|
| Total records | 350 |
| Closed | 324 (92.6%) |
| Tombstone (deleted) | 21 (6.0%) |
| Active (open/in_progress/deferred) | 5 (1.4%) |
| With dependencies | 299 (85.4%) |
| Max dependencies per task | 9 |
| Most depended-on task | ch-mzi3 (48 dependents) |
| Milestones (labels) | 14 |
| Largest milestone | m12-tui (130 tasks) |

### Status Migration Notes

Beads → TaskStore status mapping:

| Beads Status | TaskStore Status | Notes |
|--------------|------------------|-------|
| `open` | `todo` | Ready to work |
| `in_progress` | `doing` | Agent working |
| `closed` | `done` | Completed |
| `blocked` | `stuck` | Unmet dependencies |
| `deferred` | `later` | Postponed (was missing in Beads types!) |
| `failed` | `failed` | Same |
| `reviewing` | `review` | Same concept |

### Pain Points

1. **Subprocess overhead**: Every `bd` call spawns a process (50-100ms)
2. **Missing status**: "deferred" not recognized by type system
3. **No batch operations**: Must process tasks one at a time
4. **External dependency**: Users must install `bd` separately
5. **Limited error visibility**: CLI errors are opaque
6. **Feature bloat**: BQL, daemon, git sync unused
7. **Type mismatches**: BeadsCLI.Task ≠ BeadsService.Bead interfaces

---

## Architecture Design

### Design Principles

1. **Single source of truth**: TaskStore owns task data
2. **Event-driven updates**: Components subscribe to changes
3. **XState integration**: Native actor-friendly API
4. **JSONL compatibility**: Keep file format for migration
5. **Type-safe**: Full TypeScript with proper status types
6. **Testable**: Mockable interface, no subprocess

### Component Architecture

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

**External Change Path:**
```
User runs `bd update ch-xxx` manually
    → File watcher detects change
    → TaskStore.reload()
    → Emit 'change' event
    → Components update
```

### Integration with XState

TaskStore is **NOT** an XState machine. It's a service that:

1. **Provides data** to XState machines via queries
2. **Receives commands** from XState actions
3. **Emits events** that XState can observe

```typescript
// In ChorusMachine actions
actions: {
  claimTask: ({ context, event }) => {
    context.taskStore.claim(event.taskId);  // No agentId needed
  },
  closeTask: ({ context, event }) => {
    context.taskStore.close(event.taskId, event.comment);
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

## Data Model

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Status names | Casual (`todo`, `doing`, `done`) | More intuitive than technical (`open`, `in_progress`, `closed`) |
| Task types | **Optional** (default `'task'`) | Keep for familiarity, but rarely used |
| Labels | Renamed to `tags` | More generic, not always milestones |
| Custom fields | **Flat** (not nested under `custom`) | Simpler access, better TypeScript |
| Backward compat | **No** - migration script | Clean break, no legacy code |
| ID format | **Sequential** (`ch-1`, `ch-2`, ...) | Simpler, bd is removed so no external concurrent writes |
| Priority | **REMOVED** | Replaced with intelligent task selection algorithm |
| acceptanceCriteria | Separate field | Better for agent programmatic verification |

### Task Interface

```typescript
// src/types/task.ts

/**
 * Task status - casual, everyday names.
 * These are hardcoded - Chorus has specific lifecycle needs.
 */
export type TaskStatus =
  | 'todo'      // Yapılacak - Ready to work
  | 'doing'     // Yapılıyor - Agent working on it
  | 'done'      // Tamam - Completed successfully
  | 'stuck'     // Takıldı - Has unmet dependencies
  | 'later'     // Sonra - Deferred, not for now
  | 'failed'    // Başarısız - Agent couldn't complete
  | 'review';   // İnceleniyor - Awaiting human review

/**
 * Task type - optional, defaults to 'task'.
 * Kept for familiarity but rarely used in practice.
 */
export type TaskType = 'task' | 'bug' | 'feature' | 'chore';

export interface Task {
  // ─────────────────────────────────────────────────────────
  // Identity
  // ─────────────────────────────────────────────────────────
  id: string;                    // Sequential: "ch-1", "ch-2", etc.
  title: string;
  description?: string;          // Markdown - what to do (prose)

  // ─────────────────────────────────────────────────────────
  // Classification (simplified - NO priority)
  // ─────────────────────────────────────────────────────────
  status: TaskStatus;
  type?: TaskType;               // Optional, defaults to 'task'
  tags: string[];                // ["m12-tui", "critical", "refactor"]

  // ─────────────────────────────────────────────────────────
  // Dependencies
  // ─────────────────────────────────────────────────────────
  dependencies: string[];        // IDs of blocking tasks

  // ─────────────────────────────────────────────────────────
  // Agent Configuration (flat, not under custom)
  // ─────────────────────────────────────────────────────────
  assignee?: string;             // Agent ID when claimed
  model?: string;                // "opus-4.5", "sonnet" - override default
  acceptanceCriteria?: string[]; // Structured list for agent verification

  // ─────────────────────────────────────────────────────────
  // Timestamps (core)
  // ─────────────────────────────────────────────────────────
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  // ─────────────────────────────────────────────────────────
  // Execution Stats (Chorus tracks agent work)
  // ─────────────────────────────────────────────────────────
  execution?: TaskExecution;

  // ─────────────────────────────────────────────────────────
  // Review Summary (in-task, detail in separate file)
  // ─────────────────────────────────────────────────────────
  reviewCount: number;
  lastReviewedAt?: string;
  reviewResult?: 'approved' | 'rejected' | 'revision';

  // ─────────────────────────────────────────────────────────
  // Learning Summary (in-task, detail in separate file)
  // ─────────────────────────────────────────────────────────
  learningsCount: number;
  hasLearnings: boolean;
}

/**
 * Execution statistics - what happened when agent worked on task.
 */
export interface TaskExecution {
  // Timing
  startedAt?: string;            // When first claimed
  completedAt?: string;          // When done
  durationMs?: number;           // completedAt - startedAt

  // Iteration tracking
  iterations: number;            // Ralph loop iterations
  retryCount: number;            // How many times restarted after crash/failure

  // Worktree context (task-based, not agent-based)
  worktree?: string;             // .worktrees/claude-ch-xxx
  branch?: string;               // agent/claude/ch-xxx

  // Results
  finalCommit?: string;          // Last commit hash
  testsPassed?: number;          // Tests passed at completion
  testsTotal?: number;           // Total tests
  qualityPassed?: boolean;       // npm run quality passed

  // Code changes
  codeChanges?: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
  };

  // Failure tracking
  lastError?: string;            // Error message if failed
  failedAt?: string;             // When it failed

  // Signals received from agent
  signals?: string[];            // ['PROGRESS:50', 'COMPLETE']
}
```

### Hybrid Data Storage

Summary data lives in the task. Detailed history lives in separate files.

| Data Type | In Task (Summary) | Separate File (Detail) |
|-----------|-------------------|------------------------|
| **Reviews** | `reviewCount`, `reviewResult` | `.chorus/reviews/{task-id}.jsonl` |
| **Learnings** | `learningsCount`, `hasLearnings` | `.chorus/learnings/{task-id}.jsonl` |
| **Audit** | Just current state | `.chorus/audit/{task-id}.jsonl` |

**Review detail file:**
```jsonl
{"reviewer":"human","result":"approved","comment":"LGTM","at":"2026-01-12T10:30:00Z"}
{"reviewer":"auto","result":"approved","tests":true,"quality":true,"at":"2026-01-12T10:25:00Z"}
```

**Learnings detail file:**
```jsonl
{"type":"discovery","content":"XState sendTo requires full actor ref","source":"agent","at":"..."}
{"type":"pattern","content":"Use stdin for Claude CLI prompts","source":"agent","at":"..."}
```

**Audit detail file:**
```jsonl
{"event":"created","at":"2026-01-12T09:00:00Z","by":"deligoez"}
{"event":"claimed","at":"2026-01-12T09:30:00Z","by":"agent-claude-1"}
{"event":"status","from":"todo","to":"doing","at":"2026-01-12T09:30:00Z"}
{"event":"status","from":"doing","to":"done","at":"2026-01-12T10:30:00Z"}
```

### JSONL Storage Format

```typescript
// Storage format - new clean schema (not backward compatible with Beads)
export interface TaskJSONL {
  id: string;
  title: string;
  description?: string;
  status: string;
  type?: string;                  // Optional, defaults to 'task'
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
    agent_id?: string;
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

### Computed Properties

```typescript
interface TaskWithComputed extends Task {
  // Computed at query time, not stored
  isBlocked: boolean;            // Has unmet dependencies
  isReady: boolean;              // status=todo AND no unmet deps
  dependents: string[];          // Tasks that depend on this one
  blockedBy: string[];           // Unmet dependency IDs
}
```

### ID Generation

Sequential IDs are used since we're removing the external `bd` CLI. TaskStore is the only writer, so no race conditions with external tools.

**Configuration (set during init):**

```typescript
// .chorus/config.json
{
  "taskId": {
    "prefix": "ch",        // From project name (e.g., "chorus" → "ch")
    "format": "padded",    // "simple" (1, 2, 3) or "padded" (001, 002, 003)
    "padding": 3           // Digit count for padded format
  }
}
```

**ID Formats:**

| Format | Example | Sorting | Use Case |
|--------|---------|---------|----------|
| `simple` | ch-1, ch-2, ch-10 | Lexical fails | Small projects (<100 tasks) |
| `padded` | ch-001, ch-002, ch-010 | Lexical works | Large projects |

```typescript
// src/services/TaskStore.ts (internal)

class TaskStore {
  private nextId: number = 1;
  private config: TaskIdConfig;

  /**
   * Generate next sequential task ID.
   */
  private generateId(): string {
    const num = this.nextId++;
    const id = this.config.format === 'padded'
      ? String(num).padStart(this.config.padding, '0')
      : String(num);
    return `${this.config.prefix}-${id}`;
  }

  /**
   * Initialize from existing tasks to continue sequence.
   */
  private initNextId(): void {
    const maxId = Math.max(0, ...Array.from(this.tasks.keys())
      .map(id => {
        const numPart = id.split('-')[1];
        return numPart ? parseInt(numPart, 10) : 0;
      })
      .filter(n => !isNaN(n)));
    this.nextId = maxId + 1;
  }
}

/**
 * Validate task ID format.
 */
export function isValidTaskId(id: string, prefix: string): boolean {
  return new RegExp(`^${prefix}-\\d+$`).test(id);
}
```

**Init Wizard Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│  CHORUS INIT                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  What's your project name?                                   │
│  > my-awesome-project                                        │
│                                                              │
│  Suggested task ID prefix: "ma" (from project name)          │
│  [Accept] or enter custom prefix: > ch                       │
│                                                              │
│  ID format:                                                  │
│  ○ Simple (1, 2, 3...) - for small projects                 │
│  ● Padded (001, 002...) - for large projects (recommended)  │
│                                                              │
│  Padding width: [3] digits (supports up to 999 tasks)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Prefix Suggestion Algorithm:**

```typescript
function suggestPrefix(projectName: string): string {
  // Remove common prefixes/suffixes
  const clean = projectName
    .replace(/^(my-|the-|a-)/i, '')
    .replace(/(-app|-project|-api|-web|-cli)$/i, '');

  // Take first letter of each word (max 3)
  const words = clean.split(/[-_\s]+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0]).join('').toLowerCase();
  }

  // Single word: take first 2-3 chars
  return clean.slice(0, 2).toLowerCase();
}

// Examples:
// "chorus" → "ch"
// "my-awesome-project" → "ap" (awesome-project)
// "react-native-app" → "rn"
// "api-gateway" → "ag"
```

### Intelligent Task Selection (Replaces Priority)

Instead of manual priority levels, Chorus uses an intelligent algorithm to select the next task. This removes cognitive load from humans and ensures optimal task selection.

**Selection Criteria (in order of importance):**

| # | Criterion | Bonus | Rationale |
|---|-----------|-------|-----------|
| 1 | **Unblocking Power** | +100 per stuck dependent | Complete blockers first |
| 2 | **User Hint (`next` tag)** | +200 | User explicitly wants this next |
| 3 | **Milestone Focus** | +30 per same-milestone task already done | Complete milestones |
| 4 | **Series Continuation** | +25 per shared tag | Don't context-switch |
| 5 | **Atomicity** | +50 if no dependencies | Simple tasks first |
| 6 | **FIFO** | Tiebreaker | Oldest task wins |

```typescript
// src/services/TaskSelector.ts

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
      // Count completed tasks in same milestone
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

  // 5. Preferred tags bonus
  if (context?.preferredTags) {
    const matchingTags = task.tags.filter(t => context.preferredTags!.includes(t));
    score += matchingTags.length * 10;
  }

  return score;
}
```

**Parallel Agent Coordination:**

When multiple agents work simultaneously, they must not claim the same task:

```typescript
// Orchestrator handles parallel selection
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

**Benefits over Manual Priority:**
- No cognitive overhead deciding P0/P1/P2
- Optimal task ordering based on dependency graph
- Context-aware selection (series continuation, milestone focus)
- Self-adjusting as tasks complete
- User can override with `next` tag

### Race Condition Safety

TaskStore is single-process with synchronous in-memory operations:

```typescript
// Safe - synchronous Map operations
function claim(id: string): Task {
  const task = this.tasks.get(id);           // Sync read
  if (task.status !== 'todo') throw new Error('Not claimable');
  task.status = 'doing';                      // Sync mutation
  this.tasks.set(id, task);                   // Sync write
  this.flush();                               // Async persist (fire-and-forget)
  return task;
}
```

JavaScript event loop ensures no interleaving within synchronous blocks.

### Crash Recovery

When Chorus crashes (terminal closes, power failure, etc.), tasks may be left in "doing" state with no running process. The crash recovery system handles this.

**Design Principles:**
1. **No heartbeat** - Unnecessary for crash detection
2. **No PID tracking** - Keep it simple
3. **Conservative approach** - Assume all "doing" tasks are orphans on startup
4. **Audit log injection** - Give agent context about previous attempt

**Recovery Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                     CRASH HAPPENS                            │
│  - Task ch-5 status: "doing"                                │
│  - Worktree: .worktrees/claude-ch-5/ (has changes)          │
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

**Implementation:**

```typescript
// src/services/CrashRecovery.ts

export interface RecoveryContext {
  previousAttempts: number;
  auditLog: AuditEntry[];
  worktreeHasChanges: boolean;
  instruction: string;
}

/**
 * Called on TaskStore initialization.
 * Resets orphaned "doing" tasks to "todo".
 */
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

/**
 * Called when claiming a task that has previous attempts.
 * Returns context to inject into agent prompt.
 */
export async function getRecoveryContext(
  taskId: string,
  store: TaskStore
): Promise<RecoveryContext | undefined> {
  const task = store.get(taskId);
  if (!task || (task.execution?.retryCount || 0) === 0) {
    return undefined;
  }

  const auditLog = await readAuditLog(taskId);
  const worktreePath = `.worktrees/claude-${taskId}/`;
  const worktreeHasChanges = await checkGitStatus(worktreePath);

  return {
    previousAttempts: task.execution?.retryCount || 0,
    auditLog,
    worktreeHasChanges,
    instruction: worktreeHasChanges
      ? "Bu task daha önce denendi ve crash oldu. Worktree'de uncommitted değişiklikler var. Audit log'u incele ve devam et veya baştan başla."
      : "Bu task daha önce denendi ve crash oldu. Audit log'u incele.",
  };
}
```

**What Gets Preserved:**

| Data | Location | Survives Crash? |
|------|----------|-----------------|
| Task status/metadata | `.chorus/tasks.jsonl` | Yes |
| Audit log (active) | `.chorus/audit/{id}.jsonl` | Yes |
| Audit log (completed) | `.chorus/audit/{id}.jsonl.gz` | Yes (compressed) |
| Code changes | `.worktrees/claude-{id}/` | Yes |
| Agent memory | Lost | No (but audit log helps) |

**Audit Log Lifecycle:**

```
Task Created → .chorus/audit/ch-001.jsonl (append-only)
     │
     ▼
Task Doing → Agent output appended to log
     │
     ▼
Task Done/Failed → Log compressed to .jsonl.gz
                   Original .jsonl deleted
```

```typescript
// On task completion
async function archiveAuditLog(taskId: string): Promise<void> {
  const logPath = `.chorus/audit/${taskId}.jsonl`;
  const archivePath = `${logPath}.gz`;

  if (!existsSync(logPath)) return;

  // Compress with gzip
  const content = await readFile(logPath);
  const compressed = await gzip(content);
  await writeFile(archivePath, compressed);

  // Delete original
  await unlink(logPath);
}
```

**Audit Log Contents:**

Full agent session output is stored, not just events:

```jsonl
{"type":"event","event":"claimed","at":"2026-01-12T10:00:00Z"}
{"type":"output","content":"Starting task ch-001...\n","at":"2026-01-12T10:00:01Z"}
{"type":"output","content":"Reading file src/foo.ts...\n","at":"2026-01-12T10:00:02Z"}
{"type":"output","content":"[Claude response...]","at":"2026-01-12T10:00:05Z"}
{"type":"signal","signal":"PROGRESS:25","at":"2026-01-12T10:01:00Z"}
{"type":"event","event":"completed","at":"2026-01-12T10:30:00Z"}
```

**Recovery Modes (Config):**

```typescript
// .chorus/config.json
{
  "crashRecovery": {
    "mode": "auto-reset",  // Only supported mode for now
    "injectAuditLog": true
  }
}
```

Future modes (not MVP):
- `manual`: Ask user what to do with each orphaned task
- `auto-resume`: Try to continue from worktree state (risky)

---

## .chorus Folder Structure

The `.chorus` directory contains all TaskStore data and configuration:

```
.chorus/
├── config.json              # Project configuration (taskId prefix/format)
├── tasks.jsonl              # Main task database (append-only)
│
├── audit/                   # Audit logs per task
│   ├── ch-001.jsonl         # Active task log (full agent output)
│   ├── ch-002.jsonl.gz      # Completed task log (compressed)
│   └── ch-003.jsonl.gz
│
├── reviews/                 # Review details per task
│   ├── ch-001.jsonl         # Review history for ch-001
│   └── ch-002.jsonl
│
└── learnings/               # Learning details per task
    ├── ch-001.jsonl         # Learnings from ch-001
    └── ch-002.jsonl
```

**File Purposes:**

| File | Format | Purpose |
|------|--------|---------|
| `config.json` | JSON | Project settings (taskId prefix, format, padding) |
| `tasks.jsonl` | JSONL | Main task database, one JSON object per line |
| `audit/{id}.jsonl` | JSONL | Full agent output + lifecycle events for active tasks |
| `audit/{id}.jsonl.gz` | Gzipped JSONL | Compressed audit log for completed tasks |
| `reviews/{id}.jsonl` | JSONL | Review history (reviewer, result, comments) |
| `learnings/{id}.jsonl` | JSONL | Learnings discovered during task execution |

**Config.json Schema:**

```json
{
  "taskId": {
    "prefix": "ch",
    "format": "padded",
    "padding": 3
  },
  "crashRecovery": {
    "mode": "auto-reset",
    "injectAuditLog": true
  }
}
```

---

## API Design

### TaskStore Class

```typescript
// src/services/TaskStore.ts

import { EventEmitter } from 'node:events';
import type { Task, TaskStatus, TaskType } from '../types/task.js';

export interface CreateTaskInput {
  title: string;
  description?: string;
  type?: TaskType;               // Optional, defaults to 'task'
  tags?: string[];
  dependencies?: string[];
  model?: string;
  acceptanceCriteria?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  type?: TaskType;
  tags?: string[];
  dependencies?: string[];
  assignee?: string;
  model?: string;
  acceptanceCriteria?: string[];
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  type?: TaskType | TaskType[];
  tags?: string[];                // Match ANY of these tags
  excludeTags?: string[];         // Exclude if ANY of these tags
  assignee?: string;
}

export interface TaskStoreEvents {
  'change': [tasks: Task[]];
  'task:created': [task: Task];
  'task:updated': [task: Task, changes: Partial<Task>];
  'task:closed': [task: Task];
  'task:deleted': [task: Task];
  'error': [error: Error];
}

export class TaskStore extends EventEmitter<TaskStoreEvents> {
  constructor(projectDir: string);

  // ─────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────

  /**
   * Create a new task.
   * @returns The created task with generated ID
   */
  create(input: CreateTaskInput): Task;

  /**
   * Get a task by ID.
   * @returns Task or undefined if not found
   */
  get(id: string): Task | undefined;

  /**
   * Update a task.
   * @throws If task not found
   * @returns Updated task
   */
  update(id: string, changes: UpdateTaskInput): Task;

  /**
   * Soft-delete a task (status → tombstone).
   * @throws If task not found
   */
  delete(id: string, reason?: string): void;

  // ─────────────────────────────────────────────────────────
  // Lifecycle Operations
  // ─────────────────────────────────────────────────────────

  /**
   * Claim a task (status → doing).
   * @throws If task not todo or already claimed
   */
  claim(id: string): Task;

  /**
   * Release a task back to todo status.
   * @throws If task not doing
   */
  release(id: string): Task;

  /**
   * Complete a task (status → done).
   * @throws If task not doing
   */
  complete(id: string, reason?: string): Task;

  /**
   * Reopen a done task (status → todo).
   * @throws If task not done
   */
  reopen(id: string): Task;

  /**
   * Defer a task (status → later).
   * Removes from active work queue.
   */
  defer(id: string): Task;

  /**
   * Mark a task as failed (status → failed).
   */
  fail(id: string, reason?: string): Task;

  // ─────────────────────────────────────────────────────────
  // Query Operations
  // ─────────────────────────────────────────────────────────

  /**
   * List all tasks matching filters.
   * Excludes deleted tasks by default.
   */
  list(filters?: TaskFilters): Task[];

  /**
   * Get tasks ready for assignment.
   * - Status = todo
   * - No unmet dependencies
   * - Not later (deferred)
   * Use selectNextTask() for intelligent selection instead of manual filtering.
   */
  ready(filters?: Pick<TaskFilters, 'tags' | 'excludeTags' | 'type'>): Task[];

  /**
   * Get the next best task to work on using intelligent selection.
   * See "Intelligent Task Selection" section for algorithm details.
   */
  selectNext(context?: TaskSelectionContext): Task | undefined;

  /**
   * Get stuck tasks (have unmet dependencies).
   */
  stuck(): Task[];

  /**
   * Get tasks currently being worked on (doing).
   */
  doing(): Task[];

  /**
   * Get completed tasks (done).
   */
  done(): Task[];

  /**
   * Get deferred tasks (later).
   */
  later(): Task[];

  // ─────────────────────────────────────────────────────────
  // Dependency Operations
  // ─────────────────────────────────────────────────────────

  /**
   * Add a dependency (taskId depends on dependsOnId).
   * @throws If either task not found
   * @throws If would create circular dependency
   */
  addDependency(taskId: string, dependsOnId: string): void;

  /**
   * Remove a dependency.
   */
  removeDependency(taskId: string, dependsOnId: string): void;

  /**
   * Get tasks that depend on this one.
   */
  getDependents(taskId: string): Task[];

  /**
   * Get unmet dependencies for a task.
   */
  getBlockers(taskId: string): Task[];

  /**
   * Check if task has circular dependency.
   */
  hasCircularDependency(taskId: string): boolean;

  // ─────────────────────────────────────────────────────────
  // Tag Operations
  // ─────────────────────────────────────────────────────────

  /**
   * Add a tag to a task.
   */
  addTag(taskId: string, tag: string): Task;

  /**
   * Remove a tag from a task.
   */
  removeTag(taskId: string, tag: string): Task;

  /**
   * Get all unique tags across all tasks.
   */
  getTags(): string[];

  // ─────────────────────────────────────────────────────────
  // Persistence & Lifecycle
  // ─────────────────────────────────────────────────────────

  /**
   * Load tasks from JSONL file.
   * Called automatically on construction.
   */
  load(): void;

  /**
   * Force reload from disk.
   * Emits 'change' event.
   */
  reload(): void;

  /**
   * Start watching for external file changes.
   */
  watch(): void;

  /**
   * Stop watching and cleanup.
   */
  stop(): Promise<void>;

  // ─────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────

  /**
   * Get task statistics.
   */
  getStats(): {
    total: number;
    todo: number;
    doing: number;
    done: number;
    stuck: number;
    later: number;
    failed: number;
    review: number;
  };

  /**
   * Get path to storage file.
   */
  getStoragePath(): string;
}
```

---

## Migration Strategy

### Step 1: Parallel Implementation

Create TaskStore alongside existing Beads integration. Both work, TaskStore is opt-in.

### Step 2: Adapter Pattern

Create adapter that makes TaskStore look like BeadsCLI:

```typescript
// src/services/TaskStoreAdapter.ts
// Temporary - provides BeadsCLI interface using TaskStore

export class TaskStoreAdapter {
  constructor(private store: TaskStore) {}

  async claimTask(id: string, assignee: string): Promise<void> {
    this.store.claim(id, assignee);
  }

  async getReadyTasks(options?: GetReadyOptions): Promise<Task[]> {
    return this.store.ready({
      excludeLabels: options?.excludeLabels,
      labels: options?.includeLabels,
    });
  }

  // ... other methods
}
```

### Step 3: Gradual Migration

Update consumers one at a time:

1. Start with read-only consumers (TaskPanel, hooks)
2. Then read-write services (Orchestrator, CompletionHandler)
3. Finally remove adapter and BeadsCLI

### Step 4: Data Migration

Data migration is **automatic** - we keep the JSONL format:

```bash
# No migration script needed!
# TaskStore reads existing .beads/issues.jsonl
# File format is unchanged
```

### Step 5: Cleanup

Once all consumers migrated:

1. Delete BeadsCLI, BeadsService
2. Rename BeadsParser → TaskParser
3. Update documentation

---

## Testing Strategy

### Unit Tests (AAA Pattern)

```typescript
// src/services/TaskStore.test.ts

describe('TaskStore', () => {
  describe('create', () => {
    it('should create task with sequential ID', () => {
      // Arrange
      const store = new TaskStore(tempDir);

      // Act
      const task = store.create({ title: 'Test Task' });

      // Assert
      expect(task.id).toMatch(/^ch-\d+$/);  // Sequential: ch-1, ch-2, etc.
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('todo');
    });

    it('should emit task:created event', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const handler = vi.fn();
      store.on('task:created', handler);

      // Act
      const task = store.create({ title: 'Test' });

      // Assert
      expect(handler).toHaveBeenCalledWith(task);
    });
  });

  describe('claim', () => {
    it('should transition todo task to doing', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const task = store.create({ title: 'Test' });

      // Act
      const claimed = store.claim(task.id, 'agent-1');

      // Assert
      expect(claimed.status).toBe('doing');
      expect(claimed.assignee).toBe('agent-1');
    });

    it('should throw if task already claimed', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const task = store.create({ title: 'Test' });
      store.claim(task.id, 'agent-1');

      // Act & Assert
      expect(() => store.claim(task.id, 'agent-2'))
        .toThrow('Task is already claimed');
    });
  });

  describe('ready', () => {
    it('should exclude tasks with unmet dependencies', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const blocker = store.create({ title: 'Blocker' });
      const blocked = store.create({
        title: 'Blocked',
        dependencies: [blocker.id],
      });

      // Act
      const ready = store.ready();

      // Assert
      expect(ready).toContainEqual(expect.objectContaining({ id: blocker.id }));
      expect(ready).not.toContainEqual(expect.objectContaining({ id: blocked.id }));
    });

    it('should include task when all dependencies done', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const blocker = store.create({ title: 'Blocker' });
      const blocked = store.create({
        title: 'Blocked',
        dependencies: [blocker.id],
      });
      store.claim(blocker.id, 'agent');
      store.complete(blocker.id);

      // Act
      const ready = store.ready();

      // Assert
      expect(ready).toContainEqual(expect.objectContaining({ id: blocked.id }));
    });
  });

  describe('circular dependencies', () => {
    it('should detect direct circular dependency', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const a = store.create({ title: 'A' });
      const b = store.create({ title: 'B', dependencies: [a.id] });

      // Act & Assert
      expect(() => store.addDependency(a.id, b.id))
        .toThrow('Circular dependency detected');
    });

    it('should detect transitive circular dependency', () => {
      // Arrange
      const store = new TaskStore(tempDir);
      const a = store.create({ title: 'A' });
      const b = store.create({ title: 'B', dependencies: [a.id] });
      const c = store.create({ title: 'C', dependencies: [b.id] });

      // Act & Assert
      expect(() => store.addDependency(a.id, c.id))
        .toThrow('Circular dependency detected');
    });
  });
});
```

### E2E Tests

```typescript
// src/e2e/taskstore.e2e.test.ts

describe('E2E: TaskStore', () => {
  it('should persist tasks across restarts', async () => {
    // Arrange
    const projectDir = createTestProject([]);
    const store1 = new TaskStore(projectDir);
    const task = store1.create({ title: 'Persistent' });
    await store1.stop();

    // Act
    const store2 = new TaskStore(projectDir);
    const loaded = store2.get(task.id);

    // Assert
    expect(loaded).toEqual(task);
  });

  it('should detect external file changes', async () => {
    // Arrange
    const projectDir = createTestProject([]);
    const store = new TaskStore(projectDir);
    store.watch();
    const changeHandler = vi.fn();
    store.on('change', changeHandler);

    // Act - simulate external change (manual file edit)
    const jsonlPath = path.join(projectDir, '.chorus/tasks.jsonl');
    const line = JSON.stringify({
      id: 'ch-999',                          // Sequential ID
      title: 'External Task',
      status: 'todo',
      type: 'task',
      tags: [],
      dependencies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      review_count: 0,
      learnings_count: 0,
      has_learnings: false,
    });
    fs.appendFileSync(jsonlPath, line + '\n');

    // Wait for watcher
    await new Promise(r => setTimeout(r, 100));

    // Assert
    expect(changeHandler).toHaveBeenCalled();
    expect(store.get('ch-999')).toBeDefined();
  });
});
```

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | High | Keep backup, atomic writes, test thoroughly |
| Performance regression | Low | Medium | Benchmark against BeadsCLI |
| Missing feature | Low | Medium | Comprehensive API review |
| File watcher instability | Low | Low | Use proven chokidar settings |
| Circular dependency bugs | Medium | Medium | Thorough graph algorithm tests |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Learning curve | Low | Low | API similar to BeadsCLI |
| Documentation gaps | Medium | Low | Update CLAUDE.md, rules |
| Test coverage gaps | Low | Medium | TDD approach |

### Rollback Plan

If native TaskStore causes issues:

1. Keep BeadsCLI code in a branch
2. TaskStore uses same JSONL format - no data migration needed
3. Can switch back by reverting imports

---

## Appendices

### Appendix A: Full Type Definitions

```typescript
// src/types/task.ts - Complete file

export type TaskStatus =
  | 'todo'      // Ready to work
  | 'doing'     // Agent working
  | 'done'      // Completed
  | 'stuck'     // Has unmet dependencies
  | 'later'     // Deferred
  | 'failed'    // Agent failed
  | 'review';   // Awaiting human review

export type TaskType = 'task' | 'bug' | 'feature' | 'chore';

export interface Task {
  // Identity
  id: string;                    // Sequential: "ch-1", "ch-2", etc.
  title: string;
  description?: string;

  // Classification (no priority - use intelligent selection)
  status: TaskStatus;
  type?: TaskType;               // Optional, defaults to 'task'
  tags: string[];

  // Dependencies
  dependencies: string[];

  // Agent config (flat)
  assignee?: string;
  model?: string;
  acceptanceCriteria?: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Execution stats
  execution?: TaskExecution;

  // Review summary
  reviewCount: number;
  lastReviewedAt?: string;
  reviewResult?: 'approved' | 'rejected' | 'revision';

  // Learning summary
  learningsCount: number;
  hasLearnings: boolean;
}

export interface TaskExecution {
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  iterations: number;
  retryCount: number;            // Crash/failure recovery attempts
  worktree?: string;
  branch?: string;
  finalCommit?: string;
  testsPassed?: number;
  testsTotal?: number;
  qualityPassed?: boolean;
  codeChanges?: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
  };
  lastError?: string;
  failedAt?: string;
  signals?: string[];
}
```

### Appendix B: Dependency Graph Algorithm

```typescript
// Dependency resolution algorithm

/**
 * Check if a task is stuck (has unmet dependencies).
 * O(d) where d = number of dependencies
 */
function isStuck(task: Task, tasks: Map<string, Task>): boolean {
  if (!task.dependencies?.length) return false;

  for (const depId of task.dependencies) {
    const dep = tasks.get(depId);
    if (!dep || dep.status !== 'done') {
      return true;  // Unmet dependency
    }
  }
  return false;
}

/**
 * Detect circular dependencies using DFS.
 * O(V + E) where V = tasks, E = dependencies
 */
function hasCircularDependency(
  taskId: string,
  newDepId: string,
  tasks: Map<string, Task>
): boolean {
  const visited = new Set<string>();
  const stack = [newDepId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === taskId) {
      return true;  // Circular!
    }

    if (visited.has(current)) continue;
    visited.add(current);

    const task = tasks.get(current);
    if (task?.dependencies) {
      stack.push(...task.dependencies);
    }
  }

  return false;
}
```

### Appendix C: Performance Comparison

| Operation | BeadsCLI (subprocess) | TaskStore (native) | Speedup |
|-----------|----------------------|-------------------|---------|
| getTask() | 50-80ms | <1ms | 50-80x |
| getReadyTasks() | 80-120ms | 1-2ms | 40-120x |
| claimTask() | 60-100ms | 2-5ms | 12-50x |
| closeTask() | 60-100ms | 2-5ms | 12-50x |
| list() | 100-200ms | 1-2ms | 50-200x |

Note: Subprocess overhead dominates for simple operations. TaskStore is O(n) for filtering but n is small (typically <500 tasks).

### Appendix D: Consumer Migration Checklist

- [ ] `src/services/Orchestrator.ts`
- [ ] `src/services/CompletionHandler.ts`
- [ ] `src/services/AgentCompletionHandler.ts`
- [ ] `src/services/DependencyResolver.ts`
- [ ] `src/services/IncrementalPlanningTrigger.ts`
- [ ] `src/services/TaskBlocker.ts`
- [ ] `src/services/TaskUpdater.ts`
- [ ] `src/services/RalphLoop.ts`
- [ ] `src/services/PromptBuilder.ts`
- [ ] `src/App.tsx`
- [ ] `src/modes/ImplementationMode.tsx`
- [ ] `src/modes/PlanningMode.tsx`
- [ ] `src/modes/InitMode.tsx`
- [ ] `src/components/TaskPanel.tsx`
- [ ] `src/hooks/useTaskSelection.ts`
- [ ] `src/hooks/useAssignKey.ts`
- [ ] `src/hooks/useSpawnKey.ts`
- [ ] `src/hooks/useRecoveryKeys.ts`
- [ ] `src/hooks/useQuickControlKeys.ts`
- [ ] `src/machines/chorus.machine.ts`
- [ ] `src/machines/agent.machine.ts`
- [ ] `src/cli/commands/WorktreeCommands.ts`
- [ ] `src/commands/recoverBeads.ts` → `recoverTasks.ts`
- [ ] All E2E tests
- [ ] All integration tests
- [ ] Test fixtures and helpers

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-12 | Build native TaskStore | Task management is core to Chorus; external dependency adds friction |
| 2026-01-12 | Keep JSONL format (new schema) | Clean break from Beads, migration script instead of backward compat |
| 2026-01-12 | EventEmitter pattern | Matches existing BeadsService API, easy migration |
| 2026-01-12 | Casual status names | `todo/doing/done/stuck/later` more intuitive than `open/in_progress/closed/blocked/deferred` |
| 2026-01-12 | TaskType optional (not removed) | Keep for familiarity (`task/bug/feature/chore`), defaults to `'task'` |
| 2026-01-12 | Labels → tags | More generic naming, not always milestones |
| 2026-01-12 | Flat custom fields | `model`, `acceptanceCriteria` at top level, not under `custom` |
| 2026-01-12 | **Sequential IDs** (v3.0) | `bd` CLI removed, no external concurrent writes, simpler format `ch-1`, `ch-2` |
| 2026-01-12 | **Remove priority** (v3.0) | Replace with intelligent task selection algorithm (deps → atomicity → series → FIFO) |
| 2026-01-12 | **Intelligent selection** (v3.0) | Algorithm scores tasks by: unblocking potential, atomicity, context continuity |
| 2026-01-12 | Hybrid data storage | Summary in task, detail in `.chorus/{reviews,learnings,audit}/` files |
| 2026-01-12 | Execution stats | Track agent work: duration, iterations, code changes, tests |
| 2026-01-12 | acceptanceCriteria as string[] | Simple array format for agent programmatic verification |
| 2026-01-12 | **agentId REMOVED** (v3.1) | Worktree is task-based, historical tracking of which agent worked is unnecessary |
| 2026-01-12 | No backward compatibility | Migration script + backup, clean break from Beads |
| 2026-01-12 | Defer CLI task creation | Not MVP - Chorus doesn't need CLI for other agents to add tasks |
| 2026-01-12 | Init prefix config (TODO) | Need to add prefix prompt to init wizard, store in `.chorus/config.json` |
| 2026-01-12 | **Crash Recovery** (v3.1) | Auto-reset orphaned "doing" tasks + audit log injection for context |
| 2026-01-12 | No heartbeat/PID (v3.1) | Conservative reset approach is simpler and sufficient |

---

## Task Plan

Atomic tasks for implementing Native TaskStore. Each task follows TDD pattern with explicit test counts.

### Phase 1: Core Types & Storage

#### TS01: Task Type Definitions
**Priority:** P0 (blocks everything)

Create core type definitions for the task system.

**Files:**
- `src/types/task.ts`

**Acceptance Criteria:**
- [ ] `TaskStatus` type with 7 values: `todo`, `doing`, `done`, `stuck`, `later`, `failed`, `review`
- [ ] `TaskType` type with 4 values: `task`, `bug`, `feature`, `chore`
- [ ] `Task` interface with all fields (id, title, status, type, tags, dependencies, etc.)
- [ ] `TaskExecution` interface (timing, iterations, worktree, results)
- [ ] `TaskJSONL` interface for storage format (snake_case)
- [ ] Export all types
- [ ] 0 tests (type-only file, validated by typecheck)

---

#### TS02: TaskStore CRUD Operations
**Priority:** P0
**Depends on:** TS01

Implement basic CRUD operations with in-memory Map storage.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `constructor(projectDir: string)` initializes store
- [ ] `create(input: CreateTaskInput)` creates task with sequential ID
- [ ] `get(id: string)` returns task or undefined
- [ ] `update(id: string, changes)` updates task, throws if not found
- [ ] `delete(id: string)` soft-deletes task (tombstone)
- [ ] Sequential ID generation: `ch-1`, `ch-2`, etc.
- [ ] `initNextId()` continues sequence from existing tasks
- [ ] 8 tests pass

---

#### TS03: JSONL Persistence
**Priority:** P0
**Depends on:** TS02

Implement JSONL file reading and writing with atomic writes.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `load()` reads tasks from `.chorus/tasks.jsonl`
- [ ] `flush()` writes tasks to JSONL (append-only for new/updated)
- [ ] Atomic write: temp file → rename
- [ ] Creates `.chorus/` directory if not exists
- [ ] Handles empty/missing file gracefully
- [ ] Parse JSONL to Task (snake_case → camelCase)
- [ ] Serialize Task to JSONL (camelCase → snake_case)
- [ ] 6 tests pass

---

### Phase 2: Lifecycle Operations

#### TS04: Task Lifecycle Methods
**Priority:** P0
**Depends on:** TS03

Implement task status transitions.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `claim(id)` transitions `todo` → `doing`, throws if not claimable
- [ ] `release(id)` transitions `doing` → `todo`
- [ ] `complete(id, reason?)` transitions `doing` → `done`
- [ ] `fail(id, reason?)` transitions `doing` → `failed`, sets lastError
- [ ] `defer(id)` transitions to `later`
- [ ] `reopen(id)` transitions `done`/`failed` → `todo`
- [ ] Invalid transitions throw descriptive errors
- [ ] Updates `execution.startedAt` on claim
- [ ] Updates `execution.completedAt` on complete/fail
- [ ] 12 tests pass

---

#### TS04-E2E: Lifecycle E2E Tests
**Priority:** P1
**Depends on:** TS04

E2E tests for task lifecycle.

**Files:**
- `src/e2e/taskstore-lifecycle.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Lifecycle state persists across TaskStore restarts
- [ ] Claim → complete → reopen cycle works
- [ ] Claim → fail → reopen cycle works
- [ ] Invalid transitions return proper errors
- [ ] 4 tests pass

---

### Phase 3: Queries

#### TS05: Query Methods
**Priority:** P0
**Depends on:** TS04

Implement filtering and query methods.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `list(filters?)` returns tasks matching filters
- [ ] Filter by status (single or array)
- [ ] Filter by type (single or array)
- [ ] Filter by tags (match ANY)
- [ ] Filter by excludeTags (exclude if ANY)
- [ ] `ready()` returns `todo` tasks with no unmet dependencies
- [ ] `doing()` returns tasks with status `doing`
- [ ] `done()` returns tasks with status `done`
- [ ] `stuck()` returns tasks with unmet dependencies
- [ ] `later()` returns tasks with status `later`
- [ ] `getStats()` returns count per status
- [ ] 10 tests pass

---

#### TS05-E2E: Query E2E Tests
**Priority:** P1
**Depends on:** TS05

E2E tests for query methods.

**Files:**
- `src/e2e/taskstore-queries.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Filters work correctly with persisted data
- [ ] `ready()` excludes stuck tasks
- [ ] `getStats()` returns accurate counts
- [ ] 3 tests pass

---

### Phase 4: Dependencies

#### TS06: Dependency Management
**Priority:** P0
**Depends on:** TS05

Implement dependency tracking and circular detection.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `addDependency(taskId, dependsOnId)` adds dependency
- [ ] `removeDependency(taskId, dependsOnId)` removes dependency
- [ ] `getDependents(taskId)` returns tasks that depend on this one
- [ ] `getBlockers(taskId)` returns unmet dependency tasks
- [ ] `hasCircularDependency(taskId, newDepId)` detects cycles (DFS)
- [ ] `addDependency` throws on circular dependency
- [ ] When task completes, dependents become unblocked
- [ ] Computed property `isBlocked` works correctly
- [ ] Computed property `isReady` works correctly
- [ ] 10 tests pass

---

#### TS06-E2E: Dependency E2E Tests
**Priority:** P1
**Depends on:** TS06

E2E tests for dependency management.

**Files:**
- `src/e2e/taskstore-dependencies.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Dependencies persist across restarts
- [ ] Completing blocker unblocks dependent
- [ ] Circular dependency prevented
- [ ] 3 tests pass

---

### Phase 5: Tags & Events

#### TS07: Tag Operations
**Priority:** P1
**Depends on:** TS06

Implement tag management.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `addTag(taskId, tag)` adds tag if not present
- [ ] `removeTag(taskId, tag)` removes tag
- [ ] `getTags()` returns all unique tags across tasks
- [ ] Tags are case-sensitive
- [ ] 4 tests pass

---

#### TS08: EventEmitter Integration
**Priority:** P1
**Depends on:** TS07

Implement event emission for all mutations.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] TaskStore extends EventEmitter
- [ ] Emits `task:created` on create
- [ ] Emits `task:updated` on update/lifecycle methods
- [ ] Emits `task:closed` on complete
- [ ] Emits `task:deleted` on delete
- [ ] Emits `change` after any mutation (with all tasks)
- [ ] Emits `error` on errors (optional)
- [ ] 7 tests pass

---

#### TS08-E2E: Events E2E Tests
**Priority:** P1
**Depends on:** TS08

E2E tests for event emission.

**Files:**
- `src/e2e/taskstore-events.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Events fire correctly for lifecycle changes
- [ ] `change` event includes updated task list
- [ ] 2 tests pass

---

### Phase 6: Intelligent Selection

#### TS09: Task Selector
**Priority:** P1
**Depends on:** TS06

Implement intelligent task selection algorithm.

**Files:**
- `src/services/TaskSelector.ts`
- `src/services/TaskSelector.test.ts`

**Acceptance Criteria:**
- [ ] `selectNextTask(tasks, context?)` returns best task
- [ ] User hint bonus: +200 for `next` tag
- [ ] Dependency unblocking bonus: +100 per stuck dependent
- [ ] Milestone focus bonus: +30 per same-milestone task completed
- [ ] Series continuation bonus: +25 per shared tag with last task
- [ ] Atomicity bonus: +50 for tasks with no dependencies
- [ ] Preferred tags bonus: +10 per matching tag
- [ ] FIFO fallback: oldest task wins ties
- [ ] Returns undefined if no ready tasks
- [ ] 10 tests pass

---

#### TS10: TaskStore selectNext Integration
**Priority:** P1
**Depends on:** TS09

Integrate TaskSelector into TaskStore.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `selectNext(context?)` calls TaskSelector with current tasks
- [ ] `excludeIds` parameter filters out specified tasks
- [ ] Returns best ready task or undefined
- [ ] 4 tests pass

---

#### TS10-E2E: Selection E2E Tests
**Priority:** P1
**Depends on:** TS10

E2E tests for intelligent selection.

**Files:**
- `src/e2e/taskstore-selection.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Selection prefers unblocking tasks
- [ ] Selection continues series (same tag)
- [ ] Selection respects `next` tag override
- [ ] Selection focuses on milestone completion
- [ ] 4 tests pass

---

#### TS10-E2E-PARALLEL: Parallel Agent Selection Tests
**Priority:** P1
**Depends on:** TS10-E2E

E2E tests for parallel agent coordination.

**Files:**
- `src/e2e/taskstore-parallel-selection.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Two agents claim different tasks concurrently
- [ ] `excludeIds` prevents double-claiming
- [ ] Race condition throws on double-claim attempt
- [ ] 3 tests pass

---

### Phase 7: File Watching

#### TS11: File Watcher
**Priority:** P2
**Depends on:** TS08

Implement external file change detection.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `watch()` starts chokidar watcher on `.chorus/tasks.jsonl`
- [ ] `stop()` stops watcher and cleans up
- [ ] External file changes trigger `reload()`
- [ ] `reload()` re-reads file and emits `change`
- [ ] Debounce rapid changes (100ms)
- [ ] 4 tests pass

---

#### TS11-E2E: File Watcher E2E Tests
**Priority:** P2
**Depends on:** TS11

E2E tests for file watching.

**Files:**
- `src/e2e/taskstore-watcher.e2e.test.ts`

**Acceptance Criteria:**
- [ ] External file edit triggers reload
- [ ] New tasks from external edit are available
- [ ] 2 tests pass

---

### Phase 8: Crash Recovery

#### TS12: Crash Recovery Service
**Priority:** P1
**Depends on:** TS08

Implement crash recovery logic.

**Files:**
- `src/services/CrashRecovery.ts`
- `src/services/CrashRecovery.test.ts`

**Acceptance Criteria:**
- [ ] `recoverOrphanedTasks(store)` finds `doing` tasks
- [ ] Resets orphaned tasks to `todo`
- [ ] Increments `retryCount` in execution
- [ ] Logs `crash_recovery` event to audit
- [ ] Returns recovery result with count and task IDs
- [ ] 5 tests pass

---

#### TS13: Recovery Context Injection
**Priority:** P1
**Depends on:** TS12

Implement audit log injection for recovered tasks.

**Files:**
- `src/services/CrashRecovery.ts`
- `src/services/CrashRecovery.test.ts`

**Acceptance Criteria:**
- [ ] `getRecoveryContext(taskId, store)` checks retryCount
- [ ] Returns undefined if no previous attempts
- [ ] Reads audit log from `.chorus/audit/{id}.jsonl`
- [ ] Checks worktree for uncommitted changes
- [ ] Returns RecoveryContext with instruction message
- [ ] 5 tests pass

---

#### TS13-E2E: Crash Recovery E2E Tests
**Priority:** P1
**Depends on:** TS13

Comprehensive E2E tests for all crash recovery scenarios.

**Files:**
- `src/e2e/taskstore-recovery.e2e.test.ts`

**Acceptance Criteria:**
- [ ] Orphaned `doing` task is reset to `todo` on startup
- [ ] Multiple orphaned tasks are all recovered
- [ ] `retryCount` is incremented correctly
- [ ] `crash_recovery` event is logged to audit
- [ ] Recovery context includes audit log content
- [ ] Recovery context detects worktree with uncommitted changes
- [ ] Recovery context has correct instruction message
- [ ] Task without previous attempts returns no recovery context
- [ ] Second crash increments retryCount to 2
- [ ] 9 tests pass

---

### Phase 9: Audit Logging

#### TS14: Audit Log Writer
**Priority:** P1
**Depends on:** TS03

Implement audit log writing.

**Files:**
- `src/services/TaskStore.ts`
- `src/services/TaskStore.test.ts`

**Acceptance Criteria:**
- [ ] `audit(taskId, entry)` appends to `.chorus/audit/{id}.jsonl`
- [ ] Creates audit directory if not exists
- [ ] Audit entry includes event type, timestamp, details
- [ ] Lifecycle methods auto-audit (claim, complete, fail, etc.)
- [ ] 4 tests pass

---

#### TS15: Audit Log Reader
**Priority:** P1
**Depends on:** TS14

Implement audit log reading.

**Files:**
- `src/services/AuditLog.ts`
- `src/services/AuditLog.test.ts`

**Acceptance Criteria:**
- [ ] `readAuditLog(taskId)` returns array of AuditEntry
- [ ] Returns empty array if file doesn't exist
- [ ] Parses JSONL correctly
- [ ] Reads compressed `.jsonl.gz` files
- [ ] 4 tests pass

---

#### TS15b: Audit Log Compression
**Priority:** P1
**Depends on:** TS15

Implement audit log compression on task completion.

**Files:**
- `src/services/AuditLog.ts`
- `src/services/AuditLog.test.ts`

**Acceptance Criteria:**
- [ ] `archiveAuditLog(taskId)` compresses log to `.jsonl.gz`
- [ ] Original `.jsonl` file is deleted after compression
- [ ] Does nothing if log file doesn't exist
- [ ] Compression uses gzip format
- [ ] TaskStore `complete()` and `fail()` call `archiveAuditLog()`
- [ ] 5 tests pass

---

### Phase 10: Init Configuration

#### TS16a: Init Prefix Wizard
**Priority:** P1
**Depends on:** TS03

Implement init wizard for task ID configuration.

**Files:**
- `src/modes/InitMode.tsx` (or relevant init file)
- `src/services/TaskIdConfig.ts`
- `src/services/TaskIdConfig.test.ts`

**Acceptance Criteria:**
- [ ] Init prompts for project name
- [ ] `suggestPrefix(projectName)` generates prefix from name
- [ ] User can accept or override suggested prefix
- [ ] Init prompts for ID format (simple/padded)
- [ ] Init prompts for padding width (if padded)
- [ ] Config saved to `.chorus/config.json`
- [ ] 6 tests pass

---

### Phase 11: Migration

#### TS16: BeadsCLI Adapter
**Priority:** P1
**Depends on:** TS10

Create adapter for gradual migration.

**Files:**
- `src/services/TaskStoreAdapter.ts`
- `src/services/TaskStoreAdapter.test.ts`

**Acceptance Criteria:**
- [ ] Implements BeadsCLI interface using TaskStore
- [ ] `claimTask()` calls `store.claim()`
- [ ] `getReadyTasks()` calls `store.ready()`
- [ ] `closeTask()` calls `store.complete()`
- [ ] Maps Bead ↔ Task types
- [ ] 5 tests pass

---

#### TS17: Migrate Orchestrator
**Priority:** P1
**Depends on:** TS16

Replace BeadsCLI in Orchestrator.

**Files:**
- `src/services/Orchestrator.ts`
- `src/services/Orchestrator.test.ts`

**Acceptance Criteria:**
- [ ] Uses TaskStore instead of BeadsCLI
- [ ] All existing Orchestrator tests pass
- [ ] 0 new tests (existing tests validate)

---

#### TS18: Migrate UI Components
**Priority:** P1
**Depends on:** TS17

Update UI components to use Task type.

**Files:**
- `src/components/TaskPanel.tsx`
- `src/modes/ImplementationMode.tsx`
- `src/hooks/useTaskSelection.ts`

**Acceptance Criteria:**
- [ ] Components use Task instead of Bead
- [ ] Props updated for new types
- [ ] Existing E2E tests pass
- [ ] 0 new tests (existing tests validate)

---

#### TS19: Migrate Remaining Services
**Priority:** P1
**Depends on:** TS18

Update all remaining services.

**Files:**
- `src/services/CompletionHandler.ts`
- `src/services/DependencyResolver.ts`
- `src/services/AgentCompletionHandler.ts`
- `src/services/TaskBlocker.ts`
- `src/services/TaskUpdater.ts`
- `src/services/RalphLoop.ts`

**Acceptance Criteria:**
- [ ] All services use TaskStore
- [ ] No BeadsCLI imports remain in services
- [ ] All existing tests pass
- [ ] 0 new tests (existing tests validate)

---

### Phase 12: Cleanup

#### TS20: Delete Beads Service Files
**Priority:** P2
**Depends on:** TS19

Remove old Beads service implementation.

**Files to delete:**
- `src/services/BeadsCLI.ts`
- `src/services/BeadsCLI.test.ts`
- `src/services/BeadsService.ts`
- `src/services/BeadsService.test.ts`
- `src/services/BeadsParser.ts`
- `src/services/BeadsParser.test.ts`
- `src/types/bead.ts`
- `src/test/fixtures/mockBeadsCLI.ts`

**Acceptance Criteria:**
- [ ] All Beads service files deleted
- [ ] No remaining imports of deleted files
- [ ] `npm run quality` passes
- [ ] 0 tests (deletion task)

---

#### TS20a: Migrate Beads E2E Tests
**Priority:** P2
**Depends on:** TS20

Migrate or remove Beads-specific E2E tests.

**Files to update/delete:**
- `src/e2e/beads-cli.e2e.test.ts` → Delete or migrate to TaskStore
- `src/e2e/fresh-init.e2e.test.ts` → Update for TaskStore
- Any test using `createTestProject()` with Beads

**Acceptance Criteria:**
- [ ] E2E tests use TaskStore instead of Beads
- [ ] `createTestProject()` creates `.chorus/` structure
- [ ] All E2E tests pass
- [ ] 0 new tests (migration task)

---

#### TS20b: Migrate Beads Unit Tests
**Priority:** P2
**Depends on:** TS20a

Update unit tests that mock BeadsCLI.

**Files to update:**
- Any test file importing from `BeadsCLI` or `BeadsService`
- Test fixtures using Bead types

**Acceptance Criteria:**
- [ ] All mocks use Task/TaskStore types
- [ ] No Bead type imports remain
- [ ] All unit tests pass
- [ ] 0 new tests (migration task)

---

#### TS20c: Update Test Fixtures
**Priority:** P2
**Depends on:** TS20b

Update test fixture files and helpers.

**Files to update:**
- `src/test-utils/e2e-fixtures.ts`
- `src/test-utils/e2e-helpers.ts`
- Any mock factories

**Acceptance Criteria:**
- [ ] Fixtures create Task objects instead of Bead
- [ ] `createTestProject()` uses `.chorus/tasks.jsonl`
- [ ] Helper functions updated for TaskStore
- [ ] All tests pass
- [ ] 0 new tests (migration task)

---

#### TS21: Update Documentation
**Priority:** P2
**Depends on:** TS20c

Update CLAUDE.md and rules files.

**Files:**
- `CLAUDE.md`
- `.claude/rules/beads-task-tracking.md` → Rename to `task-tracking.md`

**Acceptance Criteria:**
- [ ] CLAUDE.md references TaskStore instead of Beads
- [ ] `bd` commands replaced with TaskStore API
- [ ] Rules file renamed and updated
- [ ] 0 tests (documentation task)

---

### Task Summary

| Phase | Tasks | Tests |
|-------|-------|-------|
| 1. Core Types & Storage | TS01, TS02, TS03 | 14 |
| 2. Lifecycle | TS04, TS04-E2E | 16 |
| 3. Queries | TS05, TS05-E2E | 13 |
| 4. Dependencies | TS06, TS06-E2E | 13 |
| 5. Tags & Events | TS07, TS08, TS08-E2E | 13 |
| 6. Selection | TS09, TS10, TS10-E2E, TS10-E2E-PARALLEL | 21 |
| 7. File Watching | TS11, TS11-E2E | 6 |
| 8. Crash Recovery | TS12, TS13, TS13-E2E | 19 |
| 9. Audit Logging | TS14, TS15, TS15b | 13 |
| 10. Init Configuration | TS16a | 6 |
| 11. Migration | TS16, TS17, TS18, TS19 | 5 |
| 12. Cleanup | TS20, TS20a, TS20b, TS20c, TS21 | 0 |
| **Total** | **28 tasks** | **~139 tests** |

### Dependency Graph

```
TS01 ─────────────────────────────────────────────────────────────┐
  │                                                                │
  ▼                                                                │
TS02 → TS03 → TS04 → TS05 → TS06 → TS07 → TS08 ──────────────────┤
         │      │      │      │             │                      │
         │      ▼      ▼      ▼             ▼                      │
         │   TS04-E2E TS05-E2E TS06-E2E  TS08-E2E                 │
         │                     │                                   │
         │                     ▼                                   │
         │                   TS09 → TS10 → TS10-E2E → TS10-E2E-PARALLEL
         │                                                         │
         │                                                         │
         ├────────────────────→ TS14 → TS15 → TS15b               │
         │                                                         │
         ├────────────────────→ TS16a (Init Config)               │
         │                                                         │
         │  TS08 ─────────────────────→ TS11 → TS11-E2E           │
         │                                                         │
         │                              TS12 → TS13 → TS13-E2E    │
         │                                                         │
         │                                                         │
TS10 ────┼───────────────────────────────────→ TS16 (Adapter) ────┤
         │                                       │                 │
         │                                       ▼                 │
         │                                     TS17 → TS18 → TS19 │
         │                                                   │     │
         │                                                   ▼     │
         │                        TS20 → TS20a → TS20b → TS20c → TS21
         │                                                         │
         └─────────────────────────────────────────────────────────┘
```

---

**End of Specification**
