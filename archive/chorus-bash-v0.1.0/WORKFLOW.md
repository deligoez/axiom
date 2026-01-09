# Chorus - Multi-Agent Development Workflow

**Version:** 1.0
**Date:** January 2026
**Status:** Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Fleet](#agent-fleet)
3. [Core Components](#core-components)
4. [Task Management with Beads](#task-management-with-beads)
5. [Autonomous Execution Patterns](#autonomous-execution-patterns)
6. [Memory System](#memory-system)
7. [Parallel Agent Architecture](#parallel-agent-architecture)
8. [Workflows](#workflows)
9. [Bug Handling Strategy](#bug-handling-strategy)
10. [Best Practices](#best-practices)
11. [Usage Tracking](#usage-tracking)
12. [Security & Secrets](#security--secrets)
13. [Rollback & Recovery](#rollback--recovery)
14. [Human Intervention](#human-intervention)
15. [Troubleshooting](#troubleshooting)

---

## Overview

Chorus is a **multi-agent development workflow** designed for coordinating multiple AI coding agents on a single project.

### Design Principles

- **Agent-Agnostic**: Works with any CLI agent (Claude Code, Codex, OpenCode, Aider, Goose...)
- **Multi-Agent Ready**: Different agents can work in parallel
- **Cost-Optimized**: Route the right task to the right agent
- **Knowledge Preserved**: Learnings persist across sessions and agents

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                              │
│              (Claude Squad / Manual / Custom)                    │
├─────────────────────────────────────────────────────────────────┤
│  • Spawn/kill agent instances                                    │
│  • Create git worktrees per agent                                │
│  • Route tasks to optimal agent + model                          │
│  • Trigger merges when tasks complete                            │
└───────────┬─────────────────┬─────────────────┬─────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   CLAUDE CODE     │ │    CODEX CLI      │ │     GLM-4.7       │
│   Opus 4.5        │ │    GPT-5.2 / o3   │ │    (Worker)       │
├───────────────────┤ ├───────────────────┤ ├───────────────────┤
│ Architecture      │ │ **Debugging**     │ │ Tests, docs       │
│ System design     │ │ Feature impl      │ │ Simple fixes      │
│ Multi-component   │ │ Refactoring       │ │ Boilerplate       │
│ Trade-off analysis│ │ API integration   │ │ Config changes    │
└───────────────────┘ └───────────────────┘ └───────────────────┘
            │                 │                 │
            └────────────────┬┴─────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                         │
├─────────────────────────────────────────────────────────────────┤
│  .beads/issues.jsonl    ← Task queue (hash IDs, merge-safe)     │
│  .agent/learnings.md    ← Shared knowledge (append-only)        │
│  .git/                  ← Shared repository                     │
│  AGENTS.md              ← Project instructions (all agents)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Fleet

### Available Agents

| Agent | CLI | Model | Autonomous Mode | Monthly Cost |
|-------|-----|-------|-----------------|--------------|
| **Claude Code** | `claude` | Opus 4.5 / Sonnet 4 | `--dangerously-skip-permissions` | $60 (Max) |
| **Codex CLI** | `codex` | GPT-5.2 / o3 | `--full-auto` | $20 (Plus) |
| **GLM-4.7** | via OpenCode | GLM-4.7 | `-p "prompt"` | ~$3 (Z.ai) |

### Agent Capability Matrix (Jan 2026)

```
                    Architecture  Debugging  Features  Tests  Docs  Cost
                    ────────────  ─────────  ────────  ─────  ────  ────
Claude (Opus 4.5)   ██████████    ████████   ████████  ██████ █████ $$$$
Codex (GPT-5.2)     ████████      ██████████ █████████ ██████ █████ $$
GLM-4.7             ████          ████       ██████    ██████ █████ $
```

**Key Insight (Jan 2026):** Codex + GPT-5.2 is now Opus-tier for debugging. It can work for extended periods until the problem is solved.

### Installation

```bash
# Claude Code (if not installed)
npm install -g @anthropic-ai/claude-code

# Codex CLI
npm i -g @openai/codex
# or
brew install --cask codex

# OpenCode (for GLM-4.7)
curl -fsSL https://opencode.ai/install | bash
# or
npm i -g opencode-ai@latest

# Orchestrator
brew install claude-squad

# Task Management
npm install -g @beads/bd
```

### Bootstrap (First-Time Setup)

Step-by-step setup for new projects:

```bash
# 1. Go to project directory
cd /path/to/your-project

# 2. Create AGENTS.md (all agents will read this)
# See AGENTS.md.template for a starting point

# 3. Initialize Beads
bd init

# 4. Create .agent/ directory
mkdir -p .agent
echo "# Project Learnings" > .agent/learnings.md

# 5. Update .gitignore
echo ".worktrees/" >> .gitignore
echo ".beads/beads.db" >> .gitignore

# 6. Create first task
bd create "Setup: Verify all tools work" -p 1 -l setup

# 7. Test
bd ready  # Task should appear
```

**First Agent Run:**

```bash
# Simple test - with Claude
claude --model sonnet -p "Read AGENTS.md and bd ready, then summarize what you see"

# Simple test - with Codex
codex --full-auto -m o4-mini "Read AGENTS.md and list available tasks"
```

**For VPS setup:** See [vps-setup/README.md](./vps-setup/README.md)

### Agent Configuration

#### Claude Code

**Available Models (Jan 2026):**
| Model | SWE-bench | Token Efficiency | Price (in/out) | Best For |
|-------|-----------|------------------|----------------|----------|
| `claude-opus-4-5-20251101` | 80.9% | 76% less tokens | $5/$25 per 1M | Architecture, hard problems |
| `claude-sonnet-4-5-20250929` | 77.2% | Baseline | $3/$15 per 1M | Daily work, fast iteration |

```bash
# Alias (short)
claude --model opus
claude --model sonnet

# Full model name
claude --model claude-opus-4-5-20251101
claude --model claude-sonnet-4-5-20250929

# With fallback (for overload situations)
claude --model opus --fallback-model sonnet

# Non-interactive + model
claude --model opus -p "Design the caching architecture"
```

**Default settings:** `~/.claude/settings.json`

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "permissions": {
    "allow_read": true,
    "allow_write": true,
    "allow_execute": true
  }
}
```

#### Codex CLI

**Available Models (Jan 2026):**
| Model | Best For | Notes |
|-------|----------|-------|
| `gpt-5.2-codex` | Agentic coding, debugging | Latest (Dec 2025), long-running tasks |
| `gpt-5.1-codex-max` | Project-scale work | Enhanced reasoning, token efficient |
| `gpt-5.1-codex` | Standard coding | Balanced performance |
| `o4-mini` | Quick reasoning tasks | Faster, cheaper, good for simple bugs |

```bash
# Flag
codex -m gpt-5.2-codex
codex --model o4-mini

# Full auto + model (most common usage)
codex --full-auto -m gpt-5.2-codex "Debug why tests fail"

# Quick/cheap task with o4-mini
codex --full-auto -m o4-mini "Add docstring to generate() method"
```

**Default settings:** `~/.codex/config.toml`

```toml
model = "gpt-5.2-codex"
approval_mode = "full-auto"

[project]
agents_file = "AGENTS.md"
```

#### OpenCode + GLM-4.7

**Available Models (via Z.ai):**
| Model | Best For |
|-------|----------|
| `glm-4.7` | Default, good balance |
| `glm-4.7-thinking` | More reasoning steps |

```yaml
# ~/.config/opencode/config.yaml
provider: zai
model: glm-4.7
auto_approve: true
```

### Task Routing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TASK ROUTING DECISION TREE                    │
└─────────────────────────────────────────────────────────────────┘

                              NEW TASK
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Architecture/design       │
                    │ decision? (pattern        │
                    │ selection, multi-         │
                    │ component design)         │
                    └───────────────────────────┘
                         │ YES          │ NO
                         ▼               ▼
                 ┌─────────────┐  ┌───────────────────────────┐
                 │ CLAUDE      │  │ Debugging/bug fix?        │
                 │ (Opus 4.5)  │  │ (especially complex,      │
                 └─────────────┘  │  long-running)            │
                                  └───────────────────────────┘
                                       │ YES          │ NO
                                       ▼               ▼
                               ┌─────────────┐  ┌───────────────────────────┐
                               │ CODEX       │  │ Multi-file feature/       │
                               │ (GPT-5.2)   │  │ refactoring?              │
                               └─────────────┘  └───────────────────────────┘
                                                     │ YES          │ NO
                                                     ▼               ▼
                                             ┌─────────────┐  ┌───────────────────────────┐
                                             │ CODEX       │  │ Test, doc, or simple      │
                                             │ (GPT-5.2)   │  │ boilerplate?              │
                                             └─────────────┘  └───────────────────────────┘
                                                                   │ YES          │ NO
                                                                   ▼               ▼
                                                           ┌─────────────┐  ┌─────────────┐
                                                           │ GLM-4.7     │  │ CODEX       │
                                                           └─────────────┘  │ (default)   │
                                                                            └─────────────┘
```

**Agent Strengths (Jan 2026):**

| Task Type | Primary | Why |
|-----------|---------|-----|
| Architecture/Design | Claude (Opus) | Best high-level reasoning |
| Complex Debugging | **Codex (GPT-5.2)** | Works until solved |
| Feature Implementation | Codex (GPT-5.2) | Fast, quality code |
| Refactoring | Codex (GPT-5.2) | Pattern recognition |
| Unit Tests | GLM-4.7 | Cheap, pattern-based |
| Documentation | GLM-4.7 | Cheap, repetitive task |
| Simple Bug Fixes | GLM-4.7 | Cost-effective |
| API Integration | Codex (GPT-5.2) | Can do web research |

---

## Core Components

### Component Matrix

| Component | Tool | Purpose | Agent-Agnostic? |
|-----------|------|---------|-----------------|
| Task Management | Beads | Issue tracking, dependencies | Yes |
| Execution Loop | Agent-specific | Autonomous completion | Varies |
| Memory | scratchpad + learnings | Context preservation | Yes |
| Parallel Work | Git Worktrees | Isolated workspaces | Yes |
| Orchestration | Claude Squad | Multi-agent coordination | Yes |
| Project Instructions | AGENTS.md | Shared conventions | Yes |

### AGENTS.md (Universal Project Instructions)

All agents read this file (Claude Code, Codex, OpenCode, Aider, Goose...).

See `AGENTS.md.template` for a starting point.

---

## Task Management with Beads

### Why Beads?

Beads is an **agent-native** task management system by Steve Yegge.

**Advantages:**
- **Hash-based IDs** (bd-a1b2): Prevents merge conflicts
- **JSONL storage**: Git-friendly, all agents can read
- **Dependency DAG**: `bd ready` shows only unblocked tasks
- **Zero coordinator**: Agents can self-organize

### Setup

```bash
# Initialize Beads
cd /path/to/your-project
bd init

# Configure git merge driver (optional, for parallel agents)
git config merge.beads.driver "bd merge-driver %O %A %B %P"
echo ".beads/** merge=beads" >> .gitattributes
```

### Directory Structure

```
your-project/
├── .beads/
│   ├── issues.jsonl      # Task database (git-tracked)
│   └── beads.db          # SQLite cache (gitignored)
├── .agent/
│   ├── scratchpad.md     # Current session (per-agent in worktrees)
│   └── learnings.md      # Shared knowledge (append-only)
├── AGENTS.md             # Universal project instructions
└── ...
```

### Core Commands

```bash
# List ready tasks (unblocked, available)
bd ready

# Create task with priority and labels
bd create "Implement feature X" -p 1 -l feature -l phase-1

# Claim task (before starting work)
bd update bd-a1b2 --status=in-progress --assignee=claude

# Add dependency
bd dep add bd-a1b2 bd-c3d4  # a1b2 depends on c3d4

# Close completed task
bd close bd-a1b2 -m "Implemented and tested"

# View task details
bd show bd-a1b2
```

### Two-Layer Task System

```
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 1: ACTIVE TASKS (Beads)                      │
├─────────────────────────────────────────────────────────────────┤
│  • 10-15 immediate tasks                                         │
│  • Detailed acceptance criteria                                  │
│  • Dependencies defined                                          │
│  • Agent assignment possible                                     │
│  • `bd ready` filters to actionable items                        │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Refill when < 5 active
                              │
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 2: ROADMAP (Your project spec)               │
├─────────────────────────────────────────────────────────────────┤
│  • High-level phases                                             │
│  • Future work (not yet in Beads)                                │
│  • Strategic direction                                           │
│  • Read-only reference for agents                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Autonomous Execution Patterns

Each agent has different autonomous modes, but the concept is the same: **work until completion criteria is met**.

### Claude Code

```bash
# Interactive with auto-approve (default model)
claude --dangerously-skip-permissions

# Interactive with specific model
claude --model opus --dangerously-skip-permissions

# Non-interactive + model (scriptable)
claude --model opus -p "Design caching architecture for bd-a1b2"
claude --model sonnet -p "Implement bd-a1b2: Feature X"

# With fallback (for overload situations)
claude --model opus --fallback-model sonnet -p "Complex task"
```

### Codex CLI

```bash
# Full autonomous mode (default model)
codex --full-auto "Implement bd-a1b2 per AGENTS.md instructions"

# Full auto + specific model (GPT-5.2 for debugging)
codex --full-auto -m gpt-5.2-codex "Debug failing tests"

# Quick task with o4-mini
codex --full-auto -m o4-mini "Add docstring to generate()"

# With web search enabled
codex --full-auto --search -m gpt-5.2-codex "Research and implement bd-a1b2"
```

### GLM-4.7 via OpenCode

```bash
# Non-interactive mode (auto-approves everything)
opencode -p "Write unit tests for TokenizerClass [bd-e5f6]"

# Quiet mode for scripts
opencode -q -p "Add docs to Generator class [bd-g7h8]"
```

### Universal Loop Pattern (Agent-Agnostic)

The "Ralph Wiggum" pattern applicable to any agent:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS LOOP PATTERN                       │
└─────────────────────────────────────────────────────────────────┘

LOOP START:
    │
    ├── 1. Read context
    │       • .agent/scratchpad.md (last session)
    │       • .agent/learnings.md (permanent knowledge)
    │       • AGENTS.md (project conventions)
    │
    ├── 2. Get task
    │       • bd ready → pick highest priority
    │       • bd update <id> --status=in-progress
    │
    ├── 3. Work iteration
    │       • Implement / test / debug
    │       • Commit frequently with [bd-xxxx] in message
    │       • Log discoveries to scratchpad
    │
    ├── 4. Check completion
    │       • Acceptance criteria met? → Continue to 5
    │       • Blocked? → Log blocker, pick different task
    │       • Not done? → Back to 3
    │
    ├── 5. Complete task
    │       • bd close <id>
    │       • Extract learnings → learnings.md
    │       • Clear scratchpad
    │
    └── 6. Next task or EXIT
            • bd ready → more tasks? → Back to 2
            • No tasks? → EXIT with "DONE"
```

### Completion Criteria Examples

**Good (specific, verifiable):**
- "All tests pass (`npm test` exits 0)"
- "Function returns correct output for edge cases X, Y, Z"
- "Performance: >1M operations/sec in benchmark"

**Bad (vague):**
- "Make it work"
- "Improve performance"
- "Fix the bug"

---

## Memory System

### Architecture

```
.agent/
├── scratchpad.md     # Per-session, volatile (per-agent in worktrees)
└── learnings.md      # Permanent, append-only (shared)
```

### Scratchpad (Session Memory)

Each agent uses its own scratchpad. Progress and discoveries are logged during the session.

**Location:**
- Single agent: `.agent/scratchpad.md`
- Parallel agents: `.worktrees/agent-{name}/.agent/scratchpad.md`

**Format:**

```markdown
# Agent Scratchpad

## Session Info
- Agent: claude-code
- Task: bd-a1b2
- Started: 2026-01-09 10:30

## Current Task
bd-a1b2: Feature implementation

## Progress
- [x] Profiled current implementation
- [x] Identified bottleneck
- [ ] Implement optimization
- [ ] Benchmark

## Learnings (To Extract)
- **Pattern:** mb_str_split() 3x faster than preg_split for Unicode
- **Decision:** Character n-grams over word for short strings

## Blockers
- None

## Next Actions
1. Complete optimization
2. Run benchmarks
```

### Learnings (Permanent Knowledge)

Shared, append-only knowledge base used by all agents.

**Location:** `.agent/learnings.md` (main branch, shared)

**Format:**

```markdown
# Project Learnings

> Append-only. New entries at bottom of relevant section.

## Performance
- mb_str_split() > preg_split() for Unicode (3x faster)
  - Source: bd-a1b2 (2026-01-09, claude-code)

## Testing
- Use framework's dataset() for parameterized tests
  - Source: bd-e5f6 (2026-01-11, glm-4.7)
```

### Cross-Agent Knowledge Sharing

```
Agent A (Claude)                    Agent B (Codex)
     │                                    │
     ├── Discovers pattern               │
     ├── Logs to scratchpad              │
     ├── Extracts to learnings.md        │
     ├── Commits & pushes ────────────────┤
     │                                    ├── Pulls latest
     │                                    ├── Reads learnings.md
     │                                    └── Uses knowledge!
```

---

## Parallel Agent Architecture

### When to Use Parallel Agents

| Scenario | Parallel? | Reason |
|----------|-----------|--------|
| Independent features | Yes | No code overlap |
| Tests + implementation | Yes | Different files |
| Same module | No | Will conflict |
| Docs while coding | Yes | Different concerns |

### Git Worktrees

Git worktrees = isolated workspaces sharing same `.git`.

**Why not Docker?**
- Lightweight (no container overhead)
- Shared git history
- Native file system
- Faster branch switching

**Setup:**

```bash
# Create worktree root
mkdir .worktrees
echo ".worktrees/" >> .gitignore

# Create worktree for each agent
git worktree add .worktrees/claude -b agent/claude/bd-a1b2
git worktree add .worktrees/codex -b agent/codex/bd-c3d4
git worktree add .worktrees/glm -b agent/glm/bd-e5f6

# List worktrees
git worktree list

# Remove after merge
git worktree remove .worktrees/claude
```

### Directory Structure (Multi-Agent)

```
your-project/
├── .git/                     # Shared git database
├── .beads/                   # Shared task queue
│   └── issues.jsonl          # All agents read/write
├── .agent/
│   └── learnings.md          # Shared knowledge
├── .worktrees/               # Agent workspaces (gitignored)
│   ├── claude/               # Claude Code workspace
│   │   ├── ... (full repo)
│   │   └── .agent/
│   │       └── scratchpad.md # Claude's session
│   ├── codex/                # Codex workspace
│   │   └── .agent/
│   │       └── scratchpad.md # Codex's session
│   └── glm/                  # GLM-4.7 workspace
│       └── .agent/
│           └── scratchpad.md # GLM's session
├── AGENTS.md                 # All agents read this
└── source code...
```

### Claude Squad (Orchestrator)

Claude Squad manages multiple agents in tmux sessions with git worktrees.

```bash
# Install
brew install claude-squad

# Start with your agents
claude-squad start \
  --agent claude:.worktrees/claude \
  --agent codex:.worktrees/codex \
  --agent opencode:.worktrees/glm

# Monitor
claude-squad status

# View specific agent
claude-squad logs claude

# Stop all
claude-squad stop
```

**Configuration (.claude-squad.yml):**

```yaml
agents:
  claude:
    cli: claude
    args: ["--dangerously-skip-permissions"]
    worktree: .worktrees/claude

  codex:
    cli: codex
    args: ["--full-auto"]
    worktree: .worktrees/codex

  glm:
    cli: opencode
    args: ["-p"]
    worktree: .worktrees/glm
    env:
      OPENCODE_MODEL: glm-4.7

beads:
  enabled: true
  auto_claim: true

merge:
  strategy: auto  # auto | pr | manual
  auto_threshold: 5  # max files for auto-merge
```

### Manual Orchestration (Without Claude Squad)

```bash
# Terminal 1: Claude Code
cd .worktrees/claude
claude --dangerously-skip-permissions

# Terminal 2: Codex
cd .worktrees/codex
codex --full-auto

# Terminal 3: GLM-4.7
cd .worktrees/glm
opencode -p "Work on bd-e5f6"

# After completion, merge from main terminal:
cd /path/to/your-project
git merge agent/claude/bd-a1b2
git merge agent/codex/bd-c3d4
git merge agent/glm/bd-e5f6
```

### Atomic Task Claiming

Prevent multiple agents claiming same task:

```bash
#!/bin/bash
# claim-task.sh <agent-name> <task-id>

AGENT=$1
TASK=$2

bd update $TASK --status=in-progress --assignee=$AGENT
git add .beads/
git commit -m "claim: $TASK by $AGENT"

if git push; then
    echo "SUCCESS: $AGENT claimed $TASK"
else
    echo "CONFLICT: Task already claimed"
    git reset --hard HEAD~1
    exit 1
fi
```

---

## Workflows

### Single Agent Workflow

```
1. SESSION START
   ├── Read .agent/scratchpad.md
   ├── Read .agent/learnings.md
   ├── Read AGENTS.md
   └── Run: bd ready

2. TASK LOOP
   ├── Pick task, claim it
   ├── Work until done
   ├── Commit with [bd-xxxx]
   ├── bd close <id>
   ├── Extract learnings
   └── Next task or EXIT
```

### Multi-Agent Workflow

```
ORCHESTRATOR                 CLAUDE              CODEX               GLM
     │                          │                   │                  │
     ├── bd ready               │                   │                  │
     │   [a1b2(H), c3d4(M),     │                   │                  │
     │    e5f6(L), g7h8(L)]     │                   │                  │
     │                          │                   │                  │
     ├── Route a1b2 (HIGH) ────▶│                   │                  │
     ├── Route c3d4 (MED) ──────┼──────────────────▶│                  │
     ├── Route e5f6 (LOW) ──────┼───────────────────┼─────────────────▶│
     │                          │                   │                  │
     │                          ├── Claim a1b2      ├── Claim c3d4     ├── Claim e5f6
     │                          ├── Work...         ├── Work...        ├── Work...
     │                          │                   │                  │
     │                          │                   │                  ├── DONE
     │                          │                   │                  │
     ├── Merge glm branch ◀─────┼───────────────────┼──────────────────┤
     ├── Assign g7h8 to glm ────┼───────────────────┼─────────────────▶│
     │                          │                   │                  │
     │                          │                   ├── DONE           │
     │                          │                   │                  │
     ├── Merge codex branch ◀───┼───────────────────┤                  │
     │                          │                   │                  │
     │                          ├── DONE            │                  │
     │                          │                   │                  │
     ├── Merge claude branch ◀──┤                   │                  │
     │                          │                   │                  │
     └── All done!              │                   │                  │
```

### Merge Workflow

```
AGENT COMPLETES:
1. Final commit: "feat(scope): description [bd-a1b2]"
2. bd close bd-a1b2
3. git push origin agent/claude/bd-a1b2

MERGE (Auto for simple, PR for complex):

Simple (<5 files, no core changes):
├── git checkout main && git pull
├── git merge agent/claude/bd-a1b2 --no-edit
├── If conflict → flag for human
└── git worktree remove .worktrees/claude

Complex (>5 files or core changes):
├── gh pr create --base main --head agent/claude/bd-a1b2
├── Human reviews
└── Merge via GitHub
```

---

## Bug Handling Strategy

```
                    BUG DETECTED
                         │
                         ▼
              ┌─────────────────────┐
              │ Blocks current task?│
              └─────────────────────┘
                    │         │
                   YES        NO
                    │         │
                    ▼         ▼
         ┌─────────────────┐  │
         │ Fix < 30 mins & │  │
         │ scope is clear? │  │
         └─────────────────┘  │
              │         │     │
             YES        NO    │
              │         │     │
              ▼         ▼     ▼
        ┌─────────┐  ┌───────────────────┐
        │ FIX NOW │  │ CREATE BEADS TASK │
        └─────────┘  │ (defer to queue)  │
                     └───────────────────┘
```

---

## Best Practices

### Task Creation

```bash
# Good: Specific with acceptance criteria
bd create "Implement UTF-8 string extraction" \
  -d "Acceptance:
      - Handle any Unicode string
      - Support n=1 to n=5
      - >1M operations/sec
      - Tests for edge cases" \
  -l feature -l phase-1 -p 1

# Bad: Vague
bd create "Make it work"
```

### Commit Messages

```bash
# Format: <type>(<scope>): <description> [bd-xxxx]
git commit -m "feat(parser): implement UTF-8 extraction [bd-a1b2]"
git commit -m "test(parser): add CJK character tests [bd-a1b2]"
git commit -m "fix(parser): handle empty string edge case [bd-a1b2]"
```

### Agent Assignment Labels

```bash
# Tag tasks with preferred agent
bd create "Write docs for Generator" -l docs -l glm-preferred -p 3
bd create "Refactor TokenizerInterface" -l refactor -l codex-preferred -p 2
bd create "Design Plugin Architecture" -l architecture -l claude-preferred -p 1
```

### Cost Optimization

| Task Type | Preferred Agent | Reason |
|-----------|-----------------|--------|
| Architecture | Claude | Best reasoning |
| New features | Codex | Good balance |
| Tests | GLM-4.7 | Cheapest |
| Documentation | GLM-4.7 | Cheapest |
| Bug fixes (hard) | Claude | Deep analysis |
| Bug fixes (easy) | Codex or GLM | Cost effective |
| Boilerplate | GLM-4.7 | Cheapest |

### Estimated Daily Cost

| Agent | Tasks/Day | Est. Cost |
|-------|-----------|-----------|
| Claude (Max) | 5-10 complex | ~$5-10 |
| Codex (Plus) | 10-15 medium | ~$2-5 |
| GLM-4.7 (Z.ai) | 20+ simple | ~$1-2 |
| **Total** | 35-45 tasks | **~$8-17/day** |

---

## Usage Tracking

Tracking all model and service usage is critical for cost control and quota management.

### Why Track?

1. **Cost control**: Which agent/model is spending how much?
2. **Quota management**: Are we approaching subscription limits?
3. **Efficiency analysis**: Which model is efficient for which task type?
4. **Budget planning**: Monthly/daily budget tracking

### Tracking Methods

#### 1. Claude Code - Built-in Stats

```bash
# Session usage
claude usage

# This month total
claude usage --month

# Detailed breakdown
claude usage --detailed
```

#### 2. Codex CLI - OpenAI Dashboard

```bash
# CLI doesn't have built-in tracking
# Check: https://platform.openai.com/usage
```

#### 3. Z.ai (GLM-4.7) - Dashboard

```
https://z.ai/dashboard/usage
```

### Usage Log Format (.agent/usage.log)

```
# Append after each task completion
# Format: timestamp|agent|model|task_id|tokens_in|tokens_out|duration_sec

2026-01-09T10:30:00|claude|opus-4.5|bd-a1b2|15000|8000|1800
2026-01-09T11:00:00|codex|gpt-5.2-codex|bd-c3d4|12000|15000|2400
2026-01-09T11:30:00|glm|glm-4.7|bd-e5f6|3000|2000|300
```

### Quota Limits Reference

| Service | Plan | Monthly Limit | Daily Safe Target |
|---------|------|---------------|-------------------|
| Claude Max | $60/mo | ~$60 API value | ~$2/day |
| ChatGPT Plus | $20/mo | Unlimited* | N/A |
| Z.ai | ~$3/mo | Varies | Check dashboard |

*ChatGPT Plus includes Codex CLI access but heavy usage may have soft limits.

---

## Security & Secrets

### API Key Management

```bash
# NEVER commit to repo!
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

**Local Development (.env):**
```bash
# ~/.env or project/.env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

**On VPS:**
```bash
# Add to system environment (persistent across sessions)
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
source ~/.bashrc
```

### Worktree Secrets

Worktrees share the main repo's `.git/` directory, so `.gitignore` works automatically.

```bash
# .env in main directory
project/.env                    # ✓ Gitignored
project/.worktrees/claude/.env  # ✓ Same .gitignore applies
```

### Security Rules for Agents

Add to AGENTS.md:

```markdown
## Security Rules
- NEVER commit files: .env, *.key, credentials.*, secrets.*
- NEVER log API keys or tokens
- NEVER hardcode secrets in code
- Use environment variables for all credentials
```

### Secrets Rotation

```bash
# Stop all agents when API key changes
claude-squad stop

# Update new keys
export ANTHROPIC_API_KEY="new-key"

# Restart agents
claude-squad start
```

---

## Rollback & Recovery

### Agent Made Bad Commit

```bash
# 1. Find last good commit
git log --oneline -10

# 2. Revert bad commit (preserving history)
git revert <bad-commit-hash>

# 3. Or fully reset worktree
cd .worktrees/claude
git reset --hard origin/main
```

### Task Left Incomplete

```bash
# 1. Return task to pending
bd update bd-xxxx --status=pending --assignee=

# 2. Stash changes in worktree
cd .worktrees/claude
git stash

# 3. Different agent continues or same agent restarts
```

### Worktree Corrupted

```bash
# 1. Force remove worktree
git worktree remove .worktrees/claude --force

# 2. Clean up branch (if needed)
git branch -D agent/claude/bd-xxxx

# 3. Recreate
git worktree add .worktrees/claude -b agent/claude/bd-xxxx
```

### Beads Database Corrupted

```bash
# Delete SQLite cache, rebuild from JSONL
rm .beads/beads.db
bd rebuild

# Integrity check
bd validate
```

### Agent Crashed / Stuck

```bash
# 1. Find and kill process
ps aux | grep -E 'claude|codex|opencode'
kill <pid>

# 2. Check incomplete work
cd .worktrees/agent-name
git status
git diff

# 3. If changes are valuable, commit
git add . && git commit -m "WIP: partial progress on bd-xxxx"

# 4. Return task to pending
bd update bd-xxxx --status=pending
```

### Emergency Stop All Agents

```bash
# If using Claude Squad
claude-squad stop --force

# Manual
pkill -f "claude"
pkill -f "codex"
pkill -f "opencode"

# Clean all worktrees
git worktree list | grep worktrees | awk '{print $1}' | xargs -I {} git worktree remove {} --force
```

---

## Human Intervention

Intervention strategies when errors are detected while agents are working.

### Cascade Problem

```
Task X (buggy) → Task Y (depends on X) → Task Z (depends on Y)
     DONE ✓          DONE ✓              IN PROGRESS
                          │
                    Human noticed but Y is already done!
```

### Intervention Decision Tree

```
                    ERROR DETECTED
                           │
                           ▼
              ┌─────────────────────────┐
              │ 1. STOP ALL AGENTS      │
              │ pkill -f "claude|codex" │
              └─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ How many tasks affected?│
              └─────────────────────────┘
                    │           │
                   1-2         3+
                    │           │
                    ▼           ▼
              FIX-FORWARD    ROLLBACK
```

### Strategy A: Fix-Forward (1-2 tasks affected)

```bash
# 1. Create critical fix task (priority 0)
bd create "HOTFIX: [error description]" -p 0 -l critical

# 2. Block dependent tasks
bd update bd-Y --status=blocked --blocked-by=bd-HOTFIX

# 3. Start agent with fix first
claude --model opus -p "CRITICAL: Fix bd-HOTFIX first"
```

### Strategy B: Full Rollback (3+ tasks affected)

```bash
# 1. Find last good commit
git log --oneline -20

# 2. Rollback main
git checkout main
git reset --hard <last-good-commit>

# 3. Clean agent branches
git branch | grep agent/ | xargs git branch -D

# 4. Clean worktrees
git worktree list | grep worktrees | awk '{print $1}' | xargs -I {} git worktree remove {} --force

# 5. Reset tasks
bd update bd-X --status=pending --assignee=
bd update bd-Y --status=pending --assignee=
bd update bd-Z --status=pending --assignee=
```

### Prevention: Human Checkpoint

```bash
# Critical tasks go to "in-review" instead of "done"
bd create "Core auth system" -p 1 -l architecture -l needs-review

# When agent finishes:
bd update bd-xxx --status=in-review  # Waits for human approval

# Human approves:
bd update bd-xxx --status=done  # Now dependents can start
```

### Monitoring Script

```bash
# watch-agents.sh
watch -n 5 '
echo "=== ACTIVE ===" && ps aux | grep -E "claude|codex" | grep -v grep
echo "=== RECENT COMMITS ===" && git log --oneline -5 --all
echo "=== IN PROGRESS ===" && bd list --status=in-progress
'
```

---

## Troubleshooting

### Common Issues

**"No ready tasks" but tasks exist:**
```bash
bd list --status=pending
bd show bd-xxxx  # Check blocked_by
```

**Git worktree already checked out:**
```bash
git worktree list
git worktree remove --force .worktrees/agent-name
```

**Agent not reading AGENTS.md:**
- Claude Code: Check file exists at project root
- Codex: Check `~/.codex/config.toml` has `agents_file = "AGENTS.md"`
- OpenCode: Reads `.opencode.md`, `CLAUDE.md`, or `opencode.md`

**Merge conflicts:**
```bash
# Beads conflicts (usually auto-resolved)
bd merge-driver .git/MERGE_BASE .beads/issues.jsonl .beads/issues.jsonl.REMOTE

# Code conflicts
git mergetool  # or resolve manually
```

### Health Checks

```bash
# Beads integrity
bd validate

# Worktree status
git worktree list

# Orphan agent branches
git branch -a | grep agent/

# Learnings file size (should grow over time)
wc -l .agent/learnings.md
```

---

## Quick Reference

### Daily Commands

```bash
# Start day
bd ready                              # See available tasks
bd update bd-xxx --status=in-progress # Claim task

# During work
git commit -m "feat(x): progress [bd-xxx]"
bd comment bd-xxx "Status update"

# End task
bd close bd-xxx -m "Completed"
```

### Start Parallel Agents

```bash
# Create worktrees
git worktree add .worktrees/claude -b agent/claude/bd-a1b2
git worktree add .worktrees/codex -b agent/codex/bd-c3d4

# Start agents with appropriate models (separate terminals)

# Architecture task → Claude Opus
(cd .worktrees/claude && claude --model opus --dangerously-skip-permissions)

# Debugging/Feature task → Codex GPT-5.2
(cd .worktrees/codex && codex --full-auto -m gpt-5.2-codex)

# Simple task → Codex o4-mini (cheaper)
(cd .worktrees/codex && codex --full-auto -m o4-mini)

# Or use Claude Squad
claude-squad start
```

### Emergency

```bash
# Abort agent work
bd update bd-xxx --status=pending --assignee=
git checkout main
git worktree remove .worktrees/agent-name --force

# Reset beads cache
rm .beads/beads.db
bd rebuild
```

---

## References

- [Beads](https://github.com/steveyegge/beads) - Task management
- [Claude Squad](https://github.com/smtg-ai/claude-squad) - Multi-agent orchestration
- [Codex CLI](https://github.com/openai/codex) - OpenAI coding agent
- [OpenCode](https://github.com/opencode-ai/opencode) - Open-source coding CLI
- [GLM-4.7](https://z.ai/blog/glm-4.7) - Open-source coding model
- [Git Worktrees](https://git-scm.com/docs/git-worktree) - Parallel workspaces
