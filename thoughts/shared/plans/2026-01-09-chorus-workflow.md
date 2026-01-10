# Chorus Workflow: End-to-End Multi-Agent Orchestration

**Date:** 2026-01-09
**Status:** APPROVED - Implementation in Progress
**Version:** 2.1

---

## Table of Contents

1. [Overview](#overview)
2. [Key Decisions (Resolved)](#key-decisions-resolved)
3. [Architecture](#architecture)
4. [Operating Modes](#operating-modes)
5. [Initialization Flow](#initialization-flow)
6. [Task Creation & Management](#task-creation--management)
7. [Agent Lifecycle](#agent-lifecycle)
8. [Background Merge Service](#background-merge-service)
9. [Automatic Mode (Ralph Wiggum)](#automatic-mode-ralph-wiggum)
10. [Memory System](#memory-system)
11. [Hooks Integration](#hooks-integration)
12. [Human Intervention](#human-intervention)
13. [Rollback & Recovery](#rollback--recovery)
14. [TUI Visualization](#tui-visualization)

---

## Overview

### What is Chorus?

Chorus is an Ink-based (React for CLI) TUI that orchestrates multiple AI coding agents working on a shared codebase. It provides:

- **Two operating modes**: Semi-auto (user-controlled) and Autopilot (fully autonomous)
- **Visual orchestration**: See all agents and tasks in a tiling view
- **Automatic mode**: Ralph Wiggum pattern for autonomous task completion
- **Memory persistence**: Shared learnings across all agent types
- **Intervention controls**: Pause, rollback, redirect agents mid-flight
- **Intelligent conflict resolution**: Agent-first, human-fallback approach

### Design Principles

1. **Agent-Agnostic**: Works with claude-code, codex, and opencode
2. **Non-Invasive**: Uses existing tools (Beads, git worktrees) rather than reinventing
3. **Fail-Safe**: Can recover from crashes, bad commits, stuck agents
4. **Observable**: Every action is visible in TUI and logged
5. **Interruptible**: Human can intervene at any point without data loss
6. **Simple First**: Minimal services, clear responsibilities

---

## Key Decisions (Resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Multi-agent support? | YES - claude, codex, opencode (no aider) |
| 2 | Worktrees? | REQUIRED - with background merge service |
| 3 | Task management? | Beads only (no built-in) |
| 4 | Auto-mode control? | Max agents + priority queue |
| 5 | Review process? | Automated (tests + acceptance criteria) |
| 6 | Completion detection? | Signal + Tests (AND logic) |
| 7 | Prompt construction? | Inject task context + learnings |
| 8 | Conflict resolution? | Agent-first, human-fallback |
| 9 | Operating modes? | Semi-auto (default) + Autopilot |
| **10** | **MVP Scope?** | **Claude-only (codex/opencode deferred)** |

### Decision Details

#### 1. Multi-Agent Support: claude, codex, opencode

> **MVP SCOPE:** Claude-only. Codex and OpenCode support deferred.
> See deferred tasks: F07b (context injection), F03c (CLI detection), F42 (learning injector)

**Rationale:**
- All support autonomous/non-interactive mode
- Cost optimization: route simple tasks to cheaper agents
- Different strengths per agent type

**Implementation:**
```json
{
  "agents": {
    "default": "claude",
    "available": {
      "claude": { "command": "claude", "args": ["--dangerously-skip-permissions"] },
      "codex": { "command": "codex", "args": ["--full-auto"] },
      "opencode": { "command": "opencode", "args": ["-p"] }
    }
  }
}
```

**Context Injection for Non-Claude Agents:**
Claude-code natively loads `.claude/rules` and `.claude/skills`. For codex and opencode, we inject context via prompt prefix:

```typescript
function buildPrompt(agent: AgentType, task: Task): string {
  const taskPrompt = loadTaskPrompt(task);

  if (agent === 'claude') {
    // Claude loads its own context
    return taskPrompt;
  }

  // Inject context for other agents
  const agentsMd = fs.readFileSync('AGENTS.md', 'utf-8');
  const learnings = loadRelevantLearnings(task.labels);

  return `
# Project Context
${agentsMd}

# Relevant Learnings
${learnings}

# Task
${taskPrompt}
`;
}
```

#### 2. Worktrees: REQUIRED

Each agent works in an isolated git worktree:
- Path: `.worktrees/{agent-type}-{task-id}`
- Branch: `agent/{agent-type}/{task-id}`
- Enables true parallel operation
- Background merge service handles integration

#### 3. Conflict Resolution: Agent-First

When merge conflicts occur:
1. **Simple conflicts** → Auto-resolve (merge drivers)
2. **Medium conflicts** → Rebase + retry
3. **Complex conflicts** → Spawn resolver agent
4. **If agent fails** → Human intervention

See [Conflict Resolution Strategy](#conflict-resolution-strategy) for details.

#### 4. Operating Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **semi-auto** | User selects tasks, agent completes one, stops | Learning, careful work |
| **autopilot** | Runs until no ready tasks remain | Batch processing, overnight |

---

## Architecture

### Simplified Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHORUS ARCHITECTURE (v2)                      │
└─────────────────────────────────────────────────────────────────┘

                      ┌─────────────────┐
                      │   ChorusApp     │
                      │   (Ink root)    │
                      └────────┬────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌───────────┐
        │TaskPanel │    │AgentGrid │    │HeaderBar  │
        └────┬─────┘    └────┬─────┘    │FooterBar  │
             │               │          └─────┬─────┘
             └───────────────┼────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
         ┌───────────────┐       ┌───────────────┐
         │  taskStore    │       │  agentStore   │
         │  (Zustand)    │       │  (Zustand)    │
         └───────┬───────┘       └───────┬───────┘
                 │                       │
                 └───────────┬───────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
         ┌───────────────┐       ┌───────────────┐
         │ Orchestrator  │◄─────►│ MergeService  │
         │ (coordinator) │       │ (background)  │
         └───────────────┘       └───────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ bd CLI  │ │ git CLI │ │ agent   │
│ (tasks) │ │(worktree)│ │ CLI     │
└─────────┘ └─────────┘ └─────────┘
```

**Key Insight:** Only 2 services needed:
- **Orchestrator**: Coordinates everything (tasks, agents, worktrees)
- **MergeService**: Background merge queue with conflict resolution

### State Management

Single source of truth: `.chorus/state.json`

```typescript
interface ChorusState {
  version: string;
  mode: 'autopilot' | 'semi-auto';

  agents: {
    [id: string]: {
      type: 'claude' | 'codex' | 'opencode';
      pid: number;
      taskId: string;
      worktree: string;
      branch: string;
      iteration: number;
      startedAt: number;
    };
  };

  mergeQueue: {
    taskId: string;
    branch: string;
    status: 'pending' | 'merging' | 'conflict' | 'resolving';
    retries: number;
  }[];

  checkpoint: string;  // git tag for recovery

  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    mergesAuto: number;
    mergesManual: number;
    totalRuntime: number;
  };
}
```

**Recovery on restart:**
```typescript
function recover(): void {
  const state = loadState('.chorus/state.json');

  // Kill orphan processes
  for (const [id, agent] of Object.entries(state.agents)) {
    if (!processExists(agent.pid)) {
      // Agent crashed, task goes back to pending
      exec(`bd update ${agent.taskId} --status=pending`);
      delete state.agents[id];
    }
  }

  // Resume merge queue
  mergeService.resumeQueue(state.mergeQueue);

  saveState(state);
}
```

---

## Operating Modes

### Semi-Auto Mode (Default)

User-controlled workflow for careful, supervised operation.

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEMI-AUTO MODE                              │
└─────────────────────────────────────────────────────────────────┘

User Flow:
1. View tasks in TaskPanel
2. Select task (arrow keys)
3. Press Enter → assign to agent
4. Watch agent work in AgentTile
5. Agent completes → outputs <chorus>COMPLETE</chorus>
6. Task marked closed
7. Agent STOPS (does not pick new task)
8. User decides next action

Key Behaviors:
├── Agent completes one task then stops
├── User explicitly starts each task
├── Task panel updates in real-time
├── Multiple agents can run in parallel
└── User maintains full control
```

### Autopilot Mode

Fully autonomous operation until all tasks complete.

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTOPILOT MODE                              │
└─────────────────────────────────────────────────────────────────┘

Behavior:
1. Get ready tasks: bd ready --json
2. Sort by priority (P1 > P2 > P3 > P4)
3. While running_agents < maxAgents AND tasks_available:
   - Pick next task by priority/routing
   - Spawn agent in worktree
4. On agent completion:
   - Queue branch for merge
   - Close task
   - Pick next ready task (if any)
5. Continue until no ready tasks remain

Key Behaviors:
├── Runs until queue empty
├── Respects dependency chains
├── Auto-spawns new agents when slots free
├── Can be paused/resumed
└── Safeguards prevent runaway (max iterations, timeout)
```

### Mode Switching

```
TUI: Press 'm' to toggle mode

CLI:
npx chorus                    # Start in semi-auto (default)
npx chorus --autopilot        # Start in autopilot
npx chorus --mode semi-auto   # Explicit mode

Config (.chorus/config.json):
{
  "mode": "semi-auto"  // or "autopilot"
}
```

---

## Initialization Flow

### First-Time Setup: `chorus init`

```
┌─────────────────────────────────────────────────────────────────┐
│                    chorus init --interactive                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check Prerequisites                                      │
│ ├── git repo initialized?                                        │
│ ├── Node.js >= 20?                                               │
│ ├── bd (Beads) installed?                                        │
│ └── At least one agent CLI available? (claude/codex/opencode)    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Missing?                      │
              │ → Show install instructions   │
              │ → Offer to install (if npm)   │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Detect Project Settings                                  │
│                                                                  │
│ Auto-detect from package.json / pyproject.toml / go.mod:         │
│ ├── testCommand: "npm test" / "pytest" / "go test ./..."         │
│ ├── buildCommand: "npm run build" / etc.                         │
│ └── Project type for routing hints                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Create Directory Structure                               │
│                                                                  │
│ .chorus/                     # Chorus config                     │
│ ├── config.json              # Settings                          │
│ ├── state.json               # Runtime state (gitignored)        │
│ └── hooks/                   # Optional lifecycle hooks          │
│                                                                  │
│ .agent/                      # Agent memory                      │
│ ├── learnings.md             # Shared knowledge                  │
│ └── scratchpad.md            # Per-session notes                 │
│                                                                  │
│ .beads/                      # Task queue (via bd init)          │
│ └── issues.jsonl             # Tasks database                    │
│                                                                  │
│ .worktrees/                  # Parallel workspaces (gitignored)  │
│                                                                  │
│ AGENTS.md                    # Project instructions (all agents) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Configure Agents                                         │
│                                                                  │
│ Detected agents:                                                 │
│ ✓ claude (Claude Code)                                           │
│ ✓ codex (Codex CLI)                                              │
│ ○ opencode (not found)                                           │
│                                                                  │
│ Default agent: [claude]                                          │
│ Max parallel agents: [3]                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Update .gitignore                                        │
│                                                                  │
│ Added:                                                           │
│ .worktrees/                                                      │
│ .chorus/state.json                                               │
│ .agent/scratchpad.md                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Done!                                                    │
│                                                                  │
│ ✓ Chorus initialized successfully                                │
│                                                                  │
│ Next steps:                                                      │
│ 1. Edit AGENTS.md with project conventions                       │
│ 2. Create tasks: bd create "Your first task" -p 1                │
│ 3. Start TUI: npx chorus                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Config File: `.chorus/config.json`

Simplified configuration with sensible defaults:

```json
{
  "$schema": "https://chorus.dev/schema/v2.json",
  "version": "2.0",

  "mode": "semi-auto",

  "agents": {
    "default": "claude",
    "maxParallel": 3,
    "available": {
      "claude": {
        "command": "claude",
        "args": ["--dangerously-skip-permissions"],
        "model": "sonnet",
        "allowModelOverride": true
      },
      "codex": {
        "command": "codex",
        "args": ["--full-auto"]
      },
      "opencode": {
        "command": "opencode",
        "args": ["-p"]
      }
    }
  },

  "project": {
    "testCommand": "npm test",
    "buildCommand": "npm run build"
  },

  "completion": {
    "signal": "<chorus>COMPLETE</chorus>",
    "requireTests": true,
    "maxIterations": 50,
    "taskTimeout": 1800000
  },

  "merge": {
    "autoResolve": true,
    "agentResolve": true,
    "requireApproval": false
  },

  "tui": {
    "agentGrid": "auto"
  }
}
```

---

## Task Creation & Management

### Task Sources

```
┌─────────────────────────────────────────────────────────────────┐
│                       TASK SOURCES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BEADS CLI (Primary)                                          │
│     bd create "Task description" -p 1 -l feature                 │
│     → .beads/issues.jsonl                                        │
│     → Full dependency support                                    │
│     → Hash-based IDs (ch-xxxx)                                   │
│                                                                  │
│  2. TUI Quick-Add                                                │
│     Press 'n' → Enter task details → Creates Beads task          │
│     → Convenience wrapper around bd create                       │
│                                                                  │
│  3. Chorus CLI (Convenience)                                     │
│     chorus task create "Task description" -p 1                   │
│     → Wrapper that calls bd create                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Note: GitHub Issues import and PRD parsing planned for v2.
```

### BeadsCLI Integration

**IMPORTANT:** All Chorus components MUST access Beads through `BeadsCLI` service. Direct `bd` CLI calls are prohibited.

```typescript
// src/services/BeadsCLI.ts - Single point of Beads access

interface GetReadyOptions {
  excludeLabels?: string[];  // e.g., ['deferred', 'v2']
  includeLabels?: string[];  // e.g., ['m1-infrastructure']
}

class BeadsCLI {

  async getReadyTasks(options?: GetReadyOptions): Promise<Task[]> {
    const { stdout } = await exec('bd ready --json');
    let tasks = JSON.parse(stdout);

    // Apply label filtering (in-memory)
    if (options?.excludeLabels?.length) {
      tasks = tasks.filter(t =>
        !t.labels.some(l => options.excludeLabels!.includes(l))
      );
    }
    if (options?.includeLabels?.length) {
      tasks = tasks.filter(t =>
        t.labels.some(l => options.includeLabels!.includes(l))
      );
    }

    return tasks;
  }

  async claimTask(taskId: string, agentId: string): Promise<void> {
    await exec(`bd update ${taskId} --status=in_progress --assignee=${agentId}`);
  }

  async releaseTask(taskId: string): Promise<void> {
    await exec(`bd update ${taskId} --status=open --assignee=`);
  }

  async closeTask(taskId: string): Promise<void> {
    await exec(`bd close ${taskId}`);
  }

  async createTask(title: string, options: TaskOptions): Promise<string> {
    const args = [`bd create "${title}"`];
    if (options.priority) args.push(`-p ${options.priority}`);
    if (options.labels) args.push(`-l ${options.labels.join(',')}`);
    if (options.depends) args.push(`--depends ${options.depends.join(',')}`);
    if (options.model) args.push(`--custom model=${options.model}`);

    const { stdout } = await exec(args.join(' '));
    return stdout.trim();
  }

  async getTask(taskId: string): Promise<Task | null> {
    try {
      const { stdout } = await exec(`bd show ${taskId} --json`);
      return JSON.parse(stdout);
    } catch {
      return null;
    }
  }

  isAvailable(): boolean { /* check bd in PATH */ }
  isInitialized(): boolean { /* check .beads/ exists */ }
}
```

### Deferred Tasks

Tasks can be marked as `deferred` to exclude them from active development:

```bash
# Mark task as deferred
bd label add ch-xxx deferred

# Remove deferred label
bd label remove ch-xxx deferred
```

**Behavior:**
- `getReadyTasks()` excludes `deferred` by default in production
- TUI shows deferred tasks grayed out (not selectable)
- Autopilot mode never picks deferred tasks
- Deferred tasks remain in dependency graph (can still block others)

**Use cases:**
- Features planned for v2
- Non-Claude agent support (until ready)
- Experimental features

### Task Format with Custom Fields

Beads tasks can include custom fields for Chorus:

```json
{
  "id": "ch-a1b2",
  "title": "Implement JWT authentication",
  "description": "Replace session-based auth with JWT tokens",
  "priority": 1,
  "labels": ["feature", "auth"],
  "status": "open",
  "dependencies": ["ch-x1y2"],
  "custom": {
    "model": "opus-4.5",
    "agent": "claude",
    "acceptance_criteria": [
      "JWT token generation works",
      "Refresh token rotates correctly",
      "All existing tests pass"
    ]
  }
}
```

### Task States & Transitions

```
                                    ┌─────────────┐
                                    │   CREATE    │
                                    │  bd create  │
                                    └──────┬──────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                PENDING                                    │
│  • Ready to be worked on                                                  │
│  • No agent assigned                                                      │
│  • Dependencies satisfied (if any)                                        │
└──────────────────────────────────────────────────────────────────────────┘
        │                       │                           │
        │ Semi-auto:            │ Autopilot:                │ Dependency
        │ User assigns          │ Auto assigns              │ blocks
        │ (Enter key)           │                           │
        ▼                       ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│    IN_PROGRESS      │  │    IN_PROGRESS      │  │      BLOCKED        │
│  • Agent working    │  │  • Auto-assigned    │  │  • Waiting on deps  │
│  • Worktree created │  │  • Loop running     │  │  • Show blockers    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
        │                       │                           │
        │ Success               │ Success                   │ Deps complete
        │ (signal + tests)      │ (signal + tests)          │
        ▼                       ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐    [back to PENDING]
│      CLOSED         │  │      CLOSED         │
│  • Completed        │  │  • Auto-merge       │
│  • Merged to main   │  │  • Next task picked │
└─────────────────────┘  └─────────────────────┘
        │
        │ Failure
        ▼
┌─────────────────────┐
│      FAILED         │
│  • Error occurred   │
│  • Needs attention  │
│  • Worktree kept    │
└─────────────────────┘
```

### Dependency Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY HANDLING                           │
└─────────────────────────────────────────────────────────────────┘

Beads format:
{"id":"ch-001","dependencies":["ch-000"]}

Chorus behavior:

1. BLOCK if dependencies not closed:
   ch-001 depends on ch-000 (open) → ch-001 status = BLOCKED

2. AUTO-UNBLOCK when dependencies close:
   ch-000 closed → Chorus checks dependents → ch-001 → PENDING

3. VISUALIZE in TUI:
   ┌───────────────────────────────────────┐
   │ ⊗ ch-001 Implement API [BLOCKED]      │
   │   └─ Waiting: ch-000 (in_progress)    │
   └───────────────────────────────────────┘

4. CIRCULAR DETECTION:
   ch-001 → ch-002 → ch-001 = ERROR
   → Show warning in TUI
   → Refuse to assign either

5. CASCADE on completion:
   When ch-000 closes:
   - Check all tasks depending on ch-000
   - Update their status to PENDING
   - If autopilot: auto-assign if slots available
```

---

## Agent Lifecycle

### Spawning an Agent

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT SPAWN SEQUENCE                          │
└─────────────────────────────────────────────────────────────────┘

1. PRE-SPAWN CHECKS
   ├── Task exists and is assignable?
   ├── Agent CLI available?
   ├── Under max agent limit?
   └── Dependencies satisfied?

2. WORKTREE SETUP
   ├── git worktree add .worktrees/{agent}-{task-id} -b agent/{agent}/{task-id}
   ├── Copy .agent/scratchpad.md template
   └── Ensure AGENTS.md accessible

3. CLAIM TASK (atomic)
   ├── bd update {task-id} --status=in_progress --assignee={agent}
   └── Save to state.json

4. BUILD PROMPT
   ├── Load task description from Beads
   ├── Load acceptance criteria
   ├── Add completion protocol
   ├── For non-Claude: inject AGENTS.md + learnings
   └── Apply model override if specified

5. SPAWN PROCESS
   ├── Fork child process with agent CLI
   ├── Pipe stdout/stderr to TUI
   ├── Set up exit handlers
   └── Start iteration counter

6. REGISTER IN STATE
   ├── Add to agentStore
   ├── Link agent ↔ task
   └── Start output streaming
```

### Agent Prompt Template

```markdown
# Task: {task_id}

## Description
{task_description}

## Acceptance Criteria
{acceptance_criteria or "All tests pass"}

## Completion Protocol
When ALL criteria are met:
1. Ensure tests pass: `{project.testCommand}`
2. Output exactly: <chorus>COMPLETE</chorus>

If blocked, output: <chorus>BLOCKED: reason</chorus>

## Context
- Read AGENTS.md for project conventions
- Read .agent/learnings.md for known patterns
- Current branch: agent/{agent}/{task_id}
- Commit format: "type(scope): description [{task_id}]"

## Important
- Log discoveries to .agent/scratchpad.md
- Commit frequently with task ID in message
```

### Custom Model Per Task

When a task specifies a model override:

```typescript
function buildAgentCommand(agent: AgentConfig, task: Task): string[] {
  const args = [...agent.args];

  // Model override from task custom fields
  if (task.custom?.model && agent.allowModelOverride) {
    if (agent.type === 'claude') {
      args.push('--model', task.custom.model);
    }
    // Other agents may have different flags
  }

  return [agent.command, ...args];
}
```

### Agent Exit Handling

```
┌──────────────────┬────────────────┬────────────────────────────────┐
│ Exit Condition   │ Task Status    │ Action                         │
├──────────────────┼────────────────┼────────────────────────────────┤
│ 0 + COMPLETE     │ closed         │ Queue merge, cleanup           │
│ 0 + COMPLETE     │ (tests fail)   │ Continue iterations            │
│ 0 + no signal    │ in_progress    │ Increment iteration            │
│ 0 + BLOCKED      │ blocked        │ Log reason, alert user         │
│ != 0             │ failed         │ Keep worktree, alert           │
│ SIGTERM (user)   │ pending        │ Stash changes, release task    │
│ SIGKILL (crash)  │ pending        │ Keep worktree for recovery     │
└──────────────────┴────────────────┴────────────────────────────────┘

Semi-auto behavior: Agent stops after any completion
Autopilot behavior: Agent slot freed, next task assigned
```

---

## Background Merge Service

### Overview

MergeService runs as a background process, handling branch integration with intelligent conflict resolution.

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

### Merge Queue Flow

```
Agent completes (signal + tests pass)
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ENQUEUE                                                          │
│                                                                  │
│ mergeQueue.enqueue({                                             │
│   taskId: 'ch-001',                                              │
│   branch: 'agent/claude/ch-001',                                 │
│   worktree: '.worktrees/claude-ch-001',                          │
│   priority: task.priority,                                       │
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

### Conflict Resolution Strategy

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
   │(merge driver│    │             │    │Agent            │
   └─────────────┘    └─────────────┘    └────────┬────────┘
          │                   │                   │
          │                   │                   ▼
          │                   │          ┌─────────────────┐
          │                   │          │Agent analyzes   │
          │                   │          │both versions,   │
          │                   │          │attempts fix     │
          │                   │          └────────┬────────┘
          │                   │                   │
          └─────────┬─────────┴───────────────────┤
                    │                             │
                    ▼                             │
            ┌─────────────┐                       │
            │ RUN TESTS   │◄──────────────────────┘
            └──────┬──────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
       [PASS]            [FAIL]
          │                 │
          ▼                 ▼
     ✓ MERGED      ┌─────────────────┐
                   │HUMAN INTERVENTION│
                   │(TUI alert)       │
                   └─────────────────┘


Conflict Classification:

SIMPLE (Auto-resolve):
├── .beads/issues.jsonl → Use Beads merge driver
├── package-lock.json → Regenerate
├── .agent/learnings.md → Append both, dedup
└── Auto-generated files → Regenerate

MEDIUM (Rebase+retry):
├── Same file, different sections
└── No semantic overlap

COMPLEX (Agent-resolve):
├── Same lines edited
├── Semantic conflicts
└── Core files (types, config)
```

### Resolver Agent Prompt

When complex conflicts need agent resolution:

```markdown
# Merge Conflict Resolution Task

## Conflict Details
- Your Branch: agent/claude/ch-001
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
5. Run tests: `{project.testCommand}`
6. If tests pass: <chorus>RESOLVED</chorus>
7. If cannot resolve: <chorus>NEEDS_HUMAN: explanation</chorus>

## Important
- Preserve functionality from BOTH changes when possible
- If changes are mutually exclusive, prefer main (safer)
- Document your resolution reasoning in commit message
```

### Merge Ordering Rules

```
1. DEPENDENCY ORDER (highest priority)
   If ch-002 depends on ch-001, ch-001 must merge first.

2. PRIORITY BOOST
   P1: +100 queue position
   P2: +50 queue position

3. FIFO within same priority level

4. CONFLICT DEFERRAL
   Conflicted items go to end after retry.
   After 3 retries without resolution: escalate to human.
```

---

## Automatic Mode (Ralph Wiggum)

### Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                 RALPH WIGGUM LOOP (AUTOPILOT)                    │
└─────────────────────────────────────────────────────────────────┘

                     START AUTOPILOT
                           │
                           ▼
                 ┌─────────────────┐
                 │  Get ready tasks │
                 │   (bd ready)    │
                 └────────┬────────┘
                          │
              ┌───────────┴───────────┐
              │ No tasks?             │
              │ → Done! Exit autopilot│
              └───────────┬───────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Pick task by   │
                 │  priority/route │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Spawn agent    │
                 │  with task      │
                 └────────┬────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │          ITERATION LOOP             │
         │                                     │
         │  Agent runs → check output          │
         │                                     │
         │    ┌───────────┬───────────┐        │
         │    │           │           │        │
         │    ▼           ▼           ▼        │
         │ COMPLETE    BLOCKED    NO SIGNAL    │
         │    │           │           │        │
         │    │           │     iteration++    │
         │    │           │           │        │
         │    │           │    ┌──────┴─────┐  │
         │    │           │    │ < max?     │  │
         │    │           │    └──────┬─────┘  │
         │    │           │      YES  │  NO    │
         │    │           │           │   │    │
         │    │           │   RESPAWN │ FAIL   │
         └────┼───────────┼───────────┼───┼────┘
              │           │           │   │
              ▼           ▼           │   ▼
        ┌──────────┐ ┌──────────┐    │ ┌──────────┐
        │Close task│ │Block task│    │ │Timeout   │
        │Queue     │ │Alert user│    │ │Alert user│
        │merge     │ │          │    │ │          │
        └────┬─────┘ └──────────┘    │ └──────────┘
             │                       │
             └───────────────────────┘
                         │
                         ▼
               ┌─────────────────┐
               │ Agent slot free │
               │ More tasks?     │
               └────────┬────────┘
                        │
              YES ──────┴────── NO
               │                │
               ▼                ▼
        [Spawn next]      [All done!]
```

### Signal Protocol

All agent signals use XML-style tags to avoid conflicts with normal output:

```xml
<chorus>COMPLETE</chorus>           <!-- Task finished successfully -->
<chorus>BLOCKED: reason</chorus>    <!-- Cannot proceed, needs help -->
<chorus>PROGRESS: 45</chorus>       <!-- Optional: progress percentage -->
<chorus>NEEDS_HELP: question</chorus> <!-- Needs clarification -->
<chorus>RESOLVED</chorus>           <!-- Conflict resolved (resolver agent) -->
<chorus>NEEDS_HUMAN: reason</chorus> <!-- Cannot resolve, need human -->
```

Detection:
```typescript
const SIGNAL_REGEX = /<chorus>(\w+)(?::\s*(.+?))?<\/chorus>/;

function parseSignal(output: string): Signal | null {
  const match = output.match(SIGNAL_REGEX);
  if (!match) return null;
  return {
    type: match[1] as SignalType,
    payload: match[2] || null
  };
}
```

### Completion Check

Completion requires BOTH signal AND tests passing:

```typescript
interface CompletionCheck {
  type: 'all';
  checks: [
    { type: 'signal', pattern: '<chorus>COMPLETE</chorus>' },
    { type: 'command', command: '${project.testCommand}', exitCode: 0 }
  ];
}

// Matrix:
// Signal + Tests Pass = COMPLETE ✓
// Signal + Tests Fail = Continue iterations
// No Signal + Tests Pass = Continue iterations
// No Signal + Tests Fail = Continue iterations
```

### Iteration Safeguards

```
1. MAX ITERATIONS CAP
   Default: 50 iterations
   Config: completion.maxIterations

2. TIMEOUT PER TASK
   Default: 30 minutes (1800000ms)
   Config: completion.taskTimeout

3. PROGRESS DETECTION
   If 5 iterations with no git commits:
   - Alert user: "Agent may be stuck"
   - Option to continue or stop

4. ERROR THRESHOLD
   If 3 consecutive errors:
   - Pause autopilot
   - Require human review
```

---

## Memory System

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PERMANENT (Shared)                            │
│                                                                  │
│  .agent/learnings.md                                             │
│  ├── Append-only                                                 │
│  ├── Survives all sessions                                       │
│  ├── Shared across ALL agents (claude, codex, opencode)          │
│  └── Git-tracked (versioned)                                     │
│                                                                  │
│  Format:                                                         │
│  # Project Learnings                                             │
│                                                                  │
│  ## Performance                                                  │
│  - mb_str_split() > preg_split() for Unicode (3x faster)         │
│    Source: ch-001 (2026-01-09, claude)                           │
│                                                                  │
│  ## Testing                                                      │
│  - Use Pest's dataset() for parameterized tests                  │
│    Source: ch-003 (2026-01-09, codex)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
          Extracted on task completion
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   SESSION (Per-Agent)                            │
│                                                                  │
│  .worktrees/{agent}/.agent/scratchpad.md                         │
│  ├── Current session only                                        │
│  ├── Cleared on task completion                                  │
│  ├── Per-agent in parallel mode                                  │
│  └── Gitignored                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-Agent Knowledge Sharing

```
┌─────────────────────────────────────────────────────────────────┐
│              CROSS-AGENT KNOWLEDGE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Timeline:
T=0:  Claude starts ch-001 (string optimization)
      │
T=30: Claude discovers mb_str_split trick
      │
T=45: Claude completes, outputs <chorus>COMPLETE</chorus>
      │
      ├─► Chorus extracts "## Learnings" from scratchpad
      ├─► Appends to .agent/learnings.md with attribution
      └─► Commits: "learn: extract from ch-001 (claude)"
      │
T=46: Codex starts ch-003 (Unicode handling)
      │
      └─► Chorus injects learnings into Codex prompt:
          "Relevant learnings: mb_str_split > preg_split..."
      │
T=60: Codex uses pattern directly (saved rediscovery time)


Key: Non-Claude agents receive learnings via prompt injection.
     Claude agents read .agent/learnings.md natively.
```

### Learning Extraction

```typescript
async function extractLearnings(task: Task, agent: Agent): Promise<void> {
  const scratchpad = path.join(agent.worktree, '.agent/scratchpad.md');
  const content = await fs.readFile(scratchpad, 'utf-8');

  // Look for learnings section
  const learningsMatch = content.match(/## Learnings[\s\S]*?(?=\n## |$)/);
  if (!learningsMatch) return;

  const learnings = learningsMatch[0];
  const formatted = formatLearnings(learnings, task.id, agent.type);

  // Append to shared learnings
  await fs.appendFile('.agent/learnings.md', formatted);

  // Commit
  await exec('git add .agent/learnings.md');
  await exec(`git commit -m "learn: extract from ${task.id} (${agent.type})"`);
}
```

---

## Hooks Integration

### Chorus Hooks System

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHORUS HOOKS SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

Location: .chorus/hooks/

┌────────────────────┬────────────────────────────────────────────┐
│ Hook               │ When                                       │
├────────────────────┼────────────────────────────────────────────┤
│ pre-agent-start    │ Before spawning agent                      │
│ post-agent-start   │ After agent process started                │
│ pre-task-claim     │ Before claiming task (can block)           │
│ post-task-claim    │ After task claimed                         │
│ pre-iteration      │ Before each Ralph loop iteration           │
│ post-iteration     │ After each iteration (check completion)    │
│ pre-task-complete  │ Before marking task as done                │
│ post-task-complete │ After task closed (extract learnings)      │
│ pre-merge          │ Before merging agent branch                │
│ post-merge         │ After successful merge                     │
│ on-agent-error     │ When agent exits with error                │
│ on-agent-timeout   │ When agent exceeds timeout                 │
│ on-conflict        │ When merge conflict detected               │
└────────────────────┴────────────────────────────────────────────┘
```

### Hook Input/Output Format

```bash
# Input: JSON via stdin
{
  "event": "post-iteration",
  "agent": {
    "id": "claude-ch-001",
    "type": "claude",
    "worktree": ".worktrees/claude-ch-001"
  },
  "task": {
    "id": "ch-001",
    "title": "Implement feature X",
    "status": "in_progress"
  },
  "iteration": {
    "number": 7,
    "maxIterations": 50
  },
  "output": {
    "stdout": "Last 100 lines...",
    "exitCode": 0
  }
}

# Output: JSON to stdout
{
  "result": "continue",  // or "block", "complete"
  "message": "Optional message for TUI"
}
```

---

## Human Intervention

### Intervention Points

```
┌─────────────────────────────────────────────────────────────────┐
│                 HUMAN INTERVENTION POINTS                        │
└─────────────────────────────────────────────────────────────────┘

During operation, human can:

1. PAUSE (Spacebar)
   - Stop spawning new tasks
   - Current agents finish their iteration
   - State preserved, can resume

2. STOP AGENT (x)
   - Kill specific agent
   - Task goes back to pending
   - Worktree changes stashed

3. REDIRECT AGENT (r)
   - Assign current agent to different task
   - Current task goes back to pending
   - Useful when agent stuck on wrong approach

4. EDIT TASK (e)
   - Modify task description/criteria
   - If agent running: signal restart

5. KILL ALL (Ctrl+C)
   - Emergency stop
   - All agents killed
   - Tasks go to pending
   - Worktrees preserved

6. ROLLBACK (Shift+R)
   - Revert specific task's commits
   - Task goes to pending

7. BLOCK TASK (b)
   - Manually mark task as blocked
   - Agent stops, picks different task

8. APPROVE MERGE (m)
   - For complex conflicts requiring review
   - Only when merge.requireApproval=true
```

### Intervention Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│              INTERVENTION DIALOG (Press 'i')                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Active Agents:                                                   │
│   1. claude (ch-001) - iter 7/50 - running 12m                   │
│   2. codex (ch-002) - iter 3/50 - running 5m                     │
│                                                                  │
│ Actions:                                                         │
│   [p] Pause all      - Stop after current iterations             │
│   [1] Focus claude   - View full output                          │
│   [2] Focus codex    - View full output                          │
│   [x] Stop agent     - Select which to stop                      │
│   [r] Redirect       - Assign to different task                  │
│   [R] Rollback       - Revert agent's commits                    │
│   [ESC] Close        - Return to main view                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Parallel Worktree

Users can work manually alongside Chorus:

```
┌─────────────────────────────────────────────────────────────────┐
│                  USER + CHORUS PARALLEL WORK                     │
└─────────────────────────────────────────────────────────────────┘

main branch
    │
    ├── .worktrees/user-feature     (user's manual work)
    │   └── NOT managed by Chorus
    │
    ├── .worktrees/claude-ch-001    (agent work)
    ├── .worktrees/codex-ch-002     (agent work)
    └── .worktrees/codex-ch-003     (agent work)

When user wants to merge their work:
1. Option A: Pause Chorus, merge manually, resume
2. Option B: `chorus merge-user <branch>` to add to queue
```

---

## Rollback & Recovery

### Rollback Scope Levels

```
Level 1: SINGLE ITERATION
├── What: Undo last agent iteration
├── How: git reset --soft HEAD~N
└── State: Agent retries same task

Level 2: SINGLE TASK
├── What: Undo all commits for one task
├── How: git revert all commits with [task-id]
└── State: Task → pending

Level 3: TASK + DEPENDENTS
├── What: Undo task and all dependent tasks
├── How: Identify chain, revert in order
└── State: All affected → pending

Level 4: FULL SESSION
├── What: Reset to checkpoint
├── How: git reset --hard {checkpoint}
└── State: All session tasks → pending
```

### Recovery Scenarios

```
┌────────────────────┬───────────────────────────────────────────┐
│ Scenario           │ Recovery Action                           │
├────────────────────┼───────────────────────────────────────────┤
│ Agent crash        │ Task→pending, worktree preserved          │
│ Agent timeout      │ Check partial progress, retry or alert    │
│ Merge conflict     │ Agent-resolve → human fallback            │
│ Tests failing      │ Continue iterations or timeout            │
│ Chorus crash       │ Recover from state.json on restart        │
│ Beads corrupted    │ bd rebuild from issues.jsonl              │
│ Worktree broken    │ git worktree remove --force, recreate     │
└────────────────────┴───────────────────────────────────────────┘
```

### Checkpointing

```
Automatic checkpoints:

1. BEFORE AUTOPILOT START
   git tag chorus-checkpoint-{timestamp}

2. BEFORE MAJOR MERGE
   git tag pre-merge-{task-id}

3. PERIODIC (optional)
   Every N completed tasks

Config:
{
  "checkpoints": {
    "enabled": true,
    "beforeAutopilot": true,
    "beforeMerge": true,
    "periodic": 5
  }
}
```

### Error Handling Matrix

```
┌──────────────────────┬───────────────────┬──────────────────────┐
│ Error                │ Detection         │ Recovery             │
├──────────────────────┼───────────────────┼──────────────────────┤
│ bd not installed     │ chorus init       │ Show install guide   │
│ bd not initialized   │ bd ready fails    │ Run bd init          │
│ Agent CLI missing    │ which <agent>     │ Remove from available│
│ Agent crash          │ process exit      │ Task→pending, alert  │
│ Agent timeout        │ setTimeout        │ Kill, task→pending   │
│ Agent stuck          │ No commits in 5   │ Alert, offer kill    │
│                      │ iterations        │                      │
│ Worktree fail        │ git exit code     │ Retry or alert       │
│ Merge conflict       │ git merge exit    │ Agent→human cascade  │
│ Tests fail           │ test exit code    │ Continue iterations  │
│ Chorus crash         │ N/A               │ state.json recovery  │
│ Disk full            │ ENOSPC            │ Alert, pause         │
└──────────────────────┴───────────────────┴──────────────────────┘
```

---

## TUI Visualization

### Main Layout with Tiling Agent View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHORUS v2.1 │ semi-auto │ ● 2/3 agents │ 12 tasks              │ ? help    │  ← HeaderBar
├─────────────────────────────────────────────────────────────────────────────┤
│ TASKS (4)                      │ AGENTS (Tiling View)                        │
│─────────────────────────────── │──────────────────────────────────────────── │
│ → ch-2n6 [P1] Config Types     │ ┌───────────────────┬───────────────────┐  │
│   ● claude | iter 7            │ │ CLAUDE (ch-2n6)   │ CLAUDE (ch-ah6)   │  │
│                                │ │ iter 7/50 | 12m   │ iter 3/50 | 5m    │  │
│ ● ch-ah6 [P1] State Types      │ │ ▓▓▓▓░░░░░░ 35%    │ ▓░░░░░░░░░ 6%     │  │
│   ● claude | iter 3            │ │                   │                   │  │
│                                │ │ Reading config... │ Creating types... │  │
│ ✓ ch-mpl [P2] Signal Parser    │ │ $ npm test        │ Adding valid...   │  │
│   closed 5m ago                │ │ ✓ 47 tests passed │                   │  │
│                                │ ├───────────────────┼───────────────────┤  │
│ ○ ch-3y0 [P2] Agent-Task Link  │ │ [empty slot]      │ [empty slot]      │  │
│   pending                      │ │                   │                   │  │
│                                │ │                   │                   │  │
│ ⊗ ch-wk8 [P3] Prompt Builder   │ │                   │                   │  │
│   blocked by ch-2n6            │ │                   │                   │  │
│                                │ │                   │                   │  │
│                                │ └───────────────────┴───────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✓1 ●2 ○1 ⊗1 │ Merge: 0 queued │ Runtime: 15m                      │ ? help │  ← FooterBar
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tiling Configuration

```json
{
  "tui": {
    "agentGrid": "auto"  // or "2x2", "2x3", "1x4", etc.
  }
}

// Auto-fit logic:
// terminalWidth < 120: 1 column
// terminalWidth < 180: 2 columns
// else: 3+ columns

// User can press 'g' to change grid configuration
```

### Status Indicators

```
TASK STATUS:
→  open/pending (ready to assign)
●  in_progress (agent working)
✓  closed (completed)
⊗  blocked (waiting on dependencies)
✗  failed (needs attention)

AGENT STATUS:
●  running (actively working)
○  idle (waiting for task)
⏸  paused (user paused)
✗  error (crashed/failed)

PRIORITY BADGES:
[P1] - Critical (red)
[P2] - High (orange)
[P3] - Medium (yellow)
[P4] - Low (blue)
```

### Keyboard Shortcuts

```
┌─────────────────────────────────────────────────────────────────┐
│                        KEYBOARD SHORTCUTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NAVIGATION                     AGENT CONTROL                    │
│  j/↓  Move down                 s      Spawn agent for task      │
│  k/↑  Move up                   x      Stop selected agent       │
│  Tab  Switch panels             r      Redirect agent            │
│  1-9  Quick select              Enter  Assign task to agent      │
│                                                                  │
│  MODE CONTROL                   TASK MANAGEMENT                  │
│  m    Toggle semi-auto/autopilot n      New task                 │
│  Space Pause/resume             e      Edit task                 │
│  a    Start autopilot           b      Block task                │
│                                 d      Mark done (manual)        │
│                                                                  │
│  VIEW                           RECOVERY                         │
│  f    Fullscreen agent          R      Rollback menu             │
│  g    Grid settings             c      Create checkpoint         │
│  l    View logs                 u      Undo last action          │
│  L    View learnings                                             │
│                                                                  │
│  GENERAL                                                         │
│  ?    Toggle help               i      Intervention menu         │
│  q    Quit (confirm if agents)  M      Merge queue view          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## References

- [Ralph Wiggum Pattern](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
- [Beads Task Management](https://github.com/steveyegge/beads)
- [Git Worktrees](https://git-scm.com/docs/git-worktree)

---

## Changelog

- **v2.1 (2026-01-10):** Documentation cleanup
  - Task ID format: `bd-xxx` → `ch-xxx` (Chorus prefix)
  - Architecture: StatusBar → HeaderBar + FooterBar
  - TUI layout example updated with real task IDs
  - Status: DRAFT → APPROVED (implementation in progress)
  - 95 tasks in Beads (32 ready, 63 blocked including 3 deferred)

- **v2.0 (2026-01-10):** Major optimization and refinement
  - Simplified architecture: 7+ services → 2 (Orchestrator + MergeService)
  - Two modes: semi-auto (default) + autopilot
  - Tiling agent view (dynamic grid)
  - Agent-first conflict resolution
  - Signal protocol: `<chorus>` tags
  - Removed: aider support, GitHub Issues, PRD parsing (v2)
  - Custom model per task support
  - User parallel worktree flow
  - Cross-agent learning via prompt injection
  - Reduced phases: 7 → 6
  - Reduced test estimate: ~160 → ~115 new tests

- **v1.1 (2026-01-09):** Resolved key decisions, added merge service
- **v1.0 (2026-01-09):** Initial draft
