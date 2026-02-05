# AXIOM Glossary

AXIOM's unique terminology and concepts. This document defines the language of AXIOM and highlights what makes it different from other multi-agent systems.

---

## Core Philosophy

### The Black Book

**Definition:** The single, definitive specification document for a project. Contains ALL user requirements, prioritized and organized by Architect Axel.

**Key principle:** ONE Black Book per project, regardless of how many requests the user provides.

**Why "Black Book":**
- Like a chef's recipe book - THE authoritative source
- All requirements consolidated in one place
- Single source of truth for what needs to be built

**Multi-request handling:**
```
User: "Add auth and also dark mode and improve performance"
           ↓
Axel consolidates into ONE Black Book:
  1. [P0] User authentication
  2. [P1] Dark mode support
  3. [P2] Performance improvements
```

**Location:** `.axiom/specs/` (single active spec file)

**Also known as:** Directive, Spec

---

### Spec Canvas

**Definition:** The representation of a specification as a **consumable surface** where every character is annotated with a color representing its processing state.

**Visual metaphor:** Like highlighting a document with colored markers as you read and process it.

```
Spec Text:    "Users should be able to login and reset password"
Canvas:        ████████████████████████████░░░░░░░░░░░░░░░░░░░
               ↑ green (implemented)      ↑ black (unprocessed)
```

**Goal:** Transform all black (raw) regions into green (implemented) or red (deferred). When `coverage.green + coverage.red == 100%`, the spec is satisfied.

---

### Gap (Spec Gap)

**Definition:** A black (unprocessed) region surrounded by colored text in the spec canvas.

**Why it matters:** Gaps represent forgotten requirements, implicit assumptions, or scope that fell through the cracks. Axel's primary job is **gap hunting** - finding and processing these black regions.

```
"Users can login ████████████ and reset their password"
                 ↑ gap: "with email" not addressed!
```

---

### Color State

**Definition:** The processing state of a spec region, mapped to case types.

| Color | Case Type | Meaning |
|-------|-----------|---------|
| ⬛ Black | (raw) | Unprocessed spec text |
| ⬜ Gray | Draft | Being planned |
| 🟧 Orange | Research | Investigation required |
| 🟪 Purple | Pending | Blocked on user decision |
| 🟦 Blue | Operation | Feature in progress |
| 🟩 Green | Task (done) | Implemented |
| 🟥 Red | Deferred | Out of scope |
| 🟡 Yellow | Discovery | Runtime learning |

---

### Coverage

**Definition:** The percentage of spec text in each color state.

**Example:**
```json
{
  "black": 15.2,
  "green": 45.0,
  "blue": 22.4,
  "red": 17.4
}
```

**Completion criteria:** `green + red == 100%` (all text is either implemented or explicitly deferred)

---

### Emergent Planning

**Definition:** A planning methodology where some cases produce other cases, rather than assuming all work is known upfront.

**Why it's different:** Traditional task management assumes a fixed list. AXIOM embraces uncertainty - you're never blocked because there's always a next action, even if that action is "figure out what to do next."

**In terms of Spec Canvas:** The spec starts all black. Through emergent planning, black regions are progressively colored until no black remains.

**Contrast:**
| Traditional | Emergent |
|-------------|----------|
| All tasks known upfront | Cases discovered during work |
| Plan once, execute | Plan evolves with discoveries |
| Blocked = stuck | Blocked = create exploration case |

---

### Planning Spiral

**Definition:** The iterative refinement cycle where Architect Axel turns black spec regions into colored cases, progressively increasing coverage.

**Also known as:** Gap Hunting

**Why "spiral" not "loop":** A loop implies returning to the starting point. In AXIOM, each pass increases coverage - the canvas gets more colorful with each iteration.

```
Iteration 1: ████░░░░░░░░░░░░░░░░░░░░░░░░░░  10% colored
Iteration 2: ████████████░░░░░░░░░░░░░░░░░░  25% colored
Iteration 3: ████████████████████████████░░  80% colored
Iteration 4: ██████████████████████████████  100% colored (done!)
```

**Spiral steps:**
1. Scan spec for black/gaps
2. Prioritize next region (dependencies, user priority)
3. Process region → assign color (gray/orange/purple/blue/red)
4. Update annotations
5. Check exit conditions → repeat or proceed to implementation

