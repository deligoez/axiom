# Chorus Workflow: End-to-End Multi-Agent Orchestration

**Date:** 2026-01-09
**Updated:** 2026-01-11
**Status:** APPROVED - Implementation in Progress
**Version:** 3.10

---

## Table of Contents

1. [Overview](#overview)
2. [Key Decisions (Resolved)](#key-decisions-resolved)
3. [Architecture](#architecture)
4. [Operating Modes](#operating-modes)
5. [Planning Phase (M0)](#planning-phase-m0) ← **NEW**
6. [Initialization Flow](#initialization-flow)
7. [Task Creation & Management](#task-creation--management)
8. [Agent Lifecycle](#agent-lifecycle)
9. [Background Merge Service](#background-merge-service)
10. [Automatic Mode (Ralph Wiggum)](#automatic-mode-ralph-wiggum)
11. [Memory System](#memory-system)
12. [Hooks Integration](#hooks-integration)
13. [Human Intervention](#human-intervention)
14. [Rollback & Recovery](#rollback--recovery)
15. [TUI Visualization](#tui-visualization)

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

1. **Agent-Ready Architecture**: Designed for claude-code (MVP), extensible to codex and opencode (post-MVP)
2. **Non-Invasive**: Uses existing tools (Beads, git worktrees) rather than reinventing
3. **Fail-Safe**: Can recover from crashes, bad commits, stuck agents
4. **Observable**: Every action is visible in TUI and logged
5. **Interruptible**: Human can intervene at any point without data loss
6. **Simple First**: Minimal services, clear responsibilities

---

## Key Decisions (Resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Multi-agent support? | YES - config supports claude, codex, opencode (see #10 for MVP scope) |
| 2 | Worktrees? | REQUIRED - with background merge service |
| 3 | Task management? | Beads only (no built-in) |
| 4 | Auto-mode control? | Max agents + priority queue |
| 5 | Review process? | Automated (tests + acceptance criteria) |
| 6 | Completion detection? | Signal + Tests (AND logic) |
| 7 | Prompt construction? | Inject task context + learnings |
| 8 | Conflict resolution? | Agent-first, human-fallback |
| 9 | Operating modes? | Semi-auto (default) + Autopilot |
| 10 | MVP Scope? | **Claude-only implementation** (config ready for all, code implements Claude) |
| **11** | **Architecture?** | **Planning-first (Ralph-inspired)** |
| **12** | **Config format?** | **JSON (config) + Markdown (rules, patterns)** |
| **13** | **Quality gates?** | **Flexible commands (not just test/lint)** |
| **14** | **Context strategy?** | **MVP: Claude compact; Post-MVP: custom ledger** |

### Decision Details

#### 14. Context Strategy: Claude Compact → Custom Ledger

**MVP: Claude Compact**
Claude Code has built-in context management via `/compact` command. For MVP:
- Agent runs until context fills (~70% usage)
- Claude automatically compacts conversation
- Task context preserved via prompt injection (re-injected after compact)
- No special handling needed by Chorus

```
Agent iteration 1-N:
├── Claude manages its own context
├── On compact: Claude summarizes conversation
├── Task prompt (from F07) re-injected automatically
└── Chorus monitors via output parsing only
```

**Post-MVP: Custom Ledger System**
For long-running tasks or complex multi-file changes:
- Chorus maintains a task-specific ledger (`.chorus/ledgers/{task-id}.md`)
- Ledger tracks: files changed, decisions made, blockers encountered
- On agent restart/compact: Ledger injected for continuity
- Enables cross-iteration state that survives compaction

```typescript
// Post-MVP ledger structure
interface TaskLedger {
  taskId: string;
  filesModified: string[];
  keyDecisions: { decision: string; rationale: string }[];
  blockers: { issue: string; resolution?: string }[];
  lastIteration: number;
  lastCheckpoint: string;  // git commit hash
}
```

**Why defer custom ledger?**
- Claude's built-in compact works well for most tasks
- Ledger adds complexity without clear MVP benefit
- Can evaluate need based on real usage patterns

#### 1. Multi-Agent Support: claude, codex, opencode

> **MVP SCOPE:** Config structure supports all 3 agents, but MVP implements Claude only.
> Deferred features for codex/opencode:
> - **F03c (CLI Detection):** Detect which agent CLIs are installed (`which codex`, `which opencode`)
> - **F07b (Context Injection):** Inject AGENTS.md + learnings into non-Claude agent prompts
> - **F42 (Learning Injector):** Inject relevant learnings based on task labels
> These agents will work in MVP but without context injection - they run with default prompts.

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
      "claude": { "command": "claude", "args": ["--dangerously-skip-permissions"] }
    }
  }
}
```

> **Post-MVP:** Add codex and opencode to `available` when context injection implemented.

**Context Injection for Non-Claude Agents (Post-MVP):**
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
- Path: `.worktrees/{agent}-{task-id}` (e.g., `.worktrees/claude-ch-001`)
- Branch: `agent/{agent}/{task-id}` (e.g., `agent/claude/ch-001`)
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

Signal Handling (Semi-Auto):
├── COMPLETE → Task closed, agent stops, user decides next
├── BLOCKED → Task marked blocked, agent stops, user notified
├── NEEDS_HELP → Agent pauses, user can respond or redirect
└── No signal → Continue iterations until max or timeout
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

Signal Handling (Autopilot):
├── COMPLETE → Task closed, merge queued, pick next ready task
├── BLOCKED → Task stays blocked, agent freed, pick different task
├── NEEDS_HELP → Alert user, agent pauses, autopilot continues others
└── No signal → Continue iterations until max or timeout
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

**Mode State Hierarchy (Clarification):**

| Location | Field | Purpose | Precedence |
|----------|-------|---------|------------|
| CLI args | `--mode` | Override for this session | 1 (highest) |
| `planning-state.json` | `chosenMode` | User's choice after planning review | 2 |
| `state.json` | `mode` | Current runtime mode (survives TUI restarts) | 3 |
| `config.json` | `mode` | Project default | 4 (lowest) |

**Mode Resolution Flow:**
1. CLI `--mode` flag → use that mode
2. Else if `planning-state.json` has `chosenMode` → use that (first run after planning)
3. Else if `state.json` has `mode` → use that (preserves 'm' toggle across TUI restarts)
4. Else use `config.json` default

**TUI 'm' Toggle Behavior:**
- Toggles between `semi-auto` ↔ `autopilot`
- Updates `state.json` immediately (persisted)
- Does NOT update `config.json` (project default unchanged)
- Does NOT update `planning-state.json` (initial choice preserved)

---

## Planning Phase (M0)

> **NEW in v3.0:** Planning-first architecture inspired by Ralph pattern.

### Overview

Before implementation begins, Chorus guides users through interactive planning:

```
chorus command
     │
     ▼
┌─────────────────┐
│ Check .chorus/  │
│ directory       │
└────────┬────────┘
         │
    ┌────┴────┐
    │ exists? │
    └────┬────┘
         │
    No   │   Yes
    ┌────┴────────────────┐
    ▼                     ▼
┌─────────┐        ┌─────────────┐
│  INIT   │        │ Check state │
│  MODE   │        └──────┬──────┘
└────┬────┘               │
     │              ┌─────┴─────┐
     ▼              │ has tasks?│
┌─────────────┐     └─────┬─────┘
│  PLANNING   │           │
│    MODE     │◀──No──────┤
└─────────────┘           │Yes
                          ▼
                   ┌─────────────────┐
                   │ IMPLEMENTATION  │
                   │      MODE       │
                   └─────────────────┘
```

### TUI Layout

All modes share a common layout structure:
- **Header:** Mode indicator, status, help toggle
- **Main Area (~80%):** Content varies by mode (agent output, chat, forms)
- **Input Bar:** Text input with context-sensitive shortcuts
- **Footer:** Quick stats and shortcuts

### Planning Mode

Interactive task planning with Plan Agent before implementation:

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS PLANNING                                        [?] Help │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Plan Agent: Welcome! I see this project has no tasks yet.      │
│                                                                  │
│  How would you like to proceed?                                  │
│                                                                  │
│  You can:                                                        │
│  • Describe what you want to build (I'll help break it down)   │
│  • Paste a task list (I'll validate against our rules)         │
│  • Reference a spec file (I'll parse and decompose it)         │
│                                                                  │
│  Or just start typing...                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > _____________________________________________________________│
└─────────────────────────────────────────────────────────────────┘
```

### Plan Agent Capabilities

Plan Agent helps with:

1. **Free-form Planning:** User describes goal, agent creates task breakdown
2. **Task List Review:** User pastes tasks, agent validates and suggests improvements
3. **Spec/PRD Parsing:** User provides spec file, agent parses and decomposes into tasks

Agent prompt is constructed from:
- Core task rules (built-in)
- Project-specific rules (from `.chorus/task-rules.md`)
- Learned patterns (from `.chorus/PATTERNS.md`)

### Auto-Decomposition

For large specs, chunked processing:

```typescript
// Process large specs in chunks
async function parseSpecInChunks(specPath: string, chunkSize: number = 500) {
  const content = await readFile(specPath);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    // Process chunk, generate tasks
    yield processChunk(chunk);
  }
}
```

### Task Validation Rules

All tasks are validated before implementation begins.

#### Built-in Rules (Always Enforced)

| Rule | Description |
|------|-------------|
| **Atomic** | Each task must have a single responsibility |
| **Testable** | All acceptance criteria must be verifiable |
| **Acyclic** | No circular dependencies allowed |
| **Context-fit** | Task must fit within one agent context window |

#### Configurable Rules (`.chorus/task-rules.md`)

```markdown
# Task Rules

## Configurable Limits

| Setting | Value | Description |
|---------|-------|-------------|
| max_acceptance_criteria | 10 | Maximum criteria per task |
| max_description_length | 500 | Maximum chars for description |

## Optional Rules

- [ ] require_test_file: Require explicit test file reference
- [x] enforce_naming: Pattern `^F\d+[a-z]?: .+`
- [ ] forbidden_words: simple, easy, just, obviously
```

### Task Review Loop (Ralph-Style)

Before implementation, iterate until all tasks valid:

```
┌─────────────────────────────────────────────────────────────────┐
│ TASK REVIEW                                      Iteration 1/3  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Validating 15 tasks against project rules...                   │
│                                                                  │
│  Results:                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✗ T03: 'Build auth system' - 15 criteria (max: 10)       │   │
│  │   → Splitting into T03a, T03b                            │   │
│  │                                                           │   │
│  │ ✗ T07 → T03 → T07 - Circular dependency                  │   │
│  │   → Reordering: T03 first, then T07                      │   │
│  │                                                           │   │
│  │ ⚠️ T11: 'works correctly' - Vague criterion              │   │
│  │   → Need clarification                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Apply Fixes] [Edit Rules] [Review Again] [Back to Plan]       │
└─────────────────────────────────────────────────────────────────┘
```

After all tasks valid:
- User chooses mode: Semi-Auto or Full Auto
- Implementation begins

### Mode Selection UI

When all tasks pass validation, user selects implementation mode:

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS - READY TO IMPLEMENT                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✓ All 15 tasks validated successfully                          │
│                                                                  │
│  ═══ Choose Implementation Mode ═══                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [S] SEMI-AUTO (Recommended for first run)               │    │
│  │     • You select each task manually                     │    │
│  │     • Agent completes one task, then stops              │    │
│  │     • Full control over task order                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [A] AUTOPILOT                                            │    │
│  │     • Agents auto-assign tasks by priority              │    │
│  │     • Runs until all tasks complete                     │    │
│  │     • Press Space to pause anytime                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Press S or A to begin, or B to go back to review               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Selection saves `chosenMode` to `planning-state.json` and transitions to Implementation Mode.

### Planning State Persistence

Planning progress saved to `.chorus/planning-state.json`:

```json
{
  "status": "reviewing",
  "chosenMode": null,
  "planSummary": {
    "userGoal": "Build e-commerce API",
    "estimatedTasks": 15
  },
  "reviewIterations": [
    { "iteration": 1, "issues": 3, "fixed": 2 }
  ]
}
```

**Status Values:**
- `planning` - User describing goals, Plan Agent creating tasks
- `reviewing` - Validating tasks against rules
- `ready` - All tasks valid, waiting for mode selection
- `implementation` - User chose mode, implementation started

**chosenMode Values:** `null` (not yet chosen), `"semi-auto"`, `"autopilot"`

### Mode Routing (App Router)

The App Router (F89) determines which mode to enter based on project state:

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODE ROUTING LOGIC                          │
└─────────────────────────────────────────────────────────────────┘

CLI Input (F90)
     │
     ├── chorus --help          → Show help, exit
     ├── chorus --version       → Show version, exit
     ├── chorus init            → Force INIT MODE
     ├── chorus plan            → Force PLANNING MODE
     └── chorus [--mode X]      → Auto-detect or use specified mode
                │
                ▼
        ┌───────────────┐
        │  App Router   │  (F89)
        └───────┬───────┘
                │
     ┌──────────┴──────────┐
     │ .chorus/ exists?    │
     └──────────┬──────────┘
           No   │   Yes
           │    │
           ▼    ▼
     ┌─────────┐ ┌─────────────────┐
     │  INIT   │ │ Check state     │
     │  MODE   │ │ planning-state  │
     └─────────┘ └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              │ planning-state.json │
              │ status?             │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    "planning"      "reviewing"    "ready" or
    "reviewing"                    "implementation"
         │               │               │
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌────────────────┐
   │ PLANNING  │   │  REVIEW   │   │ Check bd ready │
   │   MODE    │   │   MODE    │   └───────┬────────┘
   └───────────┘   └───────────┘           │
                                    ┌──────┴──────┐
                                    │ Has tasks?  │
                                    └──────┬──────┘
                                      Yes  │  No
                                      │    │
                                      ▼    ▼
                              ┌──────────┐ ┌──────────┐
                              │IMPLEMENT │ │ PLANNING │
                              │  MODE    │ │   MODE   │
                              └──────────┘ └──────────┘
```

**CLI Parser (F90):**
```typescript
interface CLIArgs {
  mode?: 'init' | 'plan' | 'semi-auto' | 'autopilot';
  help?: boolean;
  version?: boolean;
  maxAgents?: number;
  config?: string;  // custom config path
}

// Examples:
// chorus                    → Auto-detect mode
// chorus --mode semi-auto   → Force semi-auto
// chorus --autopilot        → Start in autopilot
// chorus init               → Force init mode
// chorus plan               → Force planning mode
```

**Implementation Mode (F91):**
When entering Implementation Mode:
1. Load `planning-state.json` to get `chosenMode`
2. Initialize Orchestrator with mode
3. Load tasks from Beads (`bd ready`)
4. Render TUI with appropriate layout (TaskPanel + AgentGrid)
5. Start event loop based on mode (semi-auto waits, autopilot auto-assigns)

Exit Conditions for Implementation Mode:
```
┌────────────────────┬───────────────────────────────────────────┐
│ Condition          │ Behavior                                   │
├────────────────────┼───────────────────────────────────────────┤
│ All tasks closed   │ Show summary, prompt to exit or add tasks  │
│ User quits (q)     │ Confirm if agents running, then exit       │
│ User pauses        │ Stay in mode, wait for resume              │
│ No ready tasks     │ Autopilot: wait for blocked tasks to clear │
│                    │ Semi-auto: show "No tasks available"       │
│ Critical error     │ Pause, show error, allow recovery          │
│ Switch to planning │ User presses 'P' to return to planning     │
└────────────────────┴───────────────────────────────────────────┘
```

---

## Initialization Flow

### First-Time Setup: Interactive Init Mode

Init Mode is conversational - user can type freely at any step.

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 1/5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Checking prerequisites...                                       │
│                                                                  │
│  ✓ Git repository initialized                                   │
│  ✓ Node.js v22.0.0 (>= 20 required)                             │
│  ✓ Beads CLI (bd) v0.46.0                                       │
│  ✓ Claude Code CLI found                                        │
│                                                                  │
│  All prerequisites met!                                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > (type to ask questions or press Enter to continue)            │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 2/5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Project Detection:                                              │
│  ├── package.json found → Node.js/TypeScript                    │
│  └── tsconfig.json found                                        │
│                                                                  │
│  Project name: [chorus] (from package.json)                     │
│  Task ID prefix: [ch-]                                           │
│                                                                  │
│  Is this correct? (type to change, or Enter to confirm)         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > _                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Quality Commands (Flexible)

User can add ANY quality commands - not limited to test/typecheck/lint:

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 3/5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Quality Commands                                                │
│  These run before marking any task as complete.                 │
│                                                                  │
│  Current commands:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. [*] test       npm test                               │   │
│  │ 2. [ ] typecheck  npm run typecheck                      │   │
│  │ 3. [ ] lint       npm run lint                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  [*] = required  [ ] = optional                                 │
│                                                                  │
│  Commands:                                                       │
│  • "add <name> <command>" to add                                │
│  • "remove <number>" to delete                                  │
│  • "toggle <number>" for required/optional                      │
│  • "done" when finished                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > add phpstan vendor/bin/phpstan analyse                        │
└─────────────────────────────────────────────────────────────────┘
```

### Task Validation Rules Setup

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 4/5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Task Validation Rules                                           │
│                                                                  │
│  ═══ Built-in Rules (Always Enforced) ═══                       │
│  • Tasks must be atomic (single responsibility)                 │
│  • All acceptance criteria must be testable                     │
│  • No circular dependencies allowed                             │
│  • Each task must fit within one agent context window           │
│                                                                  │
│  ═══ Configurable Limits ═══                                    │
│  Max acceptance criteria per task: [10]                         │
│  Max description length (chars):   [500]                        │
│                                                                  │
│  Type values to change, or "done" to finish                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > done                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Plan Review Settings

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 5/5 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Adaptive Plan Review                                            │
│  When agents discover cross-cutting patterns, should Chorus      │
│  automatically review and update pending tasks?                  │
│                                                                  │
│  ═══ Plan Review Settings ═══                                   │
│                                                                  │
│  Enable plan review:        [Yes]                                │
│  Max review iterations:     [5]                                  │
│  Trigger on:                [cross_cutting, architectural]       │
│  Auto-apply changes:        [minor]                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ How it works:                                             │   │
│  │ • Agent discovers "[CROSS-CUTTING] Rate limiting needed" │   │
│  │ • Plan Agent reviews all open tasks                       │   │
│  │ • Updates acceptance criteria, marks redundant tasks      │   │
│  │ • Iterates until no changes (max 5 iterations)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Type values to change, or "done" to finish                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > done                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Programmatic Init (Non-Interactive)

For CI/CD or scripted setup, use `chorus init --yes` which:

1. **Check Prerequisites** - git, Node.js >= 20, bd CLI, claude CLI
2. **Auto-detect Project** - Read package.json/pyproject.toml/go.mod
3. **Create Directories** - See [Directory Structure](#directory-structure-chorus) below
4. **Configure Defaults** - Claude as default agent, maxParallel=3
5. **Update .gitignore** - Add `.worktrees/`, `.chorus/state.json`, `.agent/scratchpad.md`
6. **Enable Plan Review** - Set planReview.enabled=true, maxIterations=5

```bash
# Non-interactive init with defaults
chorus init --yes

# With custom settings
chorus init --yes --max-agents 5 --prefix "myapp-"
```

### Directory Structure: `.chorus/`

```
.chorus/
├── config.json              # Main configuration
├── task-rules.md            # Task validation rules (agent-readable)
├── PATTERNS.md              # Cross-agent patterns (agent-readable)
├── planning-state.json      # Current planning state
├── pending-patterns.json    # Pattern suggestions awaiting review (auto-expires 7 days)
├── session-log.jsonl        # Session history (append-only, JSONL)
├── state.json               # Runtime state (gitignored)
├── templates/               # Template files
│   └── scratchpad.md        # Copied to worktree on agent spawn
├── specs/                   # Living spec documents (v3.6)
│   ├── *.md                 # Active specs (only draft sections visible)
│   ├── spec-progress.json   # Tracks spec sections and their states
│   └── archive/             # Completed specs (never in agent context)
├── hooks/                   # Auto-discovered hooks (v3.4)
│   └── *.sh                 # Named by event (e.g., post-task-complete.sh)
└── prompts/
    ├── plan-agent.md        # Plan agent system prompt
    └── impl-agent.md        # Implementation agent prompt
```

**File Formats:**
- **JSON:** config.json, planning-state.json, pending-patterns.json, state.json, spec-progress.json (structured data)
- **Markdown:** task-rules.md, PATTERNS.md, prompts/*.md, specs/*.md, templates/*.md (agent-readable)
- **JSONL:** session-log.jsonl (append-only log, one JSON per line)

### Session Logger

All events logged to `.chorus/session-log.jsonl`:

```jsonl
{"ts":"2026-01-11T14:00:00Z","mode":"init","event":"started","details":{}}
{"ts":"2026-01-11T14:05:00Z","mode":"init","event":"config_saved","details":{"qualityCommands":["npm test"]}}
{"ts":"2026-01-11T14:10:00Z","mode":"planning","event":"agent_started","details":{}}
{"ts":"2026-01-11T14:15:00Z","mode":"planning","event":"tasks_generated","details":{"count":15}}
{"ts":"2026-01-11T14:20:00Z","mode":"review","event":"iteration_complete","details":{"iteration":1,"issues":3}}
{"ts":"2026-01-11T14:25:00Z","mode":"implementation","event":"agent_assigned","details":{"agentId":"a1","taskId":"ch-abc"}}
```

**Event Reference by Mode:**

| Mode | Event | Details |
|------|-------|---------|
| **init** | `started` | Init mode began |
| | `prerequisites_checked` | `{missing: string[]}` |
| | `project_detected` | `{type, name, prefix}` |
| | `config_saved` | `{qualityCommands}` |
| | `completed` | Init finished |
| **planning** | `agent_started` | Plan Agent spawned |
| | `user_input` | `{input: string}` |
| | `tasks_generated` | `{count, source}` |
| | `spec_parsed` | `{file, chunks}` |
| | `spec_created` | `{file, method: import\|interactive\|template}` |
| | `spec_section_tasked` | `{file, section, tasks: string[]}` |
| | `spec_archived` | `{file, reason}` |
| **review** | `validation_started` | `{taskCount}` |
| | `issues_found` | `{issues: Issue[]}` |
| | `fix_applied` | `{taskId, fixType}` |
| | `iteration_complete` | `{iteration, issues, fixed}` |
| | `all_valid` | All tasks passed |
| **implementation** | `mode_selected` | `{mode: semi-auto\|autopilot}` |
| | `agent_assigned` | `{agentId, taskId}` |
| | `agent_iteration` | `{agentId, iteration}` |
| | `agent_signal` | `{agentId, signal, payload}` |
| | `task_completed` | `{taskId, duration}` |
| | `task_failed` | `{taskId, reason}` |
| | `task_timeout` | `{taskId, iterations}` |
| | `merge_queued` | `{taskId, branch}` |
| | `merge_completed` | `{taskId}` |
| | `merge_conflict` | `{taskId, files}` |
| | `session_paused` | User paused |
| | `session_resumed` | User resumed |
| | `session_completed` | All tasks done |
| **learning** | `learning_extracted` | `{taskId, agentType, category, count}` |
| | `learning_categorized` | `{learningId, category: LOCAL\|CROSS_CUTTING\|ARCHITECTURAL}` |
| | `pattern_suggested` | `{content, source, category}` |
| | `pattern_approved` | `{content, approvedBy: auto\|user}` |
| | `pattern_rejected` | `{content, reason}` |
| | `pattern_expired` | `{content, source, age_days}` |
| **plan_review** | `review_triggered` | `{trigger: learning\|manual, learningCategory}` |
| | `review_iteration` | `{iteration, tasksUpdated, tasksMarkedRedundant}` |
| | `review_converged` | `{iterations, totalChanges}` |
| | `task_updated` | `{taskId, changeType, oldValue, newValue}` |
| | `task_marked_redundant` | `{taskId, reason}` |
| **incremental_planning** | `planning_triggered` | `{readyCount, threshold}` |
| | `horizon_started` | `{horizonNumber, specSections}` |
| | `horizon_completed` | `{horizonNumber, tasksCreated}` |
| | `stop_condition_hit` | `{condition: unknownDependency\|decisionPoint\|taskCountReached}` |

### Config File: `.chorus/config.json`

> **Note:** Config `version` tracks the config schema version, not the plan version.
> Use semantic versioning: bump major for breaking changes, minor for new fields.

```json
{
  "version": "3.1",

  "project": {
    "name": "my-awesome-app",
    "type": "node",
    "taskIdPrefix": "ch-"  // For display/filtering only; Beads generates actual IDs
  },

  "qualityCommands": [
    { "name": "typecheck", "command": "npm run typecheck", "required": true, "order": 1 },
    { "name": "lint", "command": "npm run lint", "required": false, "order": 2 },
    { "name": "test", "command": "npm test", "required": true, "order": 3 }
  ],

  "mode": "semi-auto",

  "agents": {
    "default": "claude",
    "maxParallel": 3,
    "timeoutMinutes": 30
  },

  "completion": {
    "signal": "<chorus>COMPLETE</chorus>",
    "maxIterations": 50
  },

  "merge": {
    "autoResolve": true,
    "agentResolve": true,
    "requireApproval": false
  },

  "tui": {
    "agentGrid": "auto"
  },

  "checkpoints": {
    "beforeAutopilot": true,   // Tag before starting autopilot
    "beforeMerge": true,       // Tag before each merge
    "periodic": 5              // Tag every N completed tasks (0 = disabled)
  },

  "planReview": {
    "enabled": true,           // Enable learning-triggered plan review
    "maxIterations": 5,        // Max review cycles (stops early if no changes)
    "triggerOn": ["cross_cutting", "architectural"],
    "autoApply": "minor",      // none | minor | all
    "requireApproval": ["redundant", "dependency_change"]
  },

  "createdAt": "2026-01-11T14:00:00Z",
  "updatedAt": "2026-01-11T14:00:00Z"
}
```

### Quality Commands Interface

```typescript
interface QualityCommand {
  name: string;        // Display name (e.g., "phpstan", "rector")
  command: string;     // Shell command to run
  required: boolean;   // Must pass for task completion
  order: number;       // Execution order (lower runs first)
}

// Execution Order:
// Commands run sequentially by `order` value (ascending)
// Recommended order:
//   1. typecheck  - Catch type errors early (fast)
//   2. lint       - Catch style issues (fast)
//   3. test       - Run tests (slower, but catches real bugs)
//
// Why order matters:
// - Fast checks first → fail fast, save time
// - Type errors often cause test failures → fix types first
// - If a required command fails, remaining commands still run
//   (provides complete feedback in one iteration)
//
// All required commands must pass before task marked complete
// Optional commands run but don't block completion
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

**Task Priority Levels:**

| Priority | Flag | Name | Description | Merge Boost |
|----------|------|------|-------------|-------------|
| P0 | `-p 0` | Blocker | Blocks other work, must fix immediately | +200 |
| P1 | `-p 1` | Critical | Urgent, should be first in queue | +100 |
| P2 | `-p 2` | High | Important, prioritize over normal work | +50 |
| P3 | `-p 3` | Medium | Normal priority (default) | +10 |
| P4 | `-p 4` | Low | Nice to have, do when time permits | +0 |

**Creating a Blocker Task (P0):**
```bash
bd create "BLOCKER: Database connection failing" -p 0 -l bug
```

### BeadsCLI Integration

**IMPORTANT:** All Chorus components MUST access Beads through `BeadsCLI` service wrapper. This centralizes error handling and provides consistent label filtering. The service internally uses `bd` CLI commands.

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
    if (options.deps) args.push(`--deps ${options.deps.join(',')}`);
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
        │                       │
        │ Failure               │ Max iterations
        │ (error/crash)         │ or timeout
        ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│      FAILED         │  │      TIMEOUT        │
│  • Error occurred   │  │  • Max iter reached │
│  • Needs attention  │  │  • Or time limit    │
│  • Worktree kept    │  │  • Worktree kept    │
└─────────────────────┘  └─────────────────────┘
        │                       │
        │ Recovery options:     │ Recovery options:
        │ 1. Retry (r key)      │ 1. Retry (r key)
        │ 2. Edit & retry       │ 2. Edit task
        │ 3. Rollback           │ 3. Increase limit
        ▼                       ▼
  [back to PENDING]       [back to PENDING]
```

**FAILED Recovery:**
- Press `r` on failed task → Task returns to PENDING, worktree preserved
- Press `e` to edit task description → Then retry
- Press `R` to rollback → Reverts commits, task → PENDING
- Press `X` (Shift+x) to cleanup worktree → Removes worktree, task stays FAILED
- Worktree kept for debugging until manually cleaned

**Worktree Cleanup Commands:**
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

**TIMEOUT Recovery:**
- Press `r` on timed-out task → Fresh iteration counter, retry
- Press `e` to simplify task → Break into smaller tasks
- Press `+` to increase maxIterations for this task
- Distinct from FAILED: No error occurred, agent just couldn't finish in time

**TIMEOUT/FAILED in Beads:**

Beads (`bd`) uses standard statuses: `open`, `in_progress`, `closed`. Chorus extends this:

| Chorus State | Beads Status | Custom Field | How Chorus Tracks |
|--------------|--------------|--------------|-------------------|
| PENDING | `open` | - | Default |
| IN_PROGRESS | `in_progress` | - | Normal |
| CLOSED | `closed` | - | Normal |
| BLOCKED | `open` | `blocked: true` | `bd update --custom blocked=true` |
| FAILED | `open` | `failed: true` | `bd update --custom failed=true` |
| TIMEOUT | `open` | `timeout: true` | `bd update --custom timeout=true` |

On retry: `bd update ch-xxx --status=open --custom failed= --custom timeout=`

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
   ├── Copy scratchpad template to worktree (see below)
   └── Ensure AGENTS.md accessible

   **Scratchpad Template Locations:**
   - **Template source:** `.chorus/templates/scratchpad.md` (project-wide template)
   - **Fallback:** Built-in default if template doesn't exist
   - **Destination:** `.worktrees/{agent}-{task-id}/.agent/scratchpad.md`

   **Why separate locations?**
   - Template lives in `.chorus/` (project config, git-tracked)
   - Instance lives in worktree (per-agent, gitignored in worktree)
   - Each agent gets a fresh copy with task ID substituted

   **Template Content** (`.chorus/templates/scratchpad.md`):
   ```markdown
   # Task Scratchpad: {task_id}

   ## Notes
   <!-- Agent writes discoveries, observations, decisions here -->

   ## Learnings
   <!-- Patterns discovered that should be shared with other agents -->
   <!-- Extracted to .agent/learnings.md on task completion -->

   ## Blockers
   <!-- If stuck, document the issue and what you've tried -->
   ```

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

## Quality Commands (must pass before completion)
Run these commands in order before signaling COMPLETE:
{quality_commands_numbered_list}

Example format:
1. `npm run typecheck` (required)
2. `npm run lint` (optional)
3. `npm test` (required)

## Completion Protocol
When ALL criteria are met AND all required quality commands pass:
1. Run each quality command and verify it passes
2. Output exactly: <chorus>COMPLETE</chorus>

If blocked by external issue, output: <chorus>BLOCKED: reason</chorus>
If you need clarification, output: <chorus>NEEDS_HELP: what you need</chorus>

## Context
- Read AGENTS.md for project conventions
- Read .chorus/PATTERNS.md for learned patterns
- Current branch: agent/{agent}/{task_id}
- Commit format: "type(scope): description [ch-xxx]"

## Important
- Log discoveries to .agent/scratchpad.md
- Commit frequently with task ID in message

## Learnings Format
When you discover something useful, add it to your scratchpad's ## Learnings section:

```
## Learnings
- [LOCAL] This specific function needs memoization for performance
- [CROSS-CUTTING] All API endpoints require rate limiting middleware
- [ARCHITECTURAL] State management should use Zustand instead of Context
```

Categories:
- [LOCAL] - Only affects this task (not shared with other tasks)
- [CROSS-CUTTING] - Affects multiple features (triggers plan review)
- [ARCHITECTURAL] - Fundamental design decision (triggers plan review + alert)
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
5. Run required quality commands (test, typecheck, lint)
6. If all pass: <chorus>RESOLVED</chorus>
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

   DEPENDENCY WAIT BEHAVIOR:
   - If ch-002 completes before ch-001:
     a. ch-002 enters queue with status "waiting_dependency"
     b. ch-002 waits until ch-001 merges successfully
     c. After ch-001 merges, ch-002 rebases onto new main
     d. ch-002 proceeds to merge
   - If ch-001 merge fails: ch-002 stays waiting, alert user
   - TUI shows: "ch-002 waiting on ch-001 merge"

2. PRIORITY BOOST
   P0: +200 queue position (blocker)
   P1: +100 queue position (critical)
   P2: +50 queue position (high)
   P3: +10 queue position (medium)
   P4: +0 queue position (low, FIFO only)

3. FIFO within same priority level

4. CONFLICT DEFERRAL
   Conflicted items go to end after retry.
   After 3 retries without resolution: escalate to human.

5. FORCE-PUSH RECOVERY
   If main branch is force-pushed during merge:
   - Detect via git fetch + ref comparison
   - Pull latest main
   - Rebase agent branch onto new main
   - Retry merge from beginning
   - After 2 force-push recoveries: pause and alert user
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
<chorus>COMPLETE</chorus>              <!-- Task finished successfully -->
<chorus>BLOCKED: reason</chorus>       <!-- Cannot proceed, external blocker -->
<chorus>PROGRESS: 45</chorus>          <!-- Optional: progress percentage -->
<chorus>NEEDS_HELP: clarification</chorus> <!-- Needs user input to continue -->
<chorus>RESOLVED</chorus>              <!-- Conflict resolved (resolver agent) -->
<chorus>NEEDS_HUMAN: reason</chorus>   <!-- Cannot resolve, need human -->
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

Completion requires BOTH signal AND required quality commands passing:

```typescript
interface CompletionCheck {
  type: 'all';
  checks: [
    { type: 'signal', pattern: '<chorus>COMPLETE</chorus>' },
    { type: 'qualityCommands', requiredOnly: true, exitCode: 0 }
  ];
}

// Completion Matrix:
// ┌──────────────────┬─────────────────┬─────────────────────────────────┐
// │ Signal           │ Quality Commands│ Result                          │
// ├──────────────────┼─────────────────┼─────────────────────────────────┤
// │ COMPLETE         │ All Pass        │ ✓ Task CLOSED, queue merge      │
// │ COMPLETE         │ Any Fail        │ Continue iterations             │
// │ BLOCKED          │ (any)           │ Task → BLOCKED, agent stops     │
// │ NEEDS_HELP       │ (any)           │ Alert user, agent pauses        │
// │ No Signal        │ All Pass        │ Continue (agent must signal)    │
// │ No Signal        │ Any Fail        │ Continue iterations             │
// │ Max Iterations   │ (any)           │ Task → TIMEOUT, agent stops     │
// │ Timeout          │ (any)           │ Task → TIMEOUT, agent stops     │
// └──────────────────┴─────────────────┴─────────────────────────────────┘
//
// TIMEOUT State Behavior:
// - Task marked as TIMEOUT (distinct from FAILED)
// - Worktree preserved for debugging
// - User can: (r) retry with fresh iterations, (e) edit task, (R) rollback
// - Autopilot: Skips task, picks next ready task, alerts user
//
// Mode-specific behavior for BLOCKED:
// - Semi-auto: Agent stops, user decides next action
// - Autopilot: Agent freed, task stays BLOCKED, picks next ready task
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
│                    PERMANENT (Shared) - PROJECT ROOT             │
│                                                                  │
│  .agent/learnings.md                                             │
│  ├── Append-only                                                 │
│  ├── Survives all sessions                                       │
│  ├── Shared across ALL agents (claude, codex, opencode)          │
│  └── Git-tracked (versioned)                                     │
│                                                                  │
│  .agent/learnings-meta.json                                      │
│  ├── Review status (which learnings reviewed by Plan Review)     │
│  ├── Dedup hashes (prevent duplicate learnings)                  │
│  └── Git-tracked (metadata for learning system)                  │
│                                                                  │
│  Format (learnings.md):                                          │
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
│                   SESSION (Per-Agent) - WORKTREE                 │
│                                                                  │
│  .worktrees/{agent}-{task-id}/.agent/scratchpad.md               │
│  ├── Current session only                                        │
│  ├── Cleared on task completion                                  │
│  ├── Per-agent in parallel mode                                  │
│  └── Gitignored (in worktree)                                    │
└─────────────────────────────────────────────────────────────────┘

**Directory Structure (Memory-Specific):**

> For full `.chorus/` directory structure, see [Directory Structure: `.chorus/`](#directory-structure-chorus).

```
project-root/
├── .agent/                              # SHARED - Project root (git-tracked)
│   ├── learnings.md                     # Permanent shared learnings
│   └── learnings-meta.json              # Review status, dedup hashes
│
├── .chorus/                             # See Directory Structure section
│
└── .worktrees/                          # Agent worktrees (gitignored)
    └── {agent}-{task-id}/               # e.g., claude-ch-001
        └── .agent/                      # PER-AGENT - Worktree only (gitignored)
            └── scratchpad.md            # Session notes, cleared on completion
```

**⚠️ Important: `.agent/` exists in TWO locations with different purposes:**

| Location | Purpose | Git Status | Lifetime |
|----------|---------|------------|----------|
| Project root `.agent/` | Shared learnings across all agents | Tracked | Permanent |
| Worktree `.agent/` | Per-agent scratchpad | Gitignored | Task duration |

### Cross-Agent Knowledge Sharing

> **MVP Note:** Cross-agent knowledge sharing is Claude-only in MVP.
> Codex/opencode support requires F07b (deferred). The diagram below shows post-MVP behavior.

```
┌─────────────────────────────────────────────────────────────────┐
│              CROSS-AGENT KNOWLEDGE FLOW (Post-MVP)               │
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
T=46: Another Claude agent starts ch-003 (Unicode handling)
      │                       ↑ MVP: Claude only
      │                       ↓ Post-MVP: codex/opencode too
      └─► Claude reads .agent/learnings.md natively
          (Post-MVP: Chorus injects for non-Claude agents)
      │
T=60: Agent uses pattern directly (saved rediscovery time)
```

**MVP Behavior:**
- Claude agents read `.agent/learnings.md` natively (no injection needed)
- Learning extraction works for all agents
- Non-Claude agents work but don't receive injected context

**Post-MVP Behavior (F07b):**
- Non-Claude agents receive learnings via prompt injection
- Full cross-agent knowledge sharing enabled
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

**Learning Pipeline (F40 → F41 → learnings.md):**

```
┌─────────────────────────────────────────────────────────────────┐
│                   LEARNING PIPELINE                              │
└─────────────────────────────────────────────────────────────────┘

Agent writes to scratchpad during task
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ F40: Learning Extractor                                          │
│                                                                  │
│ Input:  .worktrees/{agent}/.agent/scratchpad.md                 │
│ Action: Parse "## Learnings" section                            │
│ Output: Structured Learning objects                              │
│                                                                  │
│ interface Learning {                                             │
│   content: string;        // The actual learning                │
│   category: 'LOCAL' | 'CROSS_CUTTING' | 'ARCHITECTURAL';        │
│   source: { taskId, agentType, timestamp };                     │
│   suggestPattern: boolean; // Should this become a pattern?     │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ F41: Learning Store                                              │
│                                                                  │
│ Responsibilities:                                                │
│ 1. Append to .agent/learnings.md (human-readable, git-tracked)  │
│ 2. Index in memory for fast retrieval (by label, category)      │
│ 3. Track "reviewed" status for Plan Review trigger              │
│ 4. Deduplicate similar learnings                                │
│                                                                  │
│ Storage:                                                         │
│ - Primary: .agent/learnings.md (append-only, survives sessions) │
│ - Index: In-memory during runtime (rebuilt on startup)          │
│ - Metadata: .agent/learnings-meta.json (review status, etc.)    │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Downstream Consumers                                             │
│                                                                  │
│ F07 Prompt Builder ← Retrieves relevant learnings by task label │
│ F93 Learning Categorizer ← Gets unreviewed learnings            │
│ F94 Plan Review Trigger ← Checks for CROSS_CUTTING learnings    │
│ PATTERNS.md Manager ← Gets pattern suggestions                  │
└─────────────────────────────────────────────────────────────────┘
```

**De-duplication Algorithm:**

```typescript
interface DeduplicationConfig {
  algorithm: 'exact' | 'similarity';
  threshold: number;        // 0.85 for similarity matching
  action: 'skip' | 'merge'; // What to do with duplicates
}

// Default config
const DEFAULT_DEDUP: DeduplicationConfig = {
  algorithm: 'similarity',
  threshold: 0.85,
  action: 'skip'
};
```

| Step | Action | Example |
|------|--------|---------|
| 1. Hash incoming | Generate hash of normalized learning content | `sha256("rate limiting needed")` |
| 2. Check exact match | Compare hash against `learnings-meta.json` | Hash exists → duplicate |
| 3. If no exact match | Run similarity check against recent learnings (last 50) | Cosine similarity > 0.85 |
| 4. If similar found | Action based on config: `skip` (discard) or `merge` (combine) | Skip if already captured |
| 5. Store hash | Add hash to `learnings-meta.json` for future checks | Prevent re-discovery |

**Similarity Matching Details:**
- Uses normalized text (lowercase, trimmed, stop-words removed)
- Compares against learnings from last 7 days or last 50 entries (whichever is smaller)
- Threshold 0.85 catches near-duplicates like "add rate limiting" vs "implement rate limiting"
- On merge: Keep newer learning, append source references

**File Relationships:**

| File | Purpose | Updated By | Read By |
|------|---------|------------|---------|
| `.agent/scratchpad.md` | Agent writes discoveries during task | Agent | F40 Extractor |
| `.agent/learnings.md` | Permanent, shared learnings (git-tracked) | F41 Store | F07, all agents |
| `.agent/learnings-meta.json` | Review status, dedup hashes | F41 Store | F93, F94 |
| `.chorus/PATTERNS.md` | Promoted patterns (curated) | PATTERNS Manager | All agents |

### Learning-Triggered Plan Review (Adaptive Task Refinement)

> **M8 Feature (F93-F97):** Automatically reviews and updates pending tasks when cross-cutting learnings are discovered.

When an agent discovers something that affects multiple tasks, the plan shouldn't stay frozen. This feature creates a feedback loop from implementation back to planning.

```
┌─────────────────────────────────────────────────────────────────┐
│            LEARNING-TRIGGERED PLAN REVIEW FLOW                   │
└─────────────────────────────────────────────────────────────────┘

Task ch-005 completes
       │
       ▼
Learning extracted: [CROSS-CUTTING] "All API calls need rate limiting"
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PLAN REVIEW LOOP                              │
│                                                                  │
│  Iteration 1:                                                    │
│  ├── Plan Agent reviews all open tasks                          │
│  ├── Proposes: Update ch-010, ch-015 acceptance criteria        │
│  ├── Proposes: Mark ch-020 as redundant                         │
│  └── Changes: 3                                                  │
│                                                                  │
│  Iteration 2:                                                    │
│  ├── Reviews updated tasks                                       │
│  ├── Proposes: Add test case to ch-010                          │
│  └── Changes: 1                                                  │
│                                                                  │
│  Iteration 3:                                                    │
│  ├── Reviews again                                               │
│  └── Changes: 0 ← STOP (converged)                              │
│                                                                  │
│  (maxIterations: 5, but stopped early at iteration 3)           │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
User notified of changes (or auto-applied based on config)
```

**Learning Categories:**

| Category | Trigger Review? | Example |
|----------|-----------------|---------|
| `[LOCAL]` | No | "This specific function needs memoization" |
| `[CROSS-CUTTING]` | Yes | "All API calls need rate limiting" |
| `[ARCHITECTURAL]` | Yes + Alert | "State management should use Zustand" |

**Iteration Behavior:**
- Loop runs until **no changes** in current iteration OR **maxIterations** reached
- Early stop saves tokens and prevents over-refinement
- Each iteration can: update acceptance criteria, add/remove tasks, adjust dependencies

**Plan Agent Review Prompt:**

```markdown
# Learning Review Task

## New Learning
[CROSS-CUTTING] All API endpoints require rate limiting middleware

## Source
Task: ch-005 (Implement user authentication)
Agent: claude
Discovered: 2026-01-11T14:30:00Z

## Open Tasks (from Beads)
1. ch-010: Implement notification API (6 tests)
2. ch-015: Add payment endpoints (8 tests)
3. ch-020: Create rate limiting middleware (10 tests)
4. ch-025: TUI dashboard components (12 tests)

## Instructions
Review each task against this learning:
1. Should acceptance criteria be updated?
2. Should task description change?
3. Is this task now redundant (learning already covers it)?
4. Are dependencies affected?

## Output Format
{
  "updates": [
    { "taskId": "ch-010", "change": "add_criteria", "value": "Include rate limiting" }
  ],
  "redundant": ["ch-020"],
  "unchanged": ["ch-025"]
}
```

**Configuration:**

```json
{
  "planReview": {
    "enabled": true,
    "maxIterations": 5,
    "triggerOn": ["cross_cutting", "architectural"],
    "autoApply": "minor",
    "requireApproval": ["redundant", "dependency_change", "major_scope"]
  }
}
```

| Setting | Values | Description |
|---------|--------|-------------|
| `enabled` | boolean | Feature toggle |
| `maxIterations` | 1-10 | Max review cycles (stops early if no changes) |
| `triggerOn` | array | Which learning types trigger review |
| `autoApply` | `none` / `minor` / `all` | What to apply without approval |
| `requireApproval` | array | Changes that need user confirmation |

**Error Handling:**

| Error Scenario | Detection | Recovery Action |
|----------------|-----------|-----------------|
| Review times out | `maxIterations` or wall-clock timeout | Notify user, continue without applying changes |
| LLM returns invalid JSON | JSON parse error | Retry once with simpler prompt, then skip iteration |
| Beads update fails | `bd update` exit code != 0 | Log error, skip task update, continue review |
| Concurrent review requests | Second trigger while first running | Queue request, process after current completes |
| Network error (LLM API) | Request timeout/connection error | Retry with exponential backoff (max 3), then pause |

**Concurrency Model:**
```
Review Request A arrives
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Is review in progress?                                          │
│  ├── No  → Start review immediately                             │
│  └── Yes → Queue request, process after current completes       │
│                                                                  │
│  Queue is FIFO, max size 3 (drop oldest if full)                │
└─────────────────────────────────────────────────────────────────┘
```

**Anti-Waterfall Benefit:**
This directly addresses the waterfall problem discussed in the design principles. Instead of frozen plans that diverge from reality, the plan becomes a **living document** that adapts to implementation discoveries.

### Implementation-Triggered Task Creation (Incremental Planning)

> **M8 Feature (F98-F101):** Just-in-time task creation based on implementation progress.

Instead of planning all tasks upfront (waterfall), plan just enough to start, then create more tasks as implementation reveals what's actually needed.

```
┌─────────────────────────────────────────────────────────────────┐
│        INCREMENTAL PLANNING vs UPFRONT PLANNING                  │
└─────────────────────────────────────────────────────────────────┘

UPFRONT (Waterfall-ish):
┌─────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Init   │ → │ Plan 30 tasks    │ → │ Implement all    │
└─────────┘    └──────────────────┘    └──────────────────┘
                     ↑
            Problem: Tasks 25-30 planned
            without implementation context

INCREMENTAL (Just-in-Time):
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Init   │ → │ Plan 10    │ → │ Implement  │ → │ Plan +5    │ → ...
└─────────┘    │ tasks      │    │ 3-5 tasks  │    │ tasks      │
               └────────────┘    └────────────┘    └────────────┘
                                       ↓
                              Learnings + implementation
                              context inform next tasks
```

**Planning Horizon Concept:**

Plan only what you can confidently specify without implementation knowledge:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANNING HORIZON                              │
└─────────────────────────────────────────────────────────────────┘

        HORIZON 1                 HORIZON 2              HORIZON 3
     (plannable now)          (after H1 done)        (after H2 done)
    ┌───────────────┐        ┌───────────────┐      ┌───────────────┐
    │ F01: Types    │───────►│ F07: Prompt   │─────►│ F20: Full     │
    │ F02: State    │        │ F08: Signal   │      │     Integration│
    │ F03: Init     │        │ F10: TestRun  │      │ F21: Autopilot│
    │ F04: Worktree │        │ F11: Checker  │      │ ...           │
    └───────────────┘        └───────────────┘      └───────────────┘
           │                        │                      │
           └────────────────────────┴──────────────────────┘
                          │
                 Each horizon is planned
                 when previous completes
```

**Stop Conditions for Initial Planning:**

| Condition | Example | Action |
|-----------|---------|--------|
| `unknownDependency` | "Need to see how auth is implemented first" | Stop, mark as horizon boundary |
| `decisionPoint` | "A or B approach - depends on benchmarks" | Stop, decide after implementation |
| `taskCountReached` | Reached initial task count limit | Stop, resume after progress |
| `specComplete` | All spec sections have tasks | Planning done |

**Incremental Planning Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│            IMPLEMENTATION-TRIGGERED TASK CREATION                │
└─────────────────────────────────────────────────────────────────┘

Task ch-005 completes successfully
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check: Ready task count                                         │
│  ├── Current ready tasks: 3                                      │
│  └── Threshold: 5                                                │
│                                                                  │
│  Result: Below threshold → Trigger planning                      │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Planning Context:                                               │
│  ├── Spec: survey-spec.md (sections 4-6 not yet tasked)         │
│  ├── Learnings: "Rate limiting needed everywhere"               │
│  ├── Implementation: F01-F05 complete, see patterns             │
│  └── Dependencies: F06+ can now be planned                      │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Plan Agent creates tasks:                                       │
│  ├── F06: Response handler (informed by F05 patterns)           │
│  ├── F07: Validation (learned: needs rate limiting)             │
│  ├── F08: Storage adapter (F01 types reusable)                  │
│  └── Stop: F09+ needs F08 implementation first                  │
│                                                                  │
│  New ready tasks: 6 (above threshold)                            │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
Implementation continues...
```

**Spec Lifecycle (Consumed Backlog Pattern):**

Specs are **consumed** as they become tasks. Once tasked, sections collapse. Once complete, specs archive.

**Spec Creation Methods:**

| Method | When | How |
|--------|------|-----|
| **Manual** | User has a PRD/spec document | `chorus spec import path/to/spec.md` or copy to `.chorus/specs/` |
| **Interactive** | User describes feature in Planning Mode | Plan Agent creates spec from conversation |
| **Template** | Starting a new feature | `chorus spec new --template feature` |

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPEC CREATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

Option A: Import existing
┌─────────────────────────────────────────────────────────────────┐
│ $ chorus spec import ~/docs/survey-prd.md                        │
│                                                                  │
│ → Copies to .chorus/specs/survey-prd.md                          │
│ → Adds 📋 emoji prefix to all ## headings                        │
│ → Creates entry in spec-progress.json                            │
│ → Validates structure (see Spec Validation below)                │
└─────────────────────────────────────────────────────────────────┘

**Spec Validation Rules:**

| Rule | Description | Error |
|------|-------------|-------|
| Has `# Title` | Must have exactly one H1 heading | "Missing or multiple H1 titles" |
| Has sections | At least one `## Section` heading | "No sections found" |
| No empty sections | Each section must have content | "Empty section: {heading}" |
| Valid markdown | Must parse as valid markdown | "Invalid markdown syntax" |
| No duplicate headings | Section headings must be unique | "Duplicate heading: {heading}" |
| Reasonable size | Max 10,000 lines (configurable) | "Spec too large for processing" |

**Validation Output Example:**
```
$ chorus spec import ~/docs/survey-prd.md

Validating spec...
✓ Title found: "Survey System Spec"
✓ 4 sections detected
✓ All sections have content
✓ No duplicate headings
✓ Markdown syntax valid

Spec imported successfully!
→ .chorus/specs/survey-prd.md
→ 4 sections marked as 📋 draft
```

Option B: Interactive creation
┌─────────────────────────────────────────────────────────────────┐
│ User: "I want to build a survey system"                          │
│                                                                  │
│ Plan Agent: Creates survey-spec.md with:                         │
│   ## 📋 1. Overview                                               │
│   ## 📋 2. Questions                                               │
│   ## 📋 3. Responses                                               │
│   ## 📋 4. Analytics                                               │
│                                                                  │
│ User can edit/approve before planning begins                     │
└─────────────────────────────────────────────────────────────────┘

Option C: Template
┌─────────────────────────────────────────────────────────────────┐
│ $ chorus spec new --name "user-auth" --template feature          │
│                                                                  │
│ → Creates .chorus/specs/user-auth.md from template               │
│ → User fills in sections                                         │
│ → Plan Agent validates completeness                              │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│                       SPEC LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

Phase 1: CREATION
┌─────────────────────────────────────────────────────────────────┐
│ .chorus/specs/survey-spec.md                                     │
│                                                                  │
│ # Survey System Spec                                             │
│ Status: draft                                                    │
│                                                                  │
│ ## 📋 1. Overview                    ← All sections DRAFT       │
│ ## 📋 2. Questions                                               │
│ ## 📋 3. Responses                                               │
│ ## 📋 4. Analytics                                               │
└─────────────────────────────────────────────────────────────────┘

Phase 2: HORIZON 1 PLANNING
┌─────────────────────────────────────────────────────────────────┐
│ .chorus/specs/survey-spec.md                                     │
│                                                                  │
│ ## ✅ 1. Overview (→ ch-001, ch-002)  ← COLLAPSED               │
│ <details><summary>Tasked</summary>                               │
│ Original content here for reference...                           │
│ </details>                                                       │
│                                                                  │
│ ## ✅ 2. Questions (→ ch-003, ch-004, ch-005)  ← COLLAPSED      │
│ <details><summary>Tasked</summary>...</details>                  │
│                                                                  │
│ ## 📋 3. Responses                    ← Still DRAFT (visible)   │
│ Full content visible, next to be planned...                      │
│                                                                  │
│ ## 📋 4. Analytics                    ← Still DRAFT (visible)   │
│ Full content visible...                                          │
└─────────────────────────────────────────────────────────────────┘

Phase 3: ALL TASKED → ARCHIVE
┌─────────────────────────────────────────────────────────────────┐
│ All sections now ✅ TASKED                                       │
│                                                                  │
│ Action: Move to archive                                          │
│ FROM: .chorus/specs/survey-spec.md                               │
│   TO: .chorus/specs/archive/survey-spec.md                       │
│                                                                  │
│ Archived specs are NEVER loaded into agent context               │
│ unless user explicitly requests with --include-archived          │
└─────────────────────────────────────────────────────────────────┘
```

**Learnings from Archived Specs:**

When a spec is archived, the learnings discovered during its implementation are NOT lost:

```
┌─────────────────────────────────────────────────────────────────┐
│            LEARNING PRESERVATION ACROSS ARCHIVE                  │
└─────────────────────────────────────────────────────────────────┘

During Implementation:
┌─────────────────────────────────────────────────────────────────┐
│ Task ch-005 (from survey-spec.md ## 2. Questions)                │
│                                                                  │
│ Agent discovers: "Rate limiting needed for all endpoints"        │
│         │                                                        │
│         ▼                                                        │
│ F40 extracts → F41 stores in .agent/learnings.md                │
│         │                                                        │
│         └─► Learning includes: source: "ch-005"                 │
│             (task ID is permanent, spec reference not needed)    │
└─────────────────────────────────────────────────────────────────┘

After Archive:
┌─────────────────────────────────────────────────────────────────┐
│ survey-spec.md → .chorus/specs/archive/                          │
│                                                                  │
│ Learnings in .agent/learnings.md:                               │
│ - Still reference task IDs (ch-005)                             │
│ - Task IDs queryable via Beads (bd show ch-005)                 │
│ - Context preserved: agent type, timestamp, category             │
│                                                                  │
│ PATTERNS.md:                                                     │
│ - Patterns promoted from learnings survive forever               │
│ - No reference to source spec needed                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight:** Learnings are tied to TASK IDs, not SPEC files. Archiving a spec doesn't affect learnings because:
1. Learnings reference task IDs (permanent)
2. Task metadata is in Beads (queryable forever)
3. Patterns in PATTERNS.md are standalone

**Spec Section States:**

| State | Emoji | In Spec File | In Context | Plan Review Access |
|-------|-------|--------------|------------|-------------------|
| `draft` | 📋 | Full content visible | Yes | N/A (no tasks yet) |
| `planning` | 🚧 | Full content visible | Yes | N/A (tasks being created) |
| `tasked` | ✅ | Collapsed `<details>` | No (collapsed) | Via `spec-progress.json` |
| `archived` | 🏁 | Moved to archive/ | Never | Via archived task IDs |

**Plan Review + Collapsed Sections:**
When Plan Review needs to update a task from a collapsed section:
1. Review uses `spec-progress.json` to find task → section mapping
2. Task metadata contains original acceptance criteria (stored in Beads)
3. Review updates task in Beads, NOT the collapsed spec section
4. Original spec content preserved in `<details>` for human reference only

**Directory Structure (Spec-Specific):**

> This shows only `.chorus/specs/`. For full directory structure, see [Directory Structure: `.chorus/`](#directory-structure-chorus).

```
.chorus/specs/
├── survey-spec.md           # Active spec (only 📋 sections visible)
├── auth-spec.md             # Another active spec
├── spec-progress.json       # Tracks all specs and section states
└── archive/                 # Completed specs (never in context)
    ├── onboarding-spec.md   # 🏁 All tasks closed
    └── settings-spec.md     # 🏁 All tasks closed
```

**spec-progress.json:**

```json
{
  "specs": [
    {
      "file": "survey-spec.md",
      "status": "in_progress",
      "created": "2026-01-11T10:00:00Z",
      "sections": [
        {
          "heading": "## 1. Overview",
          "status": "tasked",
          "tasks": ["ch-001", "ch-002"],
          "taskedAt": "2026-01-11T10:30:00Z"
        },
        {
          "heading": "## 2. Questions",
          "status": "tasked",
          "tasks": ["ch-003", "ch-004", "ch-005"],
          "taskedAt": "2026-01-11T10:30:00Z"
        },
        {
          "heading": "## 3. Responses",
          "status": "draft",
          "tasks": [],
          "taskedAt": null
        },
        {
          "heading": "## 4. Analytics",
          "status": "draft",
          "tasks": [],
          "taskedAt": null
        }
      ],
      "planningHorizon": 2
    }
  ],
  "archivePolicy": "collapse_then_archive"
}
```

**Spec File Format (After Tasking):**

```markdown
# Survey System Spec

**Status:** in_progress
**Created:** 2026-01-11
**Last Planning:** 2026-01-11T14:30:00Z
**Draft Sections:** 2 remaining

---

## 📋 4. Analytics

Display survey results with charts and export options.

### Requirements
- Pie charts for multiple choice
- Bar charts for ratings
- CSV export

### Acceptance Criteria
- User can view response summary
- Charts render correctly
- Export produces valid CSV

---

## 📋 3. Responses

Collect and store survey responses...

---

## ✅ 2. Questions (TASKED)

<details>
<summary>→ ch-003, ch-004, ch-005 (click to expand)</summary>

Original spec content preserved for reference during implementation.
This section is collapsed and NOT included in agent context.

</details>

---

## ✅ 1. Overview (TASKED)

<details>
<summary>→ ch-001, ch-002 (click to expand)</summary>

Original spec content...

</details>
```

**Configuration:**

```json
{
  "incrementalPlanning": {
    "enabled": true,
    "mode": "incremental",
    "horizon": {
      "initialTaskCount": 10,
      "minReadyTasks": 5,
      "stopConditions": ["unknownDependency", "decisionPoint", "taskCountReached"]
    },
    "spec": {
      "path": ".chorus/specs/",
      "archivePolicy": "collapse_then_archive",
      "collapseTaskedSections": true,
      "archiveOnComplete": true
    },
    "fullAuto": {
      "enabled": true,
      "doneDetection": "allSpecSectionsTaskedAndClosed",
      "scopeGuard": true
    }
  }
}
```

| Setting | Values | Description |
|---------|--------|-------------|
| `enabled` | boolean | Feature toggle |
| `mode` | `incremental` / `upfront` | Planning strategy |
| `initialTaskCount` | 5-20 | How many tasks to create initially |
| `minReadyTasks` | 3-10 | Threshold to trigger new planning |
| `stopConditions` | array | When to pause planning for current horizon |
| `collapseTaskedSections` | boolean | Wrap tasked sections in `<details>` |
| `archiveOnComplete` | boolean | Move to archive/ when all tasks closed |
| `doneDetection` | string | How to know feature is complete |
| `scopeGuard` | boolean | Prevent scope creep beyond spec |

**Archive Policy Options:**

| Policy | Behavior |
|--------|----------|
| `collapse_then_archive` | Collapse on task, archive on complete (recommended) |
| `immediate_archive` | Move section to archive immediately when tasked |
| `keep_visible` | Never collapse or archive (not recommended) |

**Full-Auto Mode Support:**

For incremental planning to work in autopilot:

1. **Done Detection:** Feature complete when all spec sections tasked AND all tasks closed
2. **Scope Guard:** New tasks must map to a spec section (prevents endless task creation)
   - **Exception:** Cross-cutting tasks from learnings are allowed (labeled `infrastructure` or `cross-cutting`)
   - These tasks are tracked separately and don't block Done Detection
   - Example: "Rate limiting middleware" discovered via learning → creates `ch-xxx [cross-cutting]`
3. **Planning Autonomy:** Agent decides when more tasks needed (ready count < threshold)
4. **Auto-Archive:** When complete, spec moves to archive/ without user intervention

```
┌─────────────────────────────────────────────────────────────────┐
│              FULL-AUTO INCREMENTAL PLANNING                      │
└─────────────────────────────────────────────────────────────────┘

Autopilot running...
       │
       ▼
Ready tasks exhausted (count = 0)
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Check: Can we plan more?                                        │
│  ├── Spec sections without tasks: 2 (## 4, ## 5)                │
│  ├── Current implementation: F01-F07 complete                   │
│  └── Decision: Yes, can plan ## 4                               │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
Plan Agent creates tasks for ## 4. Analytics
       │
       ▼
Autopilot continues with new tasks
       │
       ▼
All spec sections implemented
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Done Detection:                                                 │
│  ├── All spec sections have tasks: ✓                            │
│  ├── All tasks closed: ✓                                        │
│  └── Result: FEATURE COMPLETE                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Two Mechanisms Working Together:**

| Mechanism | Trigger | Action | Scope |
|-----------|---------|--------|-------|
| **Learning-Triggered Plan Review** | Cross-cutting learning discovered | Update EXISTING tasks | Refinement |
| **Implementation-Triggered Task Creation** | Ready count low OR horizon complete | Create NEW tasks | Extension |

```
Task completes
     │
     ▼
Step 1: Extract learnings
     │
     ├── [LOCAL] → No action, continue to Step 2
     │
     └── [CROSS-CUTTING] or [ARCHITECTURAL]
               │
               ▼
         Step 1b: Plan Review Loop
               │
               ├── Update existing tasks
               ├── Mark redundant tasks
               └── Wait for convergence (no changes)
               │
               ▼
Step 2: Check ready task count (AFTER Plan Review completes)
     │
     ├── Above threshold → Continue implementation
     │
     └── Below threshold
               │
               ▼
         Step 3: Task Creation
               │
               ├── Create new tasks from spec
               └── Create cross-cutting tasks from learnings
                   (if not already covered by Plan Review)
```

**Execution Order Guarantee:**
1. Learning extraction ALWAYS runs first
2. Plan Review MUST complete before Task Creation starts
3. This prevents race conditions where new tasks are created while Review is updating

**Why this order matters:**
- Plan Review might mark tasks as redundant
- Task Creation should see the updated task list
- Prevents creating duplicate or conflicting tasks
```

### Manual Review Triggers (TUI)

Users can manually trigger both review mechanisms from the TUI:

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS IMPLEMENTATION                    [P] Plan  [L] Learn    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status Bar:                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 📋 Ready: 4/15  │ 📚 Learnings: 3 new │ 📝 Spec: 3/5     │   │
│  └──────────────────────────────────────────────────────────┘   │
│        ↑                    ↑                   ↑               │
│   Task count          Unreviewed          Sections tasked       │
│                       learnings                                  │
│                                                                  │
│  Press [L] to review learnings and update tasks                 │
│  Press [P] to plan more tasks from spec                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Manual Trigger Behavior:**

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `L` | Learning-Triggered Plan Review | Only if unreviewed learnings exist |
| `P` | Implementation-Triggered Task Creation | Only if spec has untasked sections |
| `Shift+L` | Force learning review | Review even if no new learnings |
| `Shift+P` | Force task creation | Plan even if above threshold |

**Status Indicators:**

```
LEARNING STATUS:
📚  Unreviewed learnings exist (can press L)
📖  All learnings reviewed (L disabled)
📕  Learning extraction in progress

PLANNING STATUS:
📝  More spec sections to plan (can press P)
✅  All spec sections tasked (P disabled)
📋  Planning in progress
```

**Manual Trigger Dialog:**

When user presses `L`:

```
┌─────────────────────────────────────────────────────────────────┐
│ LEARNING REVIEW                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  3 new learnings since last review:                             │
│                                                                  │
│  1. [CROSS-CUTTING] API rate limiting required                  │
│     Source: ch-005 (claude)                                     │
│                                                                  │
│  2. [LOCAL] mb_str_split faster than preg_split                 │
│     Source: ch-003 (claude)                                     │
│                                                                  │
│  3. [ARCHITECTURAL] Zustand better than Context for state       │
│     Source: ch-006 (claude)                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [R] Run Review Now  [S] Skip LOCAL  [C] Cancel            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

When user presses `P`:

```
┌─────────────────────────────────────────────────────────────────┐
│ INCREMENTAL PLANNING                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current status:                                                 │
│  ├── Ready tasks: 4 (threshold: 5)                              │
│  ├── Spec progress: 3/5 sections tasked                         │
│  └── Next section: ## 4. Analytics                              │
│                                                                  │
│  Implementation context:                                         │
│  ├── Completed: F01-F07 (types, state, responses)               │
│  ├── Patterns discovered: 3                                     │
│  └── Learnings available: 5                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [P] Plan Next Section  [A] Plan All Remaining  [C] Cancel │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cross-Agent Patterns (PATTERNS.md)

Universal patterns that all agents should know, stored in `.chorus/PATTERNS.md`:

```markdown
# Project Patterns

## Code Conventions
- All models use UUID for primary keys
- API routes follow RESTful naming: `/api/v1/{resource}`
- Error handling uses custom AppError class

## Database
- Use Prisma for all queries
- Run `prisma generate` after schema changes
- Migrations via `prisma migrate dev`

## Testing
- Use Pest for PHP, Vitest for TypeScript
- Mock external services in tests
- Minimum 80% coverage for new code

## Gotchas
- Frontend env vars need NEXT_PUBLIC_ prefix
- Cache invalidation required after user updates
```

**How it's used:**
1. Plan Agent reads PATTERNS.md when validating tasks
2. Implementation agents receive PATTERNS.md in prompt via F07 Prompt Builder
3. Learning Extractor suggests additions to PATTERNS.md from agent discoveries
4. User can manually edit PATTERNS.md anytime

**PATTERNS.md Update Flow:**

```
Agent discovers pattern during task
       │
       ▼
Learning Extractor (F40) categorizes:
       │
       ├── [LOCAL] → Only to learnings.md, not patterns
       │
       └── [CROSS-CUTTING] or [ARCHITECTURAL]
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pattern Suggestion Created                                      │
│  ├── Proposed text: "All API calls need rate limiting"          │
│  ├── Source: ch-005 (claude)                                    │
│  ├── Category: "API Design"                                     │
│  └── Status: pending_review                                     │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Review Options (based on config)                                │
│                                                                  │
│  autoApply: "none"    → User must approve in TUI                │
│  autoApply: "minor"   → Auto-add to PATTERNS.md, notify user    │
│  autoApply: "all"     → Auto-add silently                       │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
If approved/auto-applied:
       │
       ├── Append to appropriate section in PATTERNS.md
       ├── Add source attribution: "Source: ch-005"
       ├── Commit: "patterns: add rate limiting guideline"
       └── Log to session-log.jsonl: pattern_added event
```

**TUI Pattern Review:**

```
┌─────────────────────────────────────────────────────────────────┐
│ NEW PATTERN SUGGESTION                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Category: API Design                                            │
│  Source: ch-005 (claude) - "Implement user auth"                │
│                                                                  │
│  Suggested pattern:                                              │
│  "All API endpoints require rate limiting middleware"            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [A] Approve  [E] Edit  [R] Reject  [L] Later              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Pattern Action Results:**

| Action | Immediate Effect | Future Behavior |
|--------|------------------|-----------------|
| **[A] Approve** | Append to PATTERNS.md, commit, log `pattern_approved` | All agents see pattern in prompt |
| **[E] Edit** | Open editor, user modifies text, then Approve flow | Modified version goes to PATTERNS.md |
| **[R] Reject** | Log `pattern_rejected` with reason, discard | NOT suggested again from same task |
| **[L] Later** | Add to pending queue, remind after next task | Resurfaces in TUI notification area |

**Rejection Flow Details:**

```
User presses [R] Reject
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Optional: Enter rejection reason                                │
│  > "Too specific to this task, not generalizable"               │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Actions taken:                                                  │
│  1. Log to session-log.jsonl:                                   │
│     {"event": "pattern_rejected", "content": "...",             │
│      "reason": "Too specific...", "source": "ch-005"}           │
│  2. Add to rejection index (learnings-meta.json):               │
│     Stores hash of pattern content + source task                │
│  3. Future: Same pattern from same task → auto-skip             │
│     (But same pattern from DIFFERENT task → re-suggest)         │
└─────────────────────────────────────────────────────────────────┘
```

**Later Queue Behavior:**
- "Later" patterns stored in `.chorus/pending-patterns.json`
- TUI shows notification: "📝 3 patterns pending review"
- User can press `Shift+P` to review pending patterns
- Auto-expire after 7 days if not reviewed (logged as `pattern_expired`)

### AGENTS.md vs PATTERNS.md Distinction

| Aspect | AGENTS.md | PATTERNS.md |
|--------|-----------|-------------|
| **Location** | Project root | `.chorus/PATTERNS.md` |
| **Author** | Human (developer) | Machine-discovered + human-curated |
| **Purpose** | Project conventions for all agents | Cross-agent learned patterns |
| **Content** | Architecture, coding style, commit conventions, team rules | Runtime discoveries, gotchas, performance tips |
| **Updates** | Manual edits by developer | Auto-suggested by Learning Extractor |
| **Scope** | Static project knowledge | Dynamic session learnings |
| **Example** | "Use Prisma for all DB queries" | "mb_str_split() is 3x faster than preg_split() for Unicode" |

**Why both?**
- `AGENTS.md` = What developers WANT agents to know (intentional)
- `PATTERNS.md` = What agents DISCOVER while working (emergent)

**Loading Mechanism:**

| File | Claude Loading | Non-Claude Loading (Post-MVP) |
|------|----------------|-------------------------------|
| `AGENTS.md` | Via symlink: `.claude/rules/AGENTS.md` → `AGENTS.md` | F07 injects in prompt prefix |
| `PATTERNS.md` | F07 injects in prompt | F07 injects in prompt prefix |
| `learnings.md` | Claude reads natively (in `.agent/`) | F07 injects relevant learnings |

**Setup Requirement (Init Flow):**
During `chorus init`, create symlink for Claude to read AGENTS.md:
```bash
ln -s ../../AGENTS.md .claude/rules/AGENTS.md
```

**Why different loading mechanisms?**

| File | Why This Method | Token Impact |
|------|-----------------|--------------|
| `AGENTS.md` | Symlink loads once at session start, persists across tasks | Low (one-time cost) |
| `PATTERNS.md` | F07 injects per-task to ensure latest patterns | Medium (per task) |
| `learnings.md` | Claude reads natively; F07 filters relevant ones for non-Claude | Variable (filtered) |

**Why F07 injects PATTERNS.md even for Claude?**
- PATTERNS.md is in `.chorus/` which Claude doesn't auto-load from `.claude/rules/`
- Consistent injection ensures all agents see same patterns
- Avoids symlink complexity (`.chorus/` → `.claude/` coupling)
- Patterns update during session, so per-task injection is correct behavior

**Why not symlink PATTERNS.md like AGENTS.md?**
- AGENTS.md is static during a session (developer manually edits)
- PATTERNS.md changes during session (agents discover patterns)
- Symlinked files are read once at session start
- F07 injection ensures freshest patterns per task

**Loading Order:**
1. Claude reads `.claude/rules/AGENTS.md` (symlink) at session start
2. F07 Prompt Builder injects PATTERNS.md into task prompt (all agents)
3. F07 injects relevant learnings based on task labels (all agents)

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

### Hook Registration

Hooks are registered via **auto-discovery** or **explicit config**:

**Option 1: Auto-Discovery (Recommended)**
```
.chorus/hooks/
├── pre-agent-start.sh      # Executable script
├── post-task-complete.sh   # Named by event
└── on-conflict.sh
```
Scripts must be executable (`chmod +x`) and named exactly as the event.

**Option 2: Explicit Config**
```json
// In .chorus/config.json
{
  "hooks": {
    "post-task-complete": ".chorus/hooks/extract-learnings.sh",
    "pre-merge": [
      ".chorus/hooks/validate-branch.sh",
      ".chorus/hooks/notify-slack.sh"
    ]
  }
}
```

**Precedence:** Explicit config overrides auto-discovery for the same event.

### Hook Timeout & Error Handling

Hooks have configurable timeout and retry behavior:

```json
{
  "hookConfig": {
    "timeout": 30000,
    "retryOnError": false,
    "maxRetries": 1,
    "continueOnFailure": true
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `timeout` | 30000 | Max execution time in ms (30s default) |
| `retryOnError` | false | Retry hook if it exits with non-zero |
| `maxRetries` | 1 | Number of retries if retryOnError=true |
| `continueOnFailure` | true | Continue operation if hook fails |

**Behavior on Hook Failure:**

| Scenario | `continueOnFailure=true` | `continueOnFailure=false` |
|----------|--------------------------|---------------------------|
| Hook times out | Log warning, continue | Halt operation, show error |
| Hook exits non-zero | Log warning, continue | Halt operation, show error |
| Hook returns `block` | Always halt (intentional) | Always halt (intentional) |
| Hook not found | Skip silently | Skip silently |

**Per-Hook Override:**

```json
{
  "hooks": {
    "pre-merge": {
      "command": ".chorus/hooks/validate-branch.sh",
      "timeout": 60000,
      "continueOnFailure": false
    }
  }
}
```

### Hook Input/Output Format

**Input Fields by Event:**

| Hook Event | `agent` | `task` | `iteration` | `output` | `merge` | `error` |
|------------|:-------:|:------:|:-----------:|:--------:|:-------:|:-------:|
| `pre-agent-start` | ✓ | ✓ | - | - | - | - |
| `post-agent-start` | ✓ | ✓ | - | - | - | - |
| `pre-task-claim` | - | ✓ | - | - | - | - |
| `post-task-claim` | ✓ | ✓ | - | - | - | - |
| `pre-iteration` | ✓ | ✓ | ✓ | - | - | - |
| `post-iteration` | ✓ | ✓ | ✓ | ✓ | - | - |
| `pre-task-complete` | ✓ | ✓ | ✓ | ✓ | - | - |
| `post-task-complete` | ✓ | ✓ | ✓ | ✓ | - | - |
| `pre-merge` | ✓ | ✓ | - | - | ✓ | - |
| `post-merge` | ✓ | ✓ | - | - | ✓ | - |
| `on-agent-error` | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| `on-agent-timeout` | ✓ | ✓ | ✓ | ✓ | - | - |
| `on-conflict` | ✓ | ✓ | - | - | ✓ | - |

**Legend:** ✓ = field present, - = field absent

**Field Schemas:**

```typescript
interface HookInput {
  event: string;           // Always present

  agent?: {
    id: string;            // e.g., "claude-ch-001"
    type: AgentType;       // "claude" | "codex" | "opencode"
    worktree: string;      // e.g., ".worktrees/claude-ch-001"
    pid?: number;          // Process ID (post-start only)
  };

  task?: {
    id: string;            // e.g., "ch-001"
    title: string;
    status: TaskStatus;
    priority: number;
    labels: string[];
  };

  iteration?: {
    number: number;        // Current iteration (1-based)
    maxIterations: number; // Config limit
  };

  output?: {
    stdout: string;        // Last N lines of agent output
    stderr?: string;       // If any
    exitCode: number;      // 0 = success
    signal?: Signal;       // Parsed <chorus>...</chorus> if present
  };

  merge?: {
    branch: string;        // e.g., "agent/claude/ch-001"
    targetBranch: string;  // e.g., "main"
    conflictFiles?: string[]; // Only for on-conflict
  };

  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

**Example Input (post-iteration):**

```json
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
```

**Output Format:**

```json
{
  "result": "continue",
  "message": "Optional message for TUI"
}
```

| `result` Value | Meaning |
|----------------|---------|
| `continue` | Proceed normally |
| `block` | Halt operation, show message |
| `complete` | Override completion check (use sparingly) |

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

### Edge Cases & Behaviors

| Scenario | Behavior |
|----------|----------|
| **TUI Exit with Running Agents** | Prompt: "Kill all agents or let them continue?" Grace period 30s, then force-kill |
| **Pause Duration** | Indefinite until user presses Space again to resume |
| **Agent CLI Unavailable During Run** | Pre-spawn checks run before each agent; if CLI missing, task → pending |
| **Planning Exit Mid-Review** | State auto-persisted; resuming shows current iteration |
| **Resolver Creates New Conflicts** | Works on throwaway branch; if fails, escalate to human |
| **Multiple Rule Violations** | Review loop shows all violations; user fixes in priority order |
| **Hook Returns "block"** | Operation halted, message shown, allows user intervention |
| **Learnings Outdated/Incorrect** | Agent can ignore; priority is current task, not historical |
| **Learning File Corrupted** | Recover from git history; warn user |

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
├── How: git revert all commits with [ch-xxx] tag
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
Automatic checkpoints (configured in config.json under "checkpoints"):

1. BEFORE AUTOPILOT START (checkpoints.beforeAutopilot: true)
   git tag chorus-checkpoint-{timestamp}

2. BEFORE MAJOR MERGE (checkpoints.beforeMerge: true)
   git tag pre-merge-{task-id}

3. PERIODIC (checkpoints.periodic: N)
   Every N completed tasks (0 = disabled)

Default: all enabled, periodic every 5 tasks
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
[P0] - Blocker (magenta, flashing) - blocks other work
[P1] - Critical (red) - must fix immediately
[P2] - High (orange) - important
[P3] - Medium (yellow) - normal priority
[P4] - Low (blue) - nice to have
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
│  PLANNING & LEARNING            GENERAL                          │
│  P    Plan more tasks           ?      Toggle help               │
│  Shift+P Force plan             i      Intervention menu         │
│  Ctrl+L  Review learnings       q      Quit (confirm if agents)  │
│  Shift+L Force review           M      Merge queue view          │
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

- **v3.10 (2026-01-11):** Comprehensive Review Fixes
  - ADDED: `pattern_expired` event to Session Logger Event Reference
  - ADDED: Hook Timeout & Error Handling section (timeout, retry, continueOnFailure config)
  - ADDED: Learnings Format specification in Agent Prompt Template (LOCAL/CROSS-CUTTING/ARCHITECTURAL)
  - ADDED: Worktree Cleanup Commands (`chorus worktree clean <task-id>`, `--failed`, `--all`)
  - ADDED: Spec Validation Rules table with detailed validation criteria
  - ADDED: Cross-references between Directory Structure sections (reduced redundancy)
  - ADDED: `.agent/` dual-location clarification table (Project root vs Worktree)
  - ADDED: Loading Mechanism rationale table (why different methods for different files)
  - ADDED: AGENTS.md vs PATTERNS.md loading explanation (symlink vs F07 injection rationale)
  - PURPOSE: Addresses all gaps, inconsistencies, and missing documentation identified in review

- **v3.9 (2026-01-11):** Structural Clarity & Missing References
  - ADDED: `.chorus/pending-patterns.json` to directory structure (was referenced but not listed)
  - ADDED: `.chorus/templates/`, `.chorus/specs/`, `.chorus/hooks/` to directory structure
  - ADDED: `.agent/learnings-meta.json` to memory architecture (was referenced but not in structure)
  - ADDED: Directory structure clarification - `.agent/` exists in TWO locations:
    - Project root `.agent/` (shared learnings, git-tracked)
    - Worktree `.agent/` (per-agent scratchpad, gitignored)
  - ADDED: Mode State Hierarchy table (CLI → planning-state → state.json → config.json precedence)
  - ADDED: TUI 'm' toggle behavior clarification (updates state.json, not config.json)
  - ADDED: Task Priority Levels table with `-p` flag syntax for all priorities (P0-P4)
  - ADDED: P0 Blocker task creation example (`bd create -p 0`)
  - PURPOSE: Resolves structural ambiguities and missing file references identified in review

- **v3.8 (2026-01-11):** Documentation Completeness Review
  - FIXED: Scratchpad path format consistency (`.worktrees/{agent}-{task-id}/...`)
  - FIXED: Post-MVP labels updated to M8 Feature for F93-F101 (they have Beads tasks)
  - ADDED: AGENTS.md loading mechanism clarification (symlink + table)
  - ADDED: Plan Review error handling section (timeouts, retries, concurrency model)
  - ADDED: Learning de-duplication algorithm spec (similarity matching, thresholds)
  - ADDED: Pattern rejection flow (what happens after Reject/Later actions)
  - ADDED: Pending patterns queue behavior with auto-expire
  - PURPOSE: Addresses all gaps identified in comprehensive review

- **v3.7 (2026-01-11):** Comprehensive Consistency Review
  - FIXED: PATTERNS.md injection clarified (injected for ALL agents including Claude)
  - FIXED: Scope Guard exception for cross-cutting tasks from learnings
  - FIXED: Plan Review access to collapsed spec sections (via spec-progress.json)
  - FIXED: Execution ordering (Plan Review MUST complete before Task Creation)
  - ADDED: Spec Creation Flow (import, interactive, template methods)
  - ADDED: PATTERNS.md Update Flow with TUI review dialog
  - ADDED: Learning Pipeline diagram (F40 → F41 → learnings.md relationship)
  - ADDED: Hook Input fields table (which fields available per event)
  - ADDED: Session Logger events for learning, plan_review, incremental_planning modes
  - ADDED: Priority Boost values for P3 (+10) and P4 (+0)
  - ADDED: TIMEOUT/FAILED status mapping to Beads custom fields
  - ADDED: Scratchpad template location clarification (.chorus/templates/ → worktree)
  - ADDED: Archived spec learnings preservation (tied to task IDs, not specs)
  - UPDATED: Config version bumped to 3.1 with versioning note
  - PURPOSE: Resolves all identified contradictions, gaps, and inconsistencies

- **v3.6 (2026-01-11):** Incremental Planning & Manual Triggers
  - ADDED: Implementation-Triggered Task Creation (Incremental Planning) section
  - ADDED: Planning Horizon concept with stop conditions
  - ADDED: Spec Lifecycle (Consumed Backlog Pattern) with collapse and archive
  - ADDED: Spec section states (draft, planning, tasked, archived)
  - ADDED: Archive policy configuration (collapse_then_archive, immediate_archive, keep_visible)
  - ADDED: Full-Auto mode support for incremental planning
  - ADDED: Manual Review Triggers (TUI) section
  - ADDED: Learning review dialog (Ctrl+L, Shift+L)
  - ADDED: Planning dialog (P, Shift+P)
  - ADDED: Status indicators for learnings and spec progress
  - ADDED: Configuration for incrementalPlanning (mode, horizon, spec, fullAuto)
  - UPDATED: Keyboard shortcuts with PLANNING & LEARNING section
  - PURPOSE: Prevents over-planning by creating tasks just-in-time based on implementation progress
  - PURPOSE: Specs are consumed as backlog, tasked sections collapse, completed specs archive

- **v3.5 (2026-01-11):** Learning-Triggered Plan Review (Adaptive Task Refinement)
  - ADDED: Learning-Triggered Plan Review feature to Memory System section
  - ADDED: planReview config section (enabled, maxIterations, triggerOn, autoApply)
  - ADDED: Init Flow Step 5/5 for Plan Review settings
  - ADDED: Learning categories (LOCAL, CROSS-CUTTING, ARCHITECTURAL)
  - ADDED: Plan Agent Review prompt template
  - PURPOSE: Addresses waterfall problem by creating feedback loop from implementation to planning

- **v3.4 (2026-01-11):** Diagram & Config Completeness
  - ADDED: TIMEOUT state to Task States diagram (distinct from FAILED)
  - ADDED: Checkpoints section to config.json example
  - ADDED: taskIdPrefix clarification (display/filtering only, Beads generates IDs)
  - ADDED: Quality commands numbered list format in agent prompt template
  - ADDED: Hook Registration section (auto-discovery + explicit config)
  - ADDED: Scratchpad template content in Agent Spawn Sequence

- **v3.3 (2026-01-11):** Comprehensive Audit & Gap Fixes
  - FIXED: Worktree path format consistency (`{agent}` not `{agent-type}`)
  - FIXED: Max iteration/timeout → task state now TIMEOUT (distinct from FAILED)
  - FIXED: Merge queue dependency wait behavior documented
  - FIXED: Decision #1 vs #10 clarified (config supports all, MVP implements Claude)
  - FIXED: Agent prompt template - quality commands explicit, NEEDS_HELP signal added
  - FIXED: NEEDS_HELP signal description clarified
  - ADDED: F03c (CLI Detection) description in deferred features
  - ADDED: F91 Implementation Mode exit conditions table
  - ADDED: qualityCommands.order execution explanation
  - ADDED: Mode Selection UI screen
  - ADDED: Session Logger event reference table (all modes)
  - ADDED: P0 priority level (Blocker)
  - CONSOLIDATED: TUI Layout section (removed duplication)
  - CONSOLIDATED: Checkpointing config (reference to main config)

- **v3.2 (2026-01-11):** Consistency & Completeness Review
  - FIXED: Planning State JSON - added `chosenMode` field with status values
  - FIXED: FAILED state - added recovery path (retry, edit, rollback)
  - FIXED: Signal matrix - added BLOCKED and NEEDS_HELP behavior per mode
  - FIXED: F07b contradiction - clarified MVP vs post-MVP for cross-agent knowledge
  - FIXED: Agent-Agnostic → Agent-Ready Architecture (reflects MVP scope)
  - FIXED: Commit format standardized to `[ch-xxx]`
  - ADDED: Mode Routing section (F89/F90/F91 documentation)
  - ADDED: Decision #14 detailed explanation (Claude compact → custom ledger)
  - ADDED: AGENTS.md vs PATTERNS.md distinction table
  - ADDED: Semi-auto and Autopilot signal handling sections
  - CONSOLIDATED: Legacy Init Flow shortened to reference version
  - CONSOLIDATED: Directory Structure redundancy removed

- **v3.1 (2026-01-11):** Comprehensive Review & Fixes
  - FIXED: BeadsCLI service clarification (wrapper, not prohibition)
  - FIXED: `--depends` → `--deps` typo in createTask()
  - FIXED: MVP scope clarification (config supports all agents, MVP implements Claude)
  - FIXED: testCommand → qualityCommands throughout document
  - ADDED: Force-push recovery in merge ordering rules
  - ADDED: Edge cases table (TUI exit, pause duration, corrupted files)
  - CONSOLIDATED: Directory structure references
  - 127 tasks in Beads (48 ready, 4 deferred)

- **v3.0 (2026-01-11):** Planning-First Architecture (Ralph-inspired)
  - NEW: M0 Planning Phase - interactive task planning before implementation
  - NEW: Plan Agent - helps create/validate tasks via conversation
  - NEW: Task Review Loop - iterate until all tasks valid (Ralph pattern)
  - NEW: Auto-Decomposition - parse large specs into atomic tasks
  - NEW: Task Validation Rules - built-in + configurable rules
  - NEW: `.chorus/task-rules.md` - agent-readable validation rules
  - NEW: `.chorus/PATTERNS.md` - cross-agent learned patterns
  - NEW: `.chorus/session-log.jsonl` - append-only session logging
  - NEW: Flexible quality commands (not just test/lint/typecheck)
  - CHANGED: Interactive Init Mode with conversational setup
  - CHANGED: Config v3.0 with qualityCommands[], taskIdPrefix
  - CHANGED: TUI layout - 80% agent window + chat input
  - Key Decisions #11-14 added
  - 127 tasks in Beads (102 existing + 25 new M0 tasks)

- **v2.1 (2026-01-10):** Documentation cleanup
  - Task ID format: `bd-xxx` → `ch-xxx` (Chorus prefix)
  - Architecture: StatusBar → HeaderBar + FooterBar
  - TUI layout example updated with real task IDs
  - Status: DRAFT → APPROVED (implementation in progress)
  - 102 tasks in Beads (36 ready, 4 deferred)

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
