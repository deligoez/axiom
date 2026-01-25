# Swarm Overview

Swarm is a web-based orchestrator for multiple AI coding agents working on a shared codebase. Built with Go and htmx for real-time server-rendered UI.

---

## Core Philosophy

**"Take small steps, learn from each one, update the plan."**

Swarm uses the Swarm Planning Method - an emergent approach where some todo items produce other todo items. Instead of Big Design Up Front:

1. Implement a small slice
2. Record what you learned
3. Update the entire plan based on learnings
4. Repeat

---

## The Color System

Ideas are categorized by clarity and readiness level:

### Discovery Ideas (produce more ideas)

| Color | Name | Description |
|-------|------|-------------|
| ⬛ | Black | Raw need in JTBD format - the PRD |
| ⬜ | Gray | Plan draft, needs detailing |
| 🟧 | Orange | Research/spike needed |
| 🟪 | Purple | Decision pending (user blocker) |
| 🟥 | Red | Deferred, out of current scope |

### Implementation Ideas (produce code)

| Color | Name | Description |
|-------|------|-------------|
| 🟦 | Blue | Concrete feature (vertical slice) |
| 🟩 | Green | Atomic idea, ready to implement |

Green with `status: done` = White (completed). White is a status, not a separate color.

### Knowledge Ideas (capture learnings)

| Color | Name | Description |
|-------|------|-------------|
| 🟡 | Yellow | Learning/Discovery from implementation |

Yellow ideas are created when agents emit learning signals during Green execution.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Swarm Server                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Orchestrator│  │ Merge Queue │  │  Monitor    │  │
│  │   Service   │  │   Service   │  │   Service   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          │                          │
│  ┌───────────────────────▼───────────────────────┐  │
│  │              Agent Manager                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │ ed-001  │ │ ed-002  │ │ ed-003  │  ...     │  │
│  │  └─────────┘ └─────────┘ └─────────┘          │  │
│  └───────────────────────────────────────────────┘  │
│                          │                          │
│  ┌───────────────────────▼───────────────────────┐  │
│  │              Web UI (htmx)                     │  │
│  │    Real-time updates via SSE/WebSocket        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Single binary, no dependencies. Each agent runs in its own git worktree with isolated state.

---

## Two Operating Modes

| Mode | Behavior |
|------|----------|
| Semi-Auto | User selects Green ideas, agent completes one then stops |
| Autopilot | Fully autonomous until no ready Green ideas remain |

---

## Workflow Phases

```
Init Mode → Planning Mode → Implementation Mode
    │            │                  │
    ▼            ▼                  ▼
Ace analyzes  Pat refines        Ed workers
project       Black → Green      execute Greens
```

1. **Init Mode** - Analyzer Ace examines project, suggests configuration, creates `.swarm/`
2. **Planning Mode** - Planner Pat runs 5-phase dialogue (UNDERSTAND → ANALYZE → PROPOSE → DECOMPOSE → VALIDATE)
3. **Implementation Mode** - Engineer Ed instances execute Green ideas in parallel

### Planning Dialogue Model

```
Phase 1        Phase 2        Phase 3        Phase 4        Phase 5
UNDERSTAND  →  ANALYZE   →   PROPOSE   →  DECOMPOSE  →   VALIDATE
(Q&A)         (Explore)     (Approval)    (Generate)   (Completion Drive)
```

Retrospective runs automatically after each Blue feature completes.

---

## Agent Personas

Eight named personas with distinct roles:

| Persona | Role | When Active |
|---------|------|-------------|
| Analyzer Ace 🔍 | Project analysis | Init mode |
| Planner Pat 📊 | Full Swarm spiral + Retrospective | Planning, after Blue completion |
| Engineer Ed ⚙️ | Implementation | Green → done (N parallel) |
| Fixer Finn 🔧 | Merge conflict resolution | On conflict |
| Logger Lou 💡 | Creates Yellow ideas from learning signals | After completion |
| Watcher Will 👁️ | Health monitoring | Always (background) |
| Counter Carl 📈 | Metrics and ID assignment | Always (event-driven) |
| Director Dan 😎 | Orchestration | Always |

All agents get instance numbers (`ed-001`, `pat-002`) that persist across restarts.

