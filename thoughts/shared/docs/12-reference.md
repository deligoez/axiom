# Quick Reference

Summary of key concepts and configurations.

---

## Color System

### Discovery Ideas (produce more ideas)

| Color | Symbol | Name | Description |
|-------|--------|------|-------------|
| ⬛ | `■` | Black | Raw need (JTBD/PRD) |
| ⬜ | `□` | Gray | Plan draft |
| 🟧 | `◆` | Orange | Research needed |
| 🟪 | `◇` | Purple | Decision pending |
| 🟥 | `▣` | Red | Deferred |

### Implementation Ideas (produce code)

| Color | Symbol | Name | Description |
|-------|--------|------|-------------|
| 🟦 | `▢` | Blue | Feature (vertical slice) |
| 🟩 | `▤` | Green | Atomic idea |

**White** = Green with `status: done` (completed). White is a status, not a color.

### Knowledge Ideas (capture learnings)

| Color | Symbol | Name | Description |
|-------|--------|------|-------------|
| 🟡 | `●` | Yellow | Learning/Discovery |

---

## Idea Statuses

### Universal Statuses

| Status | Symbol | Description |
|--------|--------|-------------|
| `pending` | `→` | Ready |
| `active` | `●` | Running |
| `done` | `✓` | Completed |
| `blocked` | `⊗` | Blocked |

### Green-Specific

| Status | Symbol | Description |
|--------|--------|-------------|
| `failed` | `✗` | Agent error |
| `timeout` | `⏱` | Timed out |
| `review` | `◐` | Awaiting review |

### Yellow-Specific

| Status | Symbol | Description |
|--------|--------|-------------|
| `active` | `●` | Valid, injected into prompts |
| `outdated` | `⚠` | Needs verification |
| `archived` | `◌` | Parent Green done |

---

## Agent Personas

| Persona | Emoji | Role |
|---------|-------|------|
| Analyzer Ace | 🔍 | Project analysis |
| Planner Pat | 📊 | Swarm spiral + Retrospective |
| Engineer Ed | ⚙️ | Implementation |
| Fixer Finn | 🔧 | Conflict resolution |
| Logger Lou | 💡 | Learning extraction |
| Director Dan | 😎 | Orchestration |
| Watcher Will | 👁️ | Health monitoring |
| Counter Carl | 📈 | Metrics |

---

## Signal Protocol

```
<swarm>SIGNAL</swarm>
<swarm>SIGNAL:payload</swarm>
```

| Signal | Payload | Purpose |
|--------|---------|---------|
| `COMPLETE` | none | Idea done |
| `BLOCKED` | reason | Cannot proceed |
| `NEEDS_HUMAN` | reason | Human intervention required |
| `PROGRESS` | 0-100 | Progress update |
| `RESOLVED` | none | Merge conflict resolved (Finn) |
| `LEARNING_LOCAL` | content | Creates Yellow idea (scope: local) |
| `LEARNING_GLOBAL` | content | Creates Yellow idea (scope: global) |

---

## Configuration Quick Reference

```json
{
  "mode": "semi-auto",
  "agents": { "maxParallel": 3, "timeoutMinutes": 30 },
  "completion": { "maxIterations": 50, "stuckThreshold": 5 },
  "qualityCommands": ["npm test", "npm run typecheck"],
  "review": { "defaultMode": "batch" },
  "merge": { "autoMerge": true, "conflictRetries": 3 }
}
```

---

## Directory Structure

```
.swarm/
├── config.json              # Configuration
├── ideas.jsonl              # Ideas (all colors incl. Yellow)
├── planning-state.json      # State
├── learnings.md             # View: global Yellow ideas
├── state/
│   ├── snapshot.json        # State machine snapshot
│   └── events.jsonl         # Event log
├── agents/{persona}/
│   ├── prompt.md
│   ├── rules.md
│   ├── learnings.md         # View: local Yellow ideas
│   └── logs/
├── checkpoints/             # Saved states
├── feedback/                # Review feedback
├── sprints.jsonl            # Sprint statistics
├── hooks/                   # Lifecycle hooks
├── reviews/                 # Review history
└── metrics/                 # Statistics
```

Note: `learnings.md` files are **views** generated from Yellow ideas in `ideas.jsonl`, not primary storage.

---

## Conflict Classification

| Level | Resolution |
|-------|------------|
| SIMPLE | Auto-resolve |
| MEDIUM | Fixer Finn |
| COMPLEX | Human escalation |

---

## Operating Modes

| Mode | Idea Selection | After Complete |
|------|----------------|----------------|
| Semi-Auto | User picks | Agent stops |
| Autopilot | Automatic | Pick next |

---

