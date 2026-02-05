# Quick Reference

Summary of key concepts and configurations.

---

## Case Type System

### Discovery Cases (produce more cases)

| Type | Symbol | Name | Description |
|------|--------|------|-------------|
| Black Book | `■` | ⬛ | Raw need (JTBD/PRD) |
| Draft | `□` | ⬜ | Plan draft |
| Research | `◆` | 🟧 | Research needed |
| Pending | `◇` | 🟪 | Decision pending |
| Deferred | `▣` | 🟥 | Deferred |

### Implementation Cases (produce code)

| Type | Symbol | Name | Description |
|------|--------|------|-------------|
| Operation | `▢` | 🟦 | Feature (vertical slice) |
| Task | `▤` | 🟩 | Atomic case |

**Done** = Task with `status: done` (completed). Done is a status, not a type.

### Knowledge Cases (capture learnings)

| Type | Symbol | Name | Description |
|------|--------|------|-------------|
| Discovery | `●` | 🟡 | Learning/Discovery |

---

## Case Statuses

### Universal Statuses

| Status | Symbol | Description |
|--------|--------|-------------|
| `pending` | `→` | Ready |
| `active` | `●` | Running |
| `done` | `✓` | Completed |
| `blocked` | `⊗` | Blocked |

### Task-Specific

| Status | Symbol | Description |
|--------|--------|-------------|
| `failed` | `✗` | Agent error |
| `timeout` | `⏱` | Timed out |
| `review` | `◐` | Awaiting review |

### Discovery-Specific

| Status | Symbol | Description |
|--------|--------|-------------|
| `active` | `●` | Valid, injected into prompts |
| `outdated` | `⚠` | Needs verification |
| `archived` | `◌` | Parent Task done |

---

## Agent Personas

| Persona | Emoji | Role |
|---------|-------|------|
| Analyst Ava | 🔍 | Project analysis |
| Architect Axel | 📊 | Planning spiral + Debrief |
| Executor Echo | ⚙️ | Implementation |
| Resolver Rex | 🔧 | Conflict resolution |
| Curator Cleo | 💡 | Discovery extraction |
| Director Dex | 😎 | Orchestration |
| Monitor Max | 👁️ | Health monitoring |
| Auditor Ash | 📈 | Metrics |

