# Swarm Glossary

Swarm's unique terminology and concepts. This document defines the language of Swarm and highlights what makes it different from other multi-agent systems.

---

## Core Philosophy

### Emergent Planning

**Definition:** A planning methodology where some todo items produce other todo items, rather than assuming all work is known upfront.

**Why it's different:** Traditional task management assumes a fixed list. Swarm embraces uncertainty - you're never blocked because there's always a next action, even if that action is "figure out what to do next."

**Contrast:**
| Traditional | Emergent |
|-------------|----------|
| All tasks known upfront | Tasks discovered during work |
| Plan once, execute | Plan evolves with learnings |
| Blocked = stuck | Blocked = create exploration task |

---

### Swarm Planning Spiral

**Definition:** The iterative refinement cycle where Pat clarifies Gray ideas, never returning to the same state twice.

**Why "spiral" not "loop":** A loop implies returning to the starting point. In Swarm, each pass produces more refined ideas - you're always moving forward, just circling back to earlier concepts with new knowledge.

```
        Pass 1: "Auth system"
           ↓
        Pass 2: "Auth system using JWT"
           ↓
        Pass 3: "Auth system using JWT with refresh tokens"
```

---

## Workflow Phases

Three distinct phases that Swarm progresses through:

| Phase | Persona | Purpose | Entry Condition |
|-------|---------|---------|-----------------|
| **Init** | Ace | First-time setup, configuration | No `.swarm/` directory |
| **Planning** | Pat | Decompose need into ideas | No ready Green ideas |
| **Implementation** | Ed (N parallel) | Execute Green ideas | Has ready Green ideas |

### Mode Routing

**Definition:** The decision logic that determines which workflow phase to enter.

```
swarm command → Check .swarm/ exists?
                     │
              No ────┴──── Yes
              ↓            ↓
           INIT      Check has ideas?
                          │
                   No ────┴──── Yes
                   ↓            ↓
               PLANNING    IMPLEMENTATION
```

---

## The Color System

Swarm's signature classification system for ideas based on clarity and readiness level.

### Discovery Colors (produce more ideas)

| Color | Name | Meaning |
|-------|------|---------|
| ⬛ **Black** | Raw Need | The PRD in JTBD format - the single source of truth |
| ⬜ **Gray** | Plan Draft | Undetailed, needs refinement |
| 🟧 **Orange** | Research Spike | Requires investigation before proceeding |
| 🟪 **Purple** | Decision Blocker | Waiting for human decision |
| 🟥 **Red** | Deferred | Out of current scope, preserved for later |

### Implementation Colors (produce code)

| Color | Name | Meaning |
|-------|------|---------|
| 🟦 **Blue** | Vertical Slice | A complete feature spanning all layers |
| 🟩 **Green** | Atomic Idea | The smallest implementable unit |

### Knowledge Color (captures learnings)

| Color | Name | Meaning |
|-------|------|---------|
| 🟡 **Yellow** | Learning | Discovery captured during implementation |

### White (Status, not Color)

**White** = Green with `status: done`. It represents completion, not a separate category.

**Why colors instead of tags?** Colors are:
- Mutually exclusive (an idea can only be one color)
- Visually distinct in the Web UI
- Semantically meaningful (color conveys both type AND readiness)

---

## Idea State Changes

### Transition

**Definition:** An idea changes color but remains conceptually the same thing.

```
Gray "Auth system" → Orange "Research auth options" → Blue "Clerk integration"
```

### Split

**Definition:** An idea breaks into multiple distinct child ideas.

```
Blue "Login flow" → Green "Clerk setup"
                  → Green "Login UI"
                  → Green "Session handling"
```

**Yellow Exception:** Yellow creation is neither transition nor split - it's a **byproduct** of Green execution via learning signals.

---

## Core Infrastructure

### IdeaStore

**Definition:** The native storage service for all ideas across all 8 colors.

**Not a task tracker:** Unlike traditional task management, IdeaStore handles:
- Color transitions (Gray → Blue → Green)
- Lineage tracking (parent-child relationships)
- Yellow idea lifecycle (active → outdated → archived)
- Event emission for UI updates
- JSONL persistence (`.swarm/ideas.jsonl`)

