# Chorus Workflow: End-to-End Multi-Agent Orchestration

**Date:** 2026-01-09
**Updated:** 2026-01-11
**Status:** APPROVED - Implementation in Progress
**Version:** 3.2

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
| 1 | Multi-agent support? | YES - claude, codex, opencode (no aider) |
| 2 | Worktrees? | REQUIRED - with background merge service |
| 3 | Task management? | Beads only (no built-in) |
| 4 | Auto-mode control? | Max agents + priority queue |
| 5 | Review process? | Automated (tests + acceptance criteria) |
| 6 | Completion detection? | Signal + Tests (AND logic) |
| 7 | Prompt construction? | Inject task context + learnings |
| 8 | Conflict resolution? | Agent-first, human-fallback |
| 9 | Operating modes? | Semi-auto (default) + Autopilot |
| 10 | MVP Scope? | Claude-only (codex/opencode deferred) |
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
> Deferred features for codex/opencode: F07b (context injection), F03c (CLI detection), F42 (learning injector)
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

### TUI Layout (All Modes)

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS [MODE]                                    [Status] [Help]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│                    Agent Window (~80%)                           │
│                                                                  │
│     Agent conversation, output, forms, etc.                     │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ > ___________________________________________________________   │
│                                                                  │
│ [Tab: Focus] [Enter: Send] [Esc: Cancel] [?: Help]              │
└─────────────────────────────────────────────────────────────────┘
```

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

---

## Initialization Flow

### First-Time Setup: Interactive Init Mode

Init Mode is conversational - user can type freely at any step.

```
┌─────────────────────────────────────────────────────────────────┐
│ CHORUS INIT                                            Step 1/4 │
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
│ CHORUS INIT                                            Step 2/4 │
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
│ CHORUS INIT                                            Step 3/4 │
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
│ CHORUS INIT                                            Step 4/4 │
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

### Programmatic Init (Non-Interactive)

For CI/CD or scripted setup, use `chorus init --yes` which:

1. **Check Prerequisites** - git, Node.js >= 20, bd CLI, claude CLI
2. **Auto-detect Project** - Read package.json/pyproject.toml/go.mod
3. **Create Directories** - See [Directory Structure](#directory-structure-chorus) below
4. **Configure Defaults** - Claude as default agent, maxParallel=3
5. **Update .gitignore** - Add `.worktrees/`, `.chorus/state.json`, `.agent/scratchpad.md`

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
├── session-log.jsonl        # Session history (append-only, JSONL)
├── state.json               # Runtime state (gitignored)
└── prompts/
    ├── plan-agent.md        # Plan agent system prompt
    └── impl-agent.md        # Implementation agent prompt
```

**File Formats:**
- **JSON:** config.json, planning-state.json, state.json (structured data)
- **Markdown:** task-rules.md, PATTERNS.md, prompts/*.md (agent-readable)
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

### Config File: `.chorus/config.json`

```json
{
  "version": "3.0",

  "project": {
    "name": "my-awesome-app",
    "type": "node",
    "taskIdPrefix": "ch-"
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
  order: number;       // Execution order
}

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
        │
        │ Failure
        ▼
┌─────────────────────┐
│      FAILED         │
│  • Error occurred   │
│  • Needs attention  │
│  • Worktree kept    │
└─────────────────────┘
        │
        │ Recovery options:
        │ 1. Manual retry (r key)
        │ 2. Edit task & retry
        │ 3. Rollback & pending
        ▼
  [back to PENDING]
```

**FAILED Recovery:**
- Press `r` on failed task → Task returns to PENDING, worktree preserved
- Press `e` to edit task description → Then retry
- Press `R` to rollback → Reverts commits, task → PENDING
- Worktree kept for debugging until manually cleaned

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
1. Ensure all required quality commands pass (see config.qualityCommands)
2. Output exactly: <chorus>COMPLETE</chorus>

If blocked, output: <chorus>BLOCKED: reason</chorus>

## Context
- Read AGENTS.md for project conventions
- Read .agent/learnings.md for known patterns
- Current branch: agent/{agent}/{task_id}
- Commit format: "type(scope): description [ch-xxx]"

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

2. PRIORITY BOOST
   P1: +100 queue position
   P2: +50 queue position

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
// └──────────────────┴─────────────────┴─────────────────────────────────┘
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

**Loading priority:**
1. Claude loads AGENTS.md natively (via `.claude/rules` symlink or direct read)
2. F07 Prompt Builder injects PATTERNS.md for all agents
3. Non-Claude agents receive both via prompt prefix

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