See [05-agents.md](./05-agents.md#agent-personas) for detailed persona documentation.

---

## Signal Protocol

```
<axiom>SIGNAL</axiom>
<axiom>SIGNAL:payload</axiom>
```

| Signal | Payload | Purpose |
|--------|---------|---------|
| `COMPLETE` | none | Task done |
| `BLOCKED` | reason | Cannot proceed |
| `PENDING` | reason | Human intervention required |
| `PROGRESS` | 0-100 | Progress update |
| `RESOLVED` | none | Merge conflict resolved (Rex) |
| `DISCOVERY_LOCAL` | content | Creates Discovery case (scope: local) |
| `DISCOVERY_GLOBAL` | content | Creates Discovery case (scope: global) |

---

## Configuration Quick Reference

```json
{
  "mode": "semi-auto",
  "agents": { "maxParallel": 3, "timeoutMinutes": 30 },
  "completion": { "maxIterations": 50, "stuckThreshold": 5 },
  "verification": ["npm test", "npm run typecheck"],
  "review": { "defaultMode": "batch" },
  "merge": { "autoMerge": true, "conflictRetries": 3 }
}
```

---

## Directory Structure

```
.axiom/
├── config.json              # Configuration
├── cases.jsonl              # Cases (all types incl. Discovery)
├── planning-state.json      # State
├── discoveries.md           # View: global Discovery cases
├── state/
│   ├── snapshot.json        # State machine snapshot
│   └── events.jsonl         # Event log
├── agents/{persona}/
│   ├── prompt.md
│   ├── rules.md
│   ├── discoveries.md       # View: local Discovery cases
│   └── logs/
├── checkpoints/             # Saved states
├── feedback/                # Review feedback
├── sprints.jsonl            # Sprint statistics
├── hooks/                   # Lifecycle hooks
├── reviews/                 # Review history
└── metrics/                 # Statistics
```

Note: `discoveries.md` files are **views** generated from Discovery cases in `cases.jsonl`, not primary storage.

---

## Conflict Classification

| Level | Resolution |
|-------|------------|
| SIMPLE | Auto-resolve |
| MEDIUM | Resolver Rex |
| COMPLEX | Human escalation |

---

## Operating Modes

| Mode | Task Selection | After Complete |
|------|----------------|----------------|
| Semi-Auto | User picks | Agent stops |
| Autopilot | Automatic | Pick next |

---

## Review vs Debrief

| System | Trigger | Actor | Purpose |
|--------|---------|-------|---------|
| Review | Task done | Human | Approve/reject |
| Debrief | Operation done | Axel | Learn, update plan |

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
| `AXIOM_MODE` | mode |
| `AXIOM_MAX_AGENTS` | agents.maxParallel |
| `AXIOM_MODEL` | agents.defaultModel |
| `AXIOM_NON_INTERACTIVE` | Non-interactive mode (true/false) |
| `AXIOM_TIMEOUT` | agents.timeoutMinutes |

**Naming convention:** Environment variables use `AXIOM_` prefix with descriptive names. Config fields use nested JSON paths. The mapping above shows equivalences.

---

## Workflow Phases

```
Briefing → Planning → Implementation
  │          │            │
  ▼          ▼            ▼
 Ava       Axel         Echo
         (spiral)      (Tasks)
            │
            ▼
        Debrief
      (after Operation)
```

---

## Server Architecture

```
AXIOM Server
├── Orchestrator Service
├── Integration Queue Service
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
| `PLAN_APPROVED` | cases | Plan approved, cases created |
| `TRIGGER_PLANNING` | - | Start incremental planning |
| `SPAWN_AGENT` | taskId | Request agent spawn |
| `STOP_AGENT` | agentId | Stop running agent |
| `AGENT_COMPLETED` | agentId, result | Agent finished Task |
| `AGENT_FAILED` | agentId, error | Agent error |
| `AGENT_BLOCKED` | agentId, reason | Agent blocked |
| `PAUSE` | - | Pause orchestration |
| `RESUME` | - | Resume orchestration |
| `SET_MODE` | mode | Switch semi-auto/autopilot |

### Integration Queue Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ENQUEUE_MERGE` | taskId, branch | Queue for merge |
| `MERGE_COMPLETED` | taskId | Successfully merged |
| `MERGE_CONFLICT` | taskId, level | Conflict detected |

### Agent Lifecycle Events

| Event | Payload | Description |
|-------|---------|-------------|
| `START` | - | Begin execution |
| `READY` | - | Workspace prepared |
| `ITERATION_DONE` | signal? | Iteration complete |
| `ALL_PASS` | - | Verification checks passed |
| `RETRY` | - | Retry iteration |
| `BLOCKED` | reason | Cannot proceed |
| `COMPLETE` | - | Task done |
| `FAIL` | error | Error occurred |
| `TIMEOUT` | - | Timed out |
| `STOP` | - | Force stop |

---

## CLI Usage

```bash
# Start AXIOM server (opens browser automatically)
axiom

# Options
axiom --port 8080           # Custom port
axiom --no-open             # Don't open browser
axiom --non-interactive     # Non-interactive mode (for CI/scripts)
axiom --mode autopilot      # Override mode
axiom --version             # Show version
axiom --help                # Show help
```

The CLI is minimal - just start the server. All interaction happens via Web UI.

### Non-Interactive Mode

For CI pipelines and automated scripts, use `--non-interactive`:

```bash
axiom --non-interactive --mode autopilot
```

**Behavior changes in non-interactive mode:**

| Scenario | Interactive | Non-Interactive |
|----------|-------------|-----------------|
| Corrupted config | Prompt user for recovery option | Try backup, then use defaults |
| Planning crash | Prompt for Resume/StartOver/Keep | Auto-decide based on progress |
| Human escalation | Wait for user input | Defer/skip based on config |
| Low disk space | Prompt for cleanup options | Auto-cleanup or stop |
| Plan approval | Wait for user approval | Use `autoApprove` config |

**Environment detection:** AXIOM auto-detects CI environments (`CI=true`, `GITHUB_ACTIONS`, `GITLAB_CI`, etc.) and enables non-interactive mode automatically.

**Config override:** Set `AXIOM_NON_INTERACTIVE=true` environment variable as alternative to CLI flag.

---

## Verification Commands

| Project | Commands |
|---------|----------|
| Node.js | `npm test`, `npm run typecheck`, `npm run lint` |
| Python | `pytest`, `mypy .`, `ruff check .` |
| Go | `go test ./...`, `go vet ./...` |

---

## Sprint Targets

| Target | Description |
|--------|-------------|
| `count` | Run N Tasks |
| `duration` | Run for N hours |
| `until_time` | Run until time |
| `no_ready` | Run until no ready Tasks |

---

## Crash Recovery

1. Load State machine snapshot
2. If invalid, replay events
3. Reset orphaned Tasks to pending
4. Resume operation

---

## Refinement Chain

```
Black Book (THE Spec)
     │
     └── SPLIT → Draft (Plan Drafts)
                      │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    Research     Pending     Operation
                              (Feature)
         │           │           │
         └─────┬─────┘           │
               │                 │
               └────► Draft ────┘
                         │
                         └── SPLIT → Operation (Features)
                                          │
                                          └── SPLIT → Task (Atomic)
                                                           │
                                                    ┌──────┴──────┐
                                                    │             │
                                                    ▼             ▼
                                            status: done    Discovery
                                             (Done)        (Learning)
```

Discovery cases are **byproducts** of Task execution, not refinement steps.

---

## Two Types of State Changes

| Change Type | When | Example |
|-------------|------|---------|
| Transition | Case refines but stays one thing | Draft → Research → Operation |
| Split | Case breaks into multiple things | Operation → [Task, Task, Task] |

Note: Discovery creation is neither transition nor split - it's a **byproduct** of Task execution via discovery signals.