**Why native, not external?** Single source of truth with real-time events and color-aware queries.

---

### Quality Commands

**Definition:** Shell commands that must pass for a Green idea to be considered complete.

```json
{
  "qualityCommands": [
    "npm run test:run",
    "npm run typecheck",
    "npm run lint"
  ]
}
```

**Completion rule:** COMPLETE signal + ALL quality commands passing = idea done.

---

### Agent Slot

**Definition:** An available execution slot for parallel agents.

**Configuration:** `agents.maxParallel` (default: 3)

**Behavior:**
- Semi-Auto: User manually fills slots
- Autopilot: System auto-fills available slots with ready Green ideas

---

### Safe Boundary

**Definition:** The point between iterations where an agent can safely pause without losing work.

**When reached:**
- Current iteration response received
- Any commits completed
- State persisted

**Used for:** Graceful pause, mode switching, emergency stop.

---

## The Persona System

Swarm uses named agents with alliterative names and distinct personalities. Unlike generic "Agent 1, Agent 2", each persona has a clear role and character.

### The Eight Personas

| Persona | Emoji | Role | When Active |
|---------|-------|------|-------------|
| **Analyzer Ace** | 🔍 | Project analysis | Init mode |
| **Planner Pat** | 📊 | Planning spiral + Retrospective | Planning, after Blue completion |
| **Engineer Ed** | ⚙️ | Implementation | Green execution (N parallel) |
| **Fixer Finn** | 🔧 | Merge conflict resolution | On conflict |
| **Logger Lou** | 💡 | Learning extraction | After completion |
| **Director Dan** | 😎 | Orchestration | Always |
| **Watcher Will** | 👁️ | Health monitoring | Always (background) |
| **Counter Carl** | 📈 | Metrics and ID assignment | Always (event-driven) |

### The Support Trio

**Lou, Will, and Carl** form a unique support layer that no other multi-agent system has:
- **Lou** captures institutional knowledge automatically
- **Will** monitors system health proactively
- **Carl** provides observability and accountability

**Contrast with competitors:**
| System | Learning | Health | Metrics |
|--------|----------|--------|---------|
| Swarm | Lou (dedicated) | Will (dedicated) | Carl (dedicated) |
| MetaGPT | None | None | Basic |
| CrewAI | None | None | Basic |
| Devin | Per-session | Timeout-based | Dashboard |

---

## Execution Patterns

### Completion Drive

**Definition:** The autopilot execution pattern where an agent continuously works until complete, with automatic retry and iteration tracking.

**Historical note:** Originally called "Ralph Loop" during early development. Renamed to better reflect its goal-oriented nature.

**Why "drive":** Like a motor that keeps pushing toward the goal - relentless, goal-oriented execution.

**Characteristics:**
- Picks ready Green idea
- Executes until COMPLETE signal
- Retries with feedback on failure
- Tracks iteration count
- Continues to next idea automatically

**The pattern:**
```
Pick Green → Execute → Signal?
                         │
              COMPLETE ──┼── BLOCKED/NEEDS_HUMAN
                  ↓      │           ↓
            Quality OK?  │      Handle, pick next
                  │      │
            Yes ──┴── No │
             ↓        ↓  │
          Done    Retry  │
             │           │
             └───────────┴──→ Pick next Green
```

---

### Iteration

**Definition:** A single round-trip of agent work. One prompt, one response, one potential commit.

**Completion:** Requires BOTH the COMPLETE signal AND all quality commands passing.

---

### Stuck Detection

**Definition:** When an agent runs N iterations without producing a commit.

**Not an error:** Agent might be thinking. Swarm warns but continues, allowing human intervention.

**Threshold:** Configurable via `completion.stuckThreshold` (default: 5).

---

## Operating Modes

### Semi-Auto Mode

**Definition:** User selects Green ideas, agent completes one then stops.

**Use cases:**
- Learning a new codebase
- Critical changes requiring verification
- Step-by-step debugging

---

### Autopilot Mode

**Definition:** Fully autonomous execution until no ready Green ideas remain.

**Safety features:**
- Checkpoint before starting
- Pause on NEEDS_HUMAN signal
- Human can intervene anytime
- Error threshold pauses after N consecutive failures

