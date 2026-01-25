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

### Completion Drive (formerly Ralph Loop)

**Definition:** The autopilot execution pattern where an agent continuously works until complete, with automatic retry and iteration tracking.

**Why "drive":** Like a motor that keeps pushing toward the goal - relentless, goal-oriented execution.

**Characteristics:**
- Picks ready Green idea
- Executes until COMPLETE signal
- Retries with feedback on failure
- Tracks iteration count
- Continues to next idea automatically

**Not a loop but a pattern:** Despite the name, Ralph Loop is more of a "run until done" strategy with built-in recovery.

### Iteration

**Definition:** A single round-trip of agent work. One prompt, one response, one potential commit.

**Completion:** Requires BOTH the COMPLETE signal AND all quality commands passing.

### Stuck Detection

**Definition:** When an agent runs N iterations without producing a commit.

**Not an error:** Agent might be thinking. Swarm warns but continues, allowing human intervention.

---

## Operating Modes

### Semi-Auto Mode

**Definition:** User selects Green ideas, agent completes one then stops.

**Alias candidates:** "Supervised Mode" (industry term), "Step Mode"

### Autopilot Mode

**Definition:** Fully autonomous execution until no ready Green ideas remain.

**Safety features:**
- Checkpoint before starting
- Pause on NEEDS_HUMAN signal
- Human can intervene anytime

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

### Discovery Log

**Definition:** A query view on global Yellow ideas - not a separate file.

**Single source of truth:** All learnings live in `ideas.jsonl`, views are generated.

### Learning Injection

**Definition:** Active Yellow ideas are automatically included in agent prompts based on scope.

```
Global Yellow → All agents
Local Yellow → Only source agent
```

---

## Merge System

### Conflict Classification

| Level | Resolution | Handler |
|-------|------------|---------|
| **SIMPLE** | Auto-resolve | System |
| **MEDIUM** | AI-assisted | Fixer Finn |
| **COMPLEX** | Human escalation | User |

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

## State Management

### Snapshot + Event Sourcing

**Definition:** Hybrid persistence combining fast snapshots with reliable event replay.

```
Primary: Load snapshot (fast)
Fallback: Replay events (reliable)
```

### Checkpoint

**Definition:** A named save point for rollback.

**Automatic triggers:**
- Periodic (every N completed ideas)
- Before autopilot

---

## Planning Phases

The 5-phase dialogue model:

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | **UNDERSTAND** | Q&A to clarify goal |
| 2 | **ANALYZE** | Explore codebase context |
| 3 | **PROPOSE** | Present architecture for approval |
| 4 | **DECOMPOSE** | Generate atomic ideas |
| 5 | **VALIDATE** | Ralph Loop until all pass |

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

---

## Documentation Index Addition

This glossary is document 15 in the Swarm documentation series:

| # | Document | Purpose |
|---|----------|---------|
| 00 | Overview | System introduction |
| ... | ... | ... |
| 14 | Errors | Error handling |
| **15** | **Glossary** | **Terminology reference** |
