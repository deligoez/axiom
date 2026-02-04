# AXIOM Overview

AXIOM is a web-based orchestrator for multiple AI coding agents working on a shared codebase. Built with Go and htmx for real-time server-rendered UI.

---

## Core Philosophy

**"Turn black into green, one region at a time."**

AXIOM treats specifications as a **consumable canvas**. Every piece of text in a spec starts as "black" (raw, unprocessed) and progressively transforms through colors until it becomes "green" (implemented).

```
Spec Canvas:  ████████░░░░░░░░░░████████████████
              ↑ green    ↑ black (gap!)  ↑ blue
              (done)     (unprocessed)   (in progress)
```

**Emergent Planning:** Some cases produce other cases. Instead of Big Design Up Front:

1. Find black regions in the spec (unprocessed requirements)
2. Turn them into colored cases (draft/research/operation/task)
3. Implement tasks → turn blue into green
4. Record discoveries → update the plan
5. Repeat until no black remains

---

## The Case System

Cases are categorized by clarity and readiness level:

### Discovery Cases (produce more cases)

| Color | Type | Description |
|-------|------|-------------|
| ⬛ | Directive | Raw need in JTBD format - the PRD |
| ⬜ | Draft | Plan draft, needs detailing |
| 🟧 | Research | Research/spike needed |
| 🟪 | Pending | Decision pending (user blocker) |
| 🟥 | Deferred | Deferred, out of current scope |

### Implementation Cases (produce code)

| Color | Type | Description |
|-------|------|-------------|
| 🟦 | Operation | Concrete feature (vertical slice) |
| 🟩 | Task | Atomic case, ready to implement |

Task with `status: done` = Completed. Completed is a status, not a separate type.

### Knowledge Cases (capture discoveries)

| Color | Type | Description |
|-------|------|-------------|
| 🟡 | Discovery | Learning from implementation |

Discovery cases are created when agents emit discovery signals during Task execution.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AXIOM Server                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Orchestrator│  │ Integration │  │   Monitor   │  │
│  │   Service   │  │    Queue    │  │   Service   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          │                          │
│  ┌───────────────────────▼───────────────────────┐  │
│  │              Agent Manager                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │echo-001 │ │echo-002 │ │echo-003 │  ...     │  │
│  │  └─────────┘ └─────────┘ └─────────┘          │  │
│  └───────────────────────────────────────────────┘  │
│                          │                          │
│  ┌───────────────────────▼───────────────────────┐  │
│  │              Web UI (htmx)                     │  │
│  │    Real-time updates via SSE/WebSocket        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Single binary, no dependencies. Each agent runs in its own git workspace with isolated state.

**Why git worktree for isolation?**
- **Disk efficient:** Shares .git directory (no duplicate history)
- **Fast:** Instant branch creation, shared object database
- **Clean:** No merge conflicts during parallel work
- **Native:** Uses Git's built-in feature, no custom isolation