---

### Completion Drive

**Definition:** The continuous iteration pattern where an agent works toward Task completion through multiple attempts, learning from verification failures.

**Also known as:** Execution Loop (see [07-execution.md](./07-execution.md))

**Why it matters:** Rather than single-shot execution, AXIOM agents iterate: attempt → verify → learn → retry. This mirrors human development where first attempts rarely succeed. The "drive" toward completion persists until verification passes or limits are reached.

**Iteration flow:**
```
Attempt → Verification fails → Agent learns from output → Retry
    ↓
Attempt → Verification passes → Complete
```

**Contrast:**
| Single-shot | Completion Drive |
|-------------|------------------|
| One attempt | Multiple iterations |
| Fail = failed | Fail = feedback |
| No learning | Progressive refinement |

---

## Workflow Phases

Three distinct phases that AXIOM progresses through:

| Phase | Persona | Purpose | Entry Condition |
|-------|---------|---------|-----------------|
| **Init** | Analyst Ava | First-time setup, configuration | No `.axiom/` directory |
| **Planning** | Architect Axel | Decompose need into cases | No ready Tasks |
| **Implementation** | Executor Echo (N parallel) | Execute Tasks | Has ready Tasks |

### Mode Routing

**Definition:** The decision logic that determines which workflow phase to enter.

```
axiom command → Check .axiom/ exists?
                     │
              No ────┴──── Yes
              ↓            ↓
           INIT      Check has cases?
                          │
                   No ────┴──── Yes
                   ↓            ↓
               PLANNING    IMPLEMENTATION
```

---

## The Case System

AXIOM's signature classification system for cases based on clarity and readiness level.

### Discovery Types (produce more cases)

| Color | Type | Meaning |
|-------|------|---------|
| ⬛ **Black** | Black Book | THE single spec document - all requirements consolidated here |
| ⬜ **Gray** | Draft | Undetailed, needs refinement |
| 🟧 **Orange** | Research | Requires investigation before proceeding |
| 🟪 **Purple** | Pending | Waiting for human decision |
| 🟥 **Red** | Deferred | Out of current scope, preserved for later |

**Note:** There is always exactly ONE Black Book (Black Book) per project. Multiple user requests are consolidated into this single document by Architect Axel.

### Implementation Types (produce code)

| Color | Type | Meaning |
|-------|------|---------|
| 🟦 **Blue** | Operation | A complete feature spanning all layers |
| 🟩 **Green** | Task | The smallest implementable unit |

### Knowledge Type (captures discoveries)

| Color | Type | Meaning |
|-------|------|---------|
| 🟡 **Yellow** | Discovery | Learning captured during implementation |

### Completed (Status, not Type)

**Completed** = Task with `status: done`. It represents completion, not a separate category.

**Why types instead of tags?** Types are:
- Mutually exclusive (a case can only be one type)
- Visually distinct in the Web UI
- Semantically meaningful (type conveys both category AND readiness)