---

## Signal Protocol

Swarm's explicit agent-to-orchestrator communication system.

### Signal Format

```
<swarm>SIGNAL:payload</swarm>
```

### Core Signals

| Signal | Purpose | Example |
|--------|---------|---------|
| `COMPLETE` | Idea finished | `<swarm>COMPLETE</swarm>` |
| `BLOCKED` | Cannot proceed | `<swarm>BLOCKED:Missing API key</swarm>` |
| `NEEDS_HUMAN` | Human decision required | `<swarm>NEEDS_HUMAN:Which auth provider?</swarm>` |
| `PROGRESS` | Status update | `<swarm>PROGRESS:75</swarm>` |
| `RESOLVED` | Conflict resolved (Finn) | `<swarm>RESOLVED</swarm>` |

### Learning Signals

| Signal | Scope | Injected Into |
|--------|-------|---------------|
| `LEARNING_LOCAL` | Agent-specific | Same agent's future prompts |
| `LEARNING_GLOBAL` | Project-wide | All agents' prompts |

**Why explicit signals?** Unlike implicit completion detection (exit code, lack of errors), signals are:
- Unambiguous
- Machine-parseable
- Carry semantic meaning
- Support rich payloads

---

## Learning System

### Yellow Ideas

**Definition:** First-class citizens in the IdeaStore that capture discoveries during implementation.

**Not just notes:** Yellow ideas are:
- Linked to parent Green (lineage)
- Classified by impact (low/medium/high/critical)
- Injected into prompts automatically
- Archived when parent completes

---

### Discovery Log

**Definition:** A query view on global Yellow ideas - not a separate file.

**Single source of truth:** All learnings live in `ideas.jsonl`, views are generated.

---

### Learning Injection

**Definition:** Active Yellow ideas are automatically included in agent prompts based on scope.

```
Global Yellow → All agents
Local Yellow → Only source agent
```

---

### Learning Promotion

**Definition:** Converting a local Yellow idea to global scope.

**When to promote:** A local learning proves useful beyond its original context.

**Mechanism:** Update `metadata.scope` from `local` to `global` - same idea ID, broader reach.

---

### Learning Resurrection

**Definition:** Bringing an archived Yellow idea back to active status.

**Use case:** A learning discovered in one Green is still relevant for future work.

**When allowed:** Only archived Yellow ideas can be resurrected.

---

### Cross-Agent Propagation

**Definition:** How global Yellow ideas spread to all active agents.

**Flow:**
1. Lou creates global Yellow
2. Emits `idea:yellow_created` event
3. Active agents notified via state machine
4. Next prompt includes new learning
5. No agent restart required

---

## Merge System

### Conflict Classification

| Level | Resolution | Handler |
|-------|------------|---------|
| **SIMPLE** | Auto-resolve | System |
| **MEDIUM** | AI-assisted | Fixer Finn |
| **COMPLEX** | Human escalation | User |

---

### Merge Queue

**Definition:** FIFO queue of completed ideas waiting for branch integration.

**Features:**
- Dependency-aware ordering
- Automatic retry
- Worktree cleanup on success

---

## Review vs Retrospective

Two distinct systems that work together:

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| **Review** | Green completion | Human | Quality check |
| **Retrospective** | Blue completion | Pat | Learn and update plan |

### Review Modes

| Mode | Behavior |
|------|----------|
| `per-task` | Review each immediately |
| `batch` | Collect and review later |
| `auto-approve` | Auto-approve if criteria met |
| `skip` | No review |

---

## Intervention System

### Intervention Panel

**Definition:** The Web UI component for controlling agents and managing state during execution.

**Actions available:**
- Pause/Resume all agents
- Stop specific agent
- Redirect agent to different idea
- Create checkpoint
- Rollback to checkpoint

---

### Emergency Stop

**Definition:** The graceful shutdown triggered by `Ctrl+C`.

**Sequence:**
1. Stop accepting new ideas
2. Signal agents to pause
3. Wait for safe boundaries (5s timeout)
4. Persist state snapshot
5. Exit cleanly

**Second `Ctrl+C`:** Forces immediate exit without graceful shutdown.

---

### The Audit Trail

**Definition:** The recovery context injected into prompts when a crashed idea is retried.