See [16-glossary.md](./16-glossary.md#workspace-vs-worktree-terminology) for terminology guide.

---

## Two Operating Modes

| Mode | Behavior |
|------|----------|
| Semi-Auto | User selects Tasks, agent completes one then stops |
| Autopilot | Fully autonomous until no ready Tasks remain |

---

## Workflow Phases

```
Init Mode → Planning Mode → Implementation Mode
    │            │                  │
    ▼            ▼                  ▼
Analyst Ava   Architect Axel     Executor Echo
analyzes      refines            instances
project       Directive → Task   execute Tasks
```

1. **Init Mode** - Analyst Ava examines project, suggests configuration, creates `.axiom/`
2. **Planning Mode** - Architect Axel runs 5-phase dialogue (UNDERSTAND → ANALYZE → PROPOSE → DECOMPOSE → VALIDATE)
3. **Implementation Mode** - Executor Echo instances execute Tasks in parallel

### Planning Dialogue Model

```
Phase 1        Phase 2        Phase 3        Phase 4        Phase 5
UNDERSTAND  →  ANALYZE   →   PROPOSE   →  DECOMPOSE  →   VALIDATE
(Q&A)         (Explore)     (Approval)    (Generate)   (Execution Loop)
```

Debrief runs automatically after each Operation completes.

---

## Agent Personas

Eight named personas with distinct roles:

| Persona | Role | When Active |
|---------|------|-------------|
| Analyst Ava 🔍 | Project analysis | Init mode |
| Architect Axel 📊 | Planning + Debrief | Planning, after Operation completion |
| Executor Echo ⚙️ | Implementation | Task → done (N parallel) |
| Resolver Rex 🔧 | Merge conflict resolution | On conflict |
| Curator Cleo 💡 | Creates Discovery cases from signals | After completion |
| Monitor Max 👁️ | Health monitoring | Always (background) |
| Auditor Ash 📈 | Metrics and ID assignment | Always (event-driven) |
| Director Dex 😎 | Orchestration | Always |

All agents get instance numbers (`echo-001`, `axel-002`) that persist across restarts.

---

## Signal Protocol

Agents communicate via signals embedded in their output:

```
<axiom>SIGNAL:payload</axiom>
```

| Signal | Purpose |
|--------|---------|
| `COMPLETE` | Case finished successfully |
| `BLOCKED:reason` | Cannot proceed, external blocker |
| `PENDING:reason` | Human decision required |
| `PROGRESS:N` | Progress percentage update |
| `RESOLVED` | Merge conflict resolved (Rex) |
| `DISCOVERY_LOCAL:content` | Creates Discovery case (scope: local) |
| `DISCOVERY_GLOBAL:content` | Creates Discovery case (scope: global) |

---

## Case Management

Native CaseStore with:
- 8 types: Directive, Draft, Research, Pending, Deferred, Operation, Task, Discovery
- 4 universal statuses: pending, active, blocked, done
- Type-specific statuses (Task: failed, timeout, review; Discovery: active, outdated, archived)
- Parent-child lineage tracking
- Append-only history
- JSONL persistence format

---

## Directory Structure

```
.axiom/
├── config.json              # Configuration
├── cases.jsonl              # Case database (all types incl. Discovery)
├── planning-state.json      # Mode/planning state (5 phases)
├── discoveries.md           # View: global Discovery cases
├── case-rules.md            # Case validation rules
├── rules/                   # Shared agent rules
│   ├── signal-types.md      # Signal protocol
│   ├── discovery-format.md  # Discovery scope prefixes
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
│       ├── discoveries.md   # View: local Discovery cases
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
├── feedback/                # Review feedback per case
├── cycles.jsonl             # Cycle statistics
├── hooks/                   # User-defined lifecycle hooks
└── reviews/                 # Review history
```

---

## Design Principles

1. **Emergent Planning** - Cases produce other cases, plan evolves
2. **Non-Invasive** - Uses git workspaces, no project modifications
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
| [03-planning.md](./03-planning.md) | Planning, 5-Phase Dialogue, Spec Lifecycle |
| [04-cases.md](./04-cases.md) | Case management (Case System) |
| [05-agents.md](./05-agents.md) | Agent personas, Prompt Construction, Shared Rules |
| [06-integration.md](./06-integration.md) | Integration service |
| [07-execution.md](./07-execution.md) | Execution Loop (Task execution, Sprint) |
| [08-discovery.md](./08-discovery.md) | Discovery System (Discovery cases) |
| [09-intervention.md](./09-intervention.md) | Intervention and rollback |
| [10-interface.md](./10-interface.md) | Web UI components |
| [11-review.md](./11-review.md) | Review and Debrief |
| [12-hooks.md](./12-hooks.md) | Hooks System (lifecycle scripts) |
| [13-reference.md](./13-reference.md) | Quick reference |
| [14-prompts.md](./14-prompts.md) | Default persona prompts |
| [15-errors.md](./15-errors.md) | Error handling matrix |
| [16-glossary.md](./16-glossary.md) | Terminology and unique concepts |