---

## Signal Protocol

Agents communicate via signals embedded in their output:

```
<swarm>SIGNAL:payload</swarm>
```

| Signal | Purpose |
|--------|---------|
| `COMPLETE` | Idea finished successfully |
| `BLOCKED:reason` | Cannot proceed, external blocker |
| `NEEDS_HUMAN:reason` | Human intervention required |
| `PROGRESS:N` | Progress percentage update |
| `RESOLVED` | Merge conflict resolved (Finn) |
| `LEARNING_LOCAL:content` | Creates Yellow idea (scope: local) |
| `LEARNING_GLOBAL:content` | Creates Yellow idea (scope: global) |

---

## Idea Management

Native IdeaStore with:
- 8 colors: black, gray, orange, purple, red, blue, green, yellow
- 4 universal statuses: pending, active, blocked, done
- Color-specific statuses (Green: failed, timeout, review; Yellow: active, outdated, archived)
- Parent-child lineage tracking
- Append-only history
- JSONL persistence format

---

## Directory Structure

```
.swarm/
├── config.json              # Configuration
├── ideas.jsonl              # Idea database (all colors incl. Yellow)
├── planning-state.json      # Mode/planning state (5 phases)
├── learnings.md             # View: global Yellow ideas
├── idea-rules.md            # Idea validation rules
├── rules/                   # Shared agent rules
│   ├── signal-types.md      # Signal protocol
│   ├── learning-format.md   # Learning scope prefixes
│   ├── commit-format.md     # Commit message format
│   └── completion-protocol.md
├── state/                   # State persistence
│   ├── snapshot.json        # Current state
│   └── events.jsonl         # Event log for recovery
├── agents/                  # Per-agent data
│   └── {persona}/
│       ├── prompt.md        # System prompt
│       ├── rules.md         # Persona-specific rules
│       ├── skills/          # Skill files (*.md)
│       ├── learnings.md     # View: local Yellow ideas
│       ├── metrics.json     # Performance metrics
│       └── logs/            # Execution logs (JSONL)
├── specs/                   # Spec documents (consumable)
│   ├── *.md                 # Active specs
│   ├── progress.json        # Spec section states
│   └── archive/             # Completed specs
├── checkpoints/             # Saved states for rollback
├── metrics/                 # Session statistics
│   ├── counters.json        # Agent spawn counters
│   ├── session.json         # Current session stats
│   └── history.jsonl        # Historical data
├── feedback/                # Review feedback per idea
├── sprints.jsonl            # Sprint statistics
├── hooks/                   # User-defined lifecycle hooks
└── reviews/                 # Review history
```

---

## Design Principles

1. **Emergent Planning** - Ideas produce other ideas, plan evolves
2. **Non-Invasive** - Uses git worktrees, no project modifications
3. **Fail-Safe** - Crash recovery via snapshot + event sourcing
4. **Observable** - All actions visible in Web UI and logged
5. **Interruptible** - Human can intervene without data loss
6. **Zero Dependencies** - Single binary, runs anywhere

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [01-configuration.md](./01-configuration.md) | Configuration system |
| [02-modes.md](./02-modes.md) | Mode routing, Init Mode, Operating modes |
| [03-planning.md](./03-planning.md) | Swarm Planning, 5-Phase Dialogue, Spec Lifecycle |
| [04-ideas.md](./04-ideas.md) | Idea management (Color System) |
| [05-agents.md](./05-agents.md) | Agent personas, Prompt Construction, Shared Rules |
| [06-merging.md](./06-merging.md) | Merge service |
| [07-autopilot.md](./07-autopilot.md) | Completion Drive (Green execution) |
| [08-learnings.md](./08-learnings.md) | Discovery System (Yellow ideas) |
| [09-intervention.md](./09-intervention.md) | Intervention and rollback |
| [10-interface.md](./10-interface.md) | Web UI components |
| [11-review.md](./11-review.md) | Review and Retrospective |
| [12-reference.md](./12-reference.md) | Quick reference |
| [13-prompts.md](./13-prompts.md) | Default persona prompts |
| [14-errors.md](./14-errors.md) | Error handling matrix |
| [15-glossary.md](./15-glossary.md) | Terminology and unique concepts |