**Contains:**
- Previous attempt count
- Files modified before crash
- Test status at crash point
- Last commit hash
- Iteration number at crash

**Purpose:** Help agent continue from where previous attempt left off.

---

## State Management

### Snapshot + Event Sourcing

**Definition:** Hybrid persistence combining fast snapshots with reliable event replay.

```
Primary: Load snapshot (fast)
Fallback: Replay events (reliable)
```

---

### Checkpoint

**Definition:** A named save point for rollback.

**Automatic triggers:**
- Periodic (every N completed ideas)
- Before autopilot

---

## Hooks System

**Definition:** User-defined shell scripts that run at key lifecycle events.

### Available Hooks

| Hook | Trigger | Use Case |
|------|---------|----------|
| `pre-start` | Agent claims idea | Setup, notifications |
| `post-complete` | Idea done/failed | Slack notify, logging |
| `pre-merge` | Before merge attempt | Run E2E tests |
| `post-merge` | After successful merge | Deploy, notify |
| `on-conflict` | Merge conflict detected | Alert, custom resolution |
| `on-learning` | Learning extracted | External storage |
| `on-pause` | Session paused | Cleanup |
| `on-error` | Error occurred | Alerting |

**Location:** `.swarm/hooks/`

---

## Planning Phases

The 5-phase dialogue model (The Planning Dialogue):

| Phase | Name | Purpose | Metaphor |
|-------|------|---------|----------|
| 1 | **UNDERSTAND** | Q&A to clarify goal | Interview |
| 2 | **ANALYZE** | Explore codebase context | Investigation |
| 3 | **PROPOSE** | Present architecture for approval | Pitch |
| 4 | **DECOMPOSE** | Generate atomic ideas | Blueprint |
| 5 | **VALIDATE** | Verify ideas meet INVEST criteria | Quality Check |

---

## Unique Differentiators

### What Swarm Does That Others Don't

| Feature | Swarm | Industry |
|---------|-------|----------|
| **Named personas** | 8 with personalities | Generic "Agent N" |
| **Explicit signals** | `<swarm>SIGNAL</swarm>` | Implicit detection |
| **Learning extraction** | Dedicated Lou agent | None or manual |
| **Health monitoring** | Dedicated Will agent | Timeout-based |
| **Merge specialist** | Dedicated Finn agent | Manual or PR-based |
| **Color system** | 8 semantic colors | Tags or statuses |
| **Emergent planning** | Ideas produce ideas | Fixed task lists |

### Industry-Aligned Terms

| Concept | Swarm Term | Industry Term |
|---------|------------|---------------|
| Isolated execution | Worktree | Worktree/VM/Sandbox |
| Unit of work | Green idea | Task |
| Save point | Checkpoint | Checkpoint/Snapshot |
| Full autonomy | Autopilot | Autonomous |
| Quality checks | Quality Commands | CI/Validation |

---

## Branded Concepts

### The Idea Spectrum

**Definition:** Swarm's color-based idea classification system as a whole.

**Components:**
- 8 distinct colors with semantic meaning
- Visual representation in Web UI
- State machine for transitions

**Why "spectrum":** Ideas exist across a spectrum from abstract (Black) to concrete (Green), each color representing a different state of clarity and readiness.

---

### The Color Cascade

**Definition:** The natural flow of ideas from abstract (Black) to concrete (Green).

```
⬛ → ⬜ → 🟦 → 🟩 → ✓
Black → Gray → Blue → Green → Done
```

**Branches:**
- 🟧 Orange (research detour)
- 🟪 Purple (decision gate)
- 🟥 Red (scope exit)
- 🟡 Yellow (learning capture)

---

### The Hive (Discovery System)

**Definition:** The collective intelligence formed by all Yellow ideas - project-wide learnings that accumulate over time.

**Two perspectives:**
- **The Hive** (conceptual): The living, growing collective knowledge
- **Discovery Log** (technical): The query view on global Yellow ideas (`learnings.md`)

**Characteristics:**
- Grows with each completed Green
- Injected into all agent prompts
- Survives across sessions
- Self-maintaining (outdated detection)

**Why "hive":** Like a beehive's collective knowledge, Swarm's learning system is greater than the sum of individual discoveries.