## Review vs Retrospective

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| Review | Green done | Human | Approve/reject |
| Retrospective | Blue done | Pat | Learn, update plan |

---

## Review Modes

| Mode | When |
|------|------|
| `per-task` | Review each immediately |
| `batch` | Collect and review later |
| `auto-approve` | Auto-approve if criteria met |
| `skip` | No review |

---

## Environment Variables

| Variable | Override |
|----------|----------|
| `SWARM_MODE` | mode |
| `SWARM_MAX_AGENTS` | agents.maxParallel |
| `SWARM_MODEL` | agents.defaultModel |

---

## Workflow Phases

```
Init → Planning → Implementation
  │        │            │
  ▼        ▼            ▼
 Ace      Pat          Ed
         (spiral)    (Green ideas)
            │
            ▼
      Retrospective
      (after Blue)
```

---

## Server Architecture

```
Swarm Server
├── Orchestrator Service
├── MergeQueue Service
├── Monitor Service
├── Web UI (htmx + SSE)
└── Agent Manager
    └── Agent Goroutines × N
```

---

## Event Types

### Orchestrator Events

| Event | Payload | Description |
|-------|---------|-------------|
| `CONFIG_COMPLETE` | config | Configuration loaded |
| `PLAN_APPROVED` | ideas | Plan approved, ideas created |
| `TRIGGER_PLANNING` | - | Start incremental planning |
| `SPAWN_AGENT` | ideaId | Request agent spawn |
| `STOP_AGENT` | agentId | Stop running agent |
| `AGENT_COMPLETED` | agentId, result | Agent finished idea |
| `AGENT_FAILED` | agentId, error | Agent error |
| `AGENT_BLOCKED` | agentId, reason | Agent blocked |
| `PAUSE` | - | Pause orchestration |
| `RESUME` | - | Resume orchestration |
| `SET_MODE` | mode | Switch semi-auto/autopilot |

### Merge Queue Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ENQUEUE_MERGE` | ideaId, branch | Queue for merge |
| `MERGE_COMPLETED` | ideaId | Successfully merged |
| `MERGE_CONFLICT` | ideaId, level | Conflict detected |

### Agent Lifecycle Events

| Event | Payload | Description |
|-------|---------|-------------|
| `START` | - | Begin execution |
| `READY` | - | Worktree prepared |
| `ITERATION_DONE` | signal? | Iteration complete |
| `ALL_PASS` | - | Quality checks passed |
| `RETRY` | - | Retry iteration |
| `BLOCKED` | reason | Cannot proceed |
| `COMPLETE` | - | Idea done |
| `FAIL` | error | Error occurred |
| `TIMEOUT` | - | Timed out |
| `STOP` | - | Force stop |

---

## CLI Usage

```bash
# Start Swarm server (opens browser automatically)
swarm

# Options
swarm --port 8080      # Custom port
swarm --no-open        # Don't open browser
swarm --version        # Show version
swarm --help           # Show help
```

The CLI is minimal - just start the server. All interaction happens via Web UI.

---

## Quality Commands

| Project | Commands |
|---------|----------|
| Node.js | `npm test`, `npm run typecheck`, `npm run lint` |
| Python | `pytest`, `mypy .`, `ruff check .` |
| Go | `go test ./...`, `go vet ./...` |

---

## Sprint Targets

| Target | Description |
|--------|-------------|
| `count` | Run N Greens |
| `duration` | Run for N hours |
| `until_time` | Run until time |
| `no_ready` | Run until no ready Greens |

---

## Crash Recovery

1. Load State machine snapshot
2. If invalid, replay events
3. Reset orphaned Greens to pending
4. Resume operation

---

## Refinement Chain

```
⬛ Black (Raw Need/PRD)
     │
     └── SPLIT → ⬜ Gray (Plan Drafts)
                      │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    🟧 Orange   🟪 Purple    🟦 Blue
    (Research)  (Decision)  (Feature)
         │           │           │
         └─────┬─────┘           │
               │                 │
               └────► ⬜ Gray ───┘
                         │
                         └── SPLIT → 🟦 Blue (Features)
                                          │
                                          └── SPLIT → 🟩 Green (Ideas)
                                                           │
                                                    ┌──────┴──────┐
                                                    │             │
                                                    ▼             ▼
                                            status: done    🟡 Yellow
                                            (White)        (Learning)
```

Yellow ideas are **byproducts** of Green execution, not refinement steps.

---

## Two Types of State Changes

| Change Type | When | Example |
|-------------|------|---------|
| Transition | Idea refines but stays one thing | Gray → Orange → Blue |
| Split | Idea breaks into multiple things | Blue → [Green, Green, Green] |

Note: Yellow creation is neither transition nor split - it's a **byproduct** of Green execution via learning signals.