See [13-reference.md](./13-reference.md#case-type-system) for the complete type and status reference tables.

---

## Case State Changes

### Transition

**Definition:** A case changes type but remains conceptually the same thing.

```
Draft "Auth system" → Research "Research auth options" → Operation "Clerk integration"
```

### Split

**Definition:** A case breaks into multiple distinct child cases.

```
Operation "Login flow" → Task "Clerk setup"
                       → Task "Login UI"
                       → Task "Session handling"
```

**Discovery Exception:** Discovery creation is neither transition nor split - it's a **byproduct** of Task execution via discovery signals.

---

## Core Infrastructure

### CaseStore

**Definition:** The native storage service for all cases across all 8 types.

**Not a task tracker:** Unlike traditional task management, CaseStore handles:
- Type transitions (Draft → Operation → Task)
- Lineage tracking (parent-child relationships)
- Discovery case lifecycle (active → outdated → archived)
- Event emission for UI updates
- JSONL persistence (`.axiom/cases.jsonl`)

**Why native, not external?** Single source of truth with real-time events and type-aware queries.

---

### Verification

**Definition:** Shell commands that must pass for a Task to be considered complete.

```json
{
  "verification": [
    "npm run test:run",
    "npm run typecheck",
    "npm run lint"
  ]
}
```

**Completion rule:** COMPLETE signal + ALL verification commands passing = case done.

---

### Agent Slot

**Definition:** An available execution slot for parallel agents.

**Configuration:** `agents.maxParallel` (default: 3)

**Behavior:**
- Semi-Auto: User manually fills slots
- Autopilot: System auto-fills available slots with ready Tasks

---

### Agent vs Persona (Terminology)

**Persona:** The role or type (Executor Echo, Analyst Ava). Describes capabilities and behavior.

**Agent:** A running instance of a persona (echo-001, ava-002). Has unique ID and state.

**Agent ID:** The unique identifier combining persona name and counter (echo-001).

**Usage guide:**
| Context | Use | Example |
|---------|-----|---------|
| Describing capabilities | Persona | "Echo implements Tasks" |
| Referring to running instance | Agent | "Agent echo-001 is working on task-042" |
| Multiple instances | Agents | "Three Echo agents running in parallel" |
| Configuration | Persona | "Configure Echo's prompt" |

---

### Workspace vs Worktree (Terminology)

**Workspace:** AXIOM's concept - the isolated environment where an agent works. User-facing term.

**Git Worktree:** The underlying implementation - Git's built-in feature for multiple working directories sharing one repository.

**Usage guide:**
| Context | Use | Example |
|---------|-----|---------|
| User documentation | Workspace | "Each agent has its own workspace" |
| Technical/implementation | Git worktree | "Implemented using git worktree" |
| Directory path | Workspace | ".workspaces/echo-001-task-042/" |
| Error messages | Both | "Workspace creation failed (git worktree error)" |

**Why git worktree?**
- Shares .git directory (disk efficient)
- Instant branch creation (no clone delay)
- Shared object database (fast operations)
- Clean isolation (no merge conflicts during parallel work)

---

### Checkpoint

**Definition:** The point between iterations where an agent can safely pause without losing work.

**When reached:**
- Current iteration response received
- Any commits completed
- State persisted

**Used for:** Graceful pause, mode switching, emergency stop.

---

## The Persona System

AXIOM uses named agents with alliterative names and distinct personalities. Unlike generic "Agent 1, Agent 2", each persona has a clear role and character.

### The Eight Personas

| Persona | Emoji | Role | When Active |
|---------|-------|------|-------------|
| **Analyst Ava** | 🔍 | Project analysis | Init mode |
| **Architect Axel** | 📊 | Planning spiral + Debrief | Planning, after Operation completion |
| **Executor Echo** | ⚙️ | Implementation | Task execution (N parallel) |
| **Resolver Rex** | 🔧 | Merge conflict resolution | On conflict |
| **Curator Cleo** | 💡 | Discovery extraction | After completion |
| **Director Dex** | 😎 | Orchestration | Always |
| **Monitor Max** | 👁️ | Health monitoring | Always (background) |
| **Auditor Ash** | 📈 | Metrics and ID assignment | Always (event-driven) |

See [05-agents.md](./05-agents.md#agent-personas) for detailed persona documentation including persona responsibilities and agent lifecycle.

### The Support Trio

**Cleo, Max, and Ash** form a unique support layer that no other multi-agent system has:
- **Cleo** captures institutional knowledge automatically
- **Max** monitors system health proactively
- **Ash** provides observability and accountability

**Contrast with competitors:**
| System | Learning | Health | Metrics |
|--------|----------|--------|---------|
| AXIOM | Cleo (dedicated) | Max (dedicated) | Ash (dedicated) |
| MetaGPT | None | None | Basic |
| CrewAI | None | None | Basic |
| Devin | Per-session | Timeout-based | Dashboard |

---

## Execution Patterns

### Execution Loop

**Definition:** The autopilot execution pattern where an agent continuously works until complete, with automatic retry and iteration tracking.

**Why "loop":** The agent loops through pick-execute-verify until no Tasks remain or intervention occurs.

**Characteristics:**
- Picks ready Task
- Executes until COMPLETE signal
- Retries with feedback on failure
- Tracks iteration count
- Continues to next case automatically

**The pattern:**
```
Pick Task → Execute → Signal?
                         │
              COMPLETE ──┼── BLOCKED/PENDING
                  ↓      │           ↓
            Verify OK?   │      Handle, pick next
                  │      │
            Yes ──┴── No │
             ↓        ↓  │
          Done    Retry  │
             │           │
             └───────────┴──→ Pick next Task
```

---

### Iteration

**Definition:** A single round-trip of agent work. One prompt, one response, one potential commit.

**Completion:** Requires BOTH the COMPLETE signal AND all verification commands passing.

---

### Stuck Detection

**Definition:** When an agent runs N iterations without producing a commit.

**Not an error:** Agent might be thinking. AXIOM warns but continues, allowing human intervention.

**Threshold:** Configurable via `completion.stuckThreshold` (default: 5).

---

## Operating Modes

### Semi-Auto Mode

**Definition:** User selects Tasks, agent completes one then stops.

**Use cases:**
- Learning a new codebase
- Critical changes requiring verification
- Step-by-step debugging

---

### Autopilot Mode

**Definition:** Fully autonomous execution until no ready Tasks remain.

**Safety features:**
- Checkpoint before starting
- Pause on PENDING signal
- Human can intervene anytime
- Error threshold pauses after N consecutive failures

---

## Signal Protocol

AXIOM's explicit agent-to-orchestrator communication system.

### Signal Format

```
<axiom>SIGNAL:payload</axiom>
```

### Core Signals

| Signal | Purpose | Example |
|--------|---------|---------|
| `COMPLETE` | Case finished | `<axiom>COMPLETE</axiom>` |
| `BLOCKED` | Cannot proceed | `<axiom>BLOCKED:Missing API key</axiom>` |
| `PENDING` | Human decision required | `<axiom>PENDING:Which auth provider?</axiom>` |
| `PROGRESS` | Status update | `<axiom>PROGRESS:75</axiom>` |
| `RESOLVED` | Conflict resolved (Rex) | `<axiom>RESOLVED</axiom>` |

### Discovery Signals

| Signal | Scope | Injected Into |
|--------|-------|---------------|
| `DISCOVERY_LOCAL` | Agent-specific | Same agent's future prompts |
| `DISCOVERY_GLOBAL` | Project-wide | All agents' prompts |

**Why explicit signals?** Unlike implicit completion detection (exit code, lack of errors), signals are:
- Unambiguous
- Machine-parseable
- Carry semantic meaning
- Support rich payloads

See [13-reference.md](./13-reference.md#signal-protocol) for the complete signal table.

---

## Discovery System

### Discovery Cases

**Definition:** First-class citizens in the CaseStore that capture learnings during implementation.

**Not just notes:** Discovery cases are:
- Linked to parent Task (lineage)
- Classified by impact (low/medium/high/critical)
- Injected into prompts automatically
- Archived when parent completes

---

### Discovery Log

**Definition:** A query view on global Discovery cases - not a separate file.

**Single source of truth:** All discoveries live in `cases.jsonl`, views are generated.

---

### Discovery Injection

**Definition:** Active Discovery cases are automatically included in agent prompts based on scope.

```
Global Discovery → All agents
Local Discovery → Only source agent
```

---

### Discovery Promotion

**Definition:** Converting a local Discovery case to global scope.

**When to promote:** A local discovery proves useful beyond its original context.

**Mechanism:** Update `metadata.scope` from `local` to `global` - same case ID, broader reach.

---

### Discovery Resurrection

**Definition:** Bringing an archived Discovery case back to active status.

**Use case:** A discovery from one Task is still relevant for future work.

**When allowed:** Only archived Discovery cases can be resurrected.

---

### Cross-Agent Propagation

**Definition:** How global Discovery cases spread to all active agents.

**Flow:**
1. Cleo creates global Discovery
2. Emits `case:discovery_created` event
3. Active agents notified via state machine
4. Next prompt includes new discovery
5. No agent restart required

---

## Integration System

### Conflict Classification

| Level | Resolution | Handler |
|-------|------------|---------|
| **SIMPLE** | Auto-resolve | System |
| **MEDIUM** | AI-assisted | Resolver Rex |
| **COMPLEX** | Human escalation | User |

---

### Integration Queue

**Definition:** FIFO queue of completed cases waiting for branch integration.

**Features:**
- Dependency-aware ordering
- Automatic retry
- Workspace cleanup on success

---

## Review vs Debrief

Two distinct systems that work together:

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| **Review** | Task completion | Human | Quality check |
| **Debrief** | Operation completion | Axel | Learn and update plan |

### Review Modes

| Mode | Behavior |
|------|----------|
| `per-task` | Review each immediately |
| `batch` | Collect and review later |
| `auto-approve` | Auto-approve if criteria met |
| `skip` | No review |

See [11-review.md](./11-review.md#review-modes) for review mode decision tree and configuration.

---

## Intervention System

### Intervention Panel

**Definition:** The Web UI component for controlling agents and managing state during execution.

**Actions available:**
- Pause/Resume all agents
- Stop specific agent
- Redirect agent to different case
- Create checkpoint
- Rollback to checkpoint

---

### Emergency Stop

**Definition:** The graceful shutdown triggered by `Ctrl+C`.

**Sequence:**
1. Stop accepting new cases
2. Signal agents to pause
3. Wait for checkpoints (5s timeout)
4. Persist state snapshot
5. Exit cleanly

**Second `Ctrl+C`:** Forces immediate exit without graceful shutdown.

---

### The Audit Trail

**Definition:** The recovery context injected into prompts when a crashed case is retried.

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

### Named Checkpoint

**Definition:** A named save point for rollback.

**Automatic triggers:**
- Periodic (every N completed cases)
- Before autopilot

---

## Hooks System

**Definition:** User-defined shell scripts that run at key lifecycle events.

### Available Hooks

| Hook | Trigger | Use Case |
|------|---------|----------|
| `pre-start` | Agent claims case | Setup, notifications |
| `post-complete` | Case done/failed | Slack notify, logging |
| `pre-merge` | Before merge attempt | Run E2E tests |
| `post-merge` | After successful merge | Deploy, notify |
| `on-conflict` | Merge conflict detected | Alert, custom resolution |
| `on-discovery` | Discovery extracted | External storage |
| `on-pause` | Session paused | Cleanup |
| `on-error` | Error occurred | Alerting |

**Location:** `.axiom/hooks/`

---

## Planning Phases

The 5-phase dialogue model (The Briefing):

| Phase | Name | Purpose | Metaphor |
|-------|------|---------|----------|
| 1 | **UNDERSTAND** | Q&A to clarify goal | Interview |
| 2 | **ANALYZE** | Explore codebase context | Investigation |
| 3 | **PROPOSE** | Present architecture for approval | Pitch |
| 4 | **DECOMPOSE** | Generate atomic cases | Blueprint |
| 5 | **VALIDATE** | Verify cases meet INVEST criteria | Quality Check |

---

## Unique Differentiators

### What AXIOM Does That Others Don't

| Feature | AXIOM | Industry |
|---------|-------|----------|
| **Named personas** | 8 with personalities | Generic "Agent N" |
| **Explicit signals** | `<axiom>SIGNAL</axiom>` | Implicit detection |
| **Discovery extraction** | Dedicated Cleo agent | None or manual |
| **Health monitoring** | Dedicated Max agent | Timeout-based |
| **Merge specialist** | Dedicated Rex agent | Manual or PR-based |
| **Case system** | 8 semantic types | Tags or statuses |
| **Emergent planning** | Cases produce cases | Fixed task lists |

### Industry-Aligned Terms

| Concept | AXIOM Term | Industry Term |
|---------|------------|---------------|
| Isolated execution | Workspace | Worktree/VM/Sandbox |
| Unit of work | Task | Task |
| Save point | Checkpoint | Checkpoint/Snapshot |
| Full autonomy | Autopilot | Autonomous |
| Quality checks | Verification | CI/Validation |

---

## Branded Concepts

### The Case Spectrum

**Definition:** AXIOM's type-based case classification system as a whole.

**Components:**
- 8 distinct types with semantic meaning
- Visual representation in Web UI
- State machine for transitions

**Why "spectrum":** Cases exist across a spectrum from abstract (Black Book) to concrete (Task), each type representing a different state of clarity and readiness.

---

### The Type Cascade

**Definition:** The natural flow of cases from abstract (Black Book) to concrete (Task).

```
⬛ → ⬜ → 🟦 → 🟩 → ✓
Black Book → Draft → Operation → Task → Done
```

**Branches:**
- 🟧 Research (investigation detour)
- 🟪 Pending (decision gate)
- 🟥 Deferred (scope exit)
- 🟡 Discovery (knowledge capture)

---

### The Knowledge Base (Discovery System)

**Definition:** The collective intelligence formed by all Discovery cases - project-wide learnings that accumulate over time.

**Two perspectives:**
- **The Knowledge Base** (conceptual): The living, growing collective knowledge
- **Discovery Log** (technical): The query view on global Discovery cases (`discoveries.md`)

**Characteristics:**
- Grows with each completed Task
- Injected into all agent prompts
- Survives across sessions
- Self-maintaining (outdated detection)

---

### Signal Pulse

**Definition:** An agent's communication via the signal protocol.

**Pulse types:**
- **Heartbeat:** PROGRESS signals (agent is alive)
- **Completion:** COMPLETE signal (work done)
- **Alert:** BLOCKED, PENDING (attention needed)
- **Discovery:** DISCOVERY_* (knowledge captured)

---

### Workspace Colony

**Definition:** The collection of git workspaces where parallel agents operate.

```
.workspaces/
├── echo-001-case-042/   ← Agent echo-001's workspace
├── echo-002-case-043/   ← Agent echo-002's workspace
└── rex-001-merge/       ← Rex's merge workspace
```

**Colony rules:**
- One workspace per active agent
- Isolation guarantees no conflicts during work
- Cleanup after successful merge

---

### The Briefing

**Definition:** The guided setup experience with Analyst Ava for first-time projects.

**Flow:**
```
Welcome Screen → Meet the Team (optional) → Ava Analysis → Auto-Scaffold
```

**What Ava does:**
- Detects project type and structure
- Suggests verification commands
- Creates `.axiom/` directory
- Transitions to Planning Mode

---

### The Planning Dialogue

**Definition:** The 5-phase conversation between Architect Axel and the user.

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
One Operation = One user-facing capability
             = Schema + API + UI
             = Testable in isolation
```

**Anti-pattern (Horizontal):**
```
"Build all schemas" → "Build all APIs" → "Build all UI"
```

---

### Case Lineage

**Definition:** The parent-child relationship between cases.

```
Black Book (THE spec - all requirements)
└── Draft (Plan section)
    └── Operation (Feature)
        ├── Task (Unit 1)
        │   └── Discovery (Learning)
        ├── Task (Unit 2)
        └── Task (Unit 3)
```

**Lineage enables:**
- Traceability (why does this Task exist?)
- Debrief (what did we learn from this Operation?)
- Impact analysis (what depends on this?)

---

## Quick Reference

### JTBD Format (Black Book)

The Black Book uses JTBD (Jobs To Be Done) format for each requirement:

```
"When [situation], I want [motivation], so that [outcome]."
```

**Multiple JTBDs in one Black Book:**
```markdown
# The Black Book

## Requirements

### 1. User Authentication [P0]
When I visit the app, I want to login securely, so that my data is protected.

### 2. Dark Mode [P1]
When I use the app at night, I want dark mode, so that it's easier on my eyes.

### 3. Performance [P2]
When I navigate between pages, I want fast load times, so that I don't get frustrated.
```

### INVEST Criteria (Task)

- **I**ndependent: Can be done without waiting
- **N**egotiable: Details flexible
- **V**aluable: Produces value alone
- **E**stimable: Size can be estimated
- **S**mall: One session
- **T**estable: Has acceptance criteria

### Vertical Slice (Operation)

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
| 04 | Cases | Case System, CaseStore |
| 05 | Agents | Personas, Prompt Construction |
| 06 | Integration | Integration Service |
| 07 | Execution | Execution Loop, Sprint |
| 08 | Discovery | Discovery System |
| 09 | Intervention | Intervention, Rollback |
| 10 | Interface | Web UI components |
| 11 | Review | Review and Debrief |
| 12 | Hooks | Hooks System (lifecycle scripts) |
| 13 | Reference | Quick reference |
| 14 | Prompts | Default persona prompts |
| 15 | Errors | Error handling |
| **16** | **Glossary** | **Terminology reference** |