---

### Signal Pulse

**Definition:** An agent's communication via the signal protocol.

**Pulse types:**
- **Heartbeat:** PROGRESS signals (agent is alive)
- **Completion:** COMPLETE signal (work done)
- **Alert:** BLOCKED, NEEDS_HUMAN (attention needed)
- **Discovery:** LEARNING_* (knowledge captured)

---

### Worktree Colony

**Definition:** The collection of git worktrees where parallel agents operate.

```
.worktrees/
├── ed-001-idea-042/   ← Agent ed-001's workspace
├── ed-002-idea-043/   ← Agent ed-002's workspace
└── finn-001-merge/    ← Finn's merge workspace
```

**Colony rules:**
- One worktree per active agent
- Isolation guarantees no conflicts during work
- Cleanup after successful merge

---

### The Init Conversation

**Definition:** The guided setup experience with Analyzer Ace for first-time projects.

**Flow:**
```
Welcome Screen → Meet the Team (optional) → Ace Analysis → Auto-Scaffold
```

**What Ace does:**
- Detects project type and structure
- Suggests quality commands
- Creates `.swarm/` directory
- Transitions to Planning Mode

---

### The Planning Dialogue

**Definition:** The 5-phase conversation between Pat and the user.

| Phase | Metaphor |
|-------|----------|
| UNDERSTAND | Interview |
| ANALYZE | Investigation |
| PROPOSE | Pitch |
| DECOMPOSE | Blueprint |
| VALIDATE | Quality Check |

---

### Vertical Slicing

**Definition:** Breaking features by capability, not by layer.

**The Vertical Principle:**
```
One Blue = One user-facing capability
         = Schema + API + UI
         = Testable in isolation
```

**Anti-pattern (Horizontal):**
```
"Build all schemas" → "Build all APIs" → "Build all UI"
```

---

### Idea Lineage

**Definition:** The parent-child relationship between ideas.

```
Black (PRD)
└── Gray (Plan section)
    └── Blue (Feature)
        ├── Green (Task 1)
        │   └── Yellow (Learning)
        ├── Green (Task 2)
        └── Green (Task 3)
```

**Lineage enables:**
- Traceability (why does this Green exist?)
- Retrospective (what did we learn from this Blue?)
- Impact analysis (what depends on this?)

---

## Quick Reference

### JTBD Format (Black Ideas)

```
"When [situation], I want [motivation], so that [outcome]."
```

### INVEST Criteria (Green Ideas)

- **I**ndependent: Can be done without waiting
- **N**egotiable: Details flexible
- **V**aluable: Produces value alone
- **E**stimable: Size can be estimated
- **S**mall: One session
- **T**estable: Has acceptance criteria

### Vertical Slice (Blue Ideas)

A feature that spans all layers (DB, API, UI) for one capability.

```
❌ Horizontal: "Design all schemas"
✓ Vertical: "View single post" (schema + API + UI)
```

### Status Symbols

| Symbol | Status | Description |
|--------|--------|-------------|
| `→` | pending | Ready to work |
| `●` | active | Currently processing |
| `⊗` | blocked | Has blockers |
| `✓` | done | Completed |
| `✗` | failed | Error occurred |
| `⏱` | timeout | Timed out |
| `◐` | review | Awaiting review |

---

## Documentation Index

| # | Document | Purpose |
|---|----------|---------|
| 00 | Overview | System introduction |
| 01 | Configuration | Config system |
| 02 | Modes | Mode routing, Init, Operating modes |
| 03 | Planning | Planning Dialogue, Spec Lifecycle |
| 04 | Ideas | Color System, IdeaStore |
| 05 | Agents | Personas, Prompt Construction |
| 06 | Merging | Merge Service |
| 07 | Autopilot | Completion Drive |
| 08 | Learnings | Discovery System (Yellow ideas) |
| 09 | Intervention | Intervention, Rollback, Hooks |
| 10 | Interface | Web UI components |
| 11 | Review | Review and Retrospective |
| 12 | Reference | Quick reference |
| 13 | Prompts | Default persona prompts |
| 14 | Errors | Error handling |
| **15** | **Glossary** | **Terminology reference** |
