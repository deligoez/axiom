# Operating Modes

AXIOM has three workflow phases and two operating modes that control Task assignment and execution.

---

## Mode Routing

```
axiom command
     │
     ▼
┌─────────────────┐
│ Check .axiom/   │
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
     ▼              │ has Tasks?│
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

---

## Init Mode

Init Mode runs only for first-time projects (no `.axiom/` directory). Analyst Ava guides the user through project setup in a conversational interface.

### Prerequisites Check

Before Init Mode starts, AXIOM validates system requirements:

```
axiom command
     │
     ▼
┌─────────────────────┐
│  Prerequisites      │
│  Check              │
└──────────┬──────────┘
           │
     ┌─────┴─────┐     ┌─────────────────────────────┐
     │ Git repo? │──No─►│ Error: PREREQ_NO_GIT        │
     └─────┬─────┘     │ "Not a git repository"      │
           │Yes        │ Run: git init               │
           ▼           └─────────────────────────────┘
     ┌─────────────┐   ┌─────────────────────────────┐
     │ Clean work- │─No─►│ Warning: PREREQ_DIRTY_WORKDIR│
     │ ing dir?    │   │ (continues if allowed)      │
     └─────┬───────┘   └─────────────────────────────┘
           │Yes/Allowed
           ▼
     ┌─────────────┐   ┌─────────────────────────────┐
     │ Claude CLI? │─No─►│ Error: PREREQ_NO_CLAUDE     │
     └─────┬───────┘   │ "Claude CLI not found"      │
           │Yes        │ Install: brew install claude │
           ▼           └─────────────────────────────┘
     ┌─────────────┐   ┌─────────────────────────────┐
     │ Disk space? │─No─►│ Error: PREREQ_DISK_LOW      │
     │ (>500MB)    │   │ "Insufficient disk space"   │
     └─────┬───────┘   │ Need 500MB free             │
           │Yes        └─────────────────────────────┘
           ▼
     ┌─────────────┐   ┌─────────────────────────────┐
     │ Permissions?│─No─►│ Error: PREREQ_NO_WRITE      │
     │ (writable)  │   │ "Directory not writable"    │
     └─────┬───────┘   └─────────────────────────────┘
           │Yes
           ▼
     ┌─────────────┐
     │ Init Mode   │
     │ continues   │
     └─────────────┘
```

#### Git Repository Requirement

AXIOM requires a git repository for:
- Agent workspace isolation (git worktrees)
- Branch-per-task workflow
- Integration queue management
- Checkpoint and rollback

**Error:** `PREREQ_NO_GIT`
```
Error: Not a git repository

AXIOM requires a git repository for workspace isolation.
Initialize one with: git init
```

#### Clean Working Directory Check

AXIOM checks for uncommitted changes before starting. This helps prevent conflicts between agent work and local changes.

**Check:** `git status --porcelain`

**Warning:** `PREREQ_DIRTY_WORKDIR`
```
Warning: Uncommitted changes detected

You have uncommitted changes in your working directory:
  modified:   src/app.ts
  untracked:  temp.log

Options:
  [c] Continue anyway (changes may conflict with agent work)
  [s] Stash changes (git stash push -m "axiom-pre-init")
  [q] Quit and handle manually

Recommendation: Commit or stash changes before starting AXIOM.
```

**Config:**
| Option | Default | Behavior |
|--------|---------|----------|
| `init.allowDirtyWorkdir` | true | Allow continuing with uncommitted changes |
| `init.warnDirtyWorkdir` | true | Show warning dialog (if allowed) |

When `allowDirtyWorkdir: false`, AXIOM refuses to start:
```
Error: Uncommitted changes detected

AXIOM cannot start with uncommitted changes.
Commit your work:  git add . && git commit -m "WIP"
Or stash:          git stash push -m "pre-axiom"
Or configure:      "init.allowDirtyWorkdir": true
```

#### Claude CLI Requirement

AXIOM spawns Claude CLI agents for task execution.

**Check:** `which claude` or `claude --version`

**Error:** `PREREQ_NO_CLAUDE`
```
Error: Claude CLI not found

AXIOM requires Claude CLI to spawn agents.
Install with: brew install claude
         or: npm install -g @anthropic/claude-cli
```

#### Disk Space Requirement

Each agent workspace requires ~50-100MB. With 3 parallel agents plus overhead:

| Component | Space Required |
|-----------|---------------|
| `.axiom/` directory | ~10MB |
| Per-agent workspace | ~50-100MB |
| Git objects (shared) | ~50MB |
| Safety buffer | ~200MB |
| **Minimum total** | **500MB** |

**Warning at:** 90% disk usage
**Error at:** 95% disk usage or <500MB free

**Error:** `PREREQ_DISK_LOW`
```
Error: Insufficient disk space

AXIOM requires at least 500MB free disk space.
Current free: 234MB
Suggestion: Clean up with: git gc --prune=now
```

#### Write Permission Requirement

AXIOM needs write access to create `.axiom/` directory and workspaces.

**Error:** `PREREQ_NO_WRITE`
```
Error: Directory not writable

AXIOM cannot create .axiom/ directory.
Check permissions: ls -la .
```

See [15-errors.md](./15-errors.md#prerequisite-errors) for complete prerequisite error reference.

### Init Flow

```
Step 1: Welcome Screen
    │
    ├─► [M] Meet the Team ──► Step 2: Show Personas ──► Step 3
    │
    └─► [Enter] Skip ──► Step 3: Ava Briefing
                              │
                              ▼
                         Step 4: Complete (Auto-scaffold)
                              │
                              ▼
                         Planning Mode
```

### Step 1: Welcome Screen

Introduces AXIOM and explains what will happen:
- Ava will analyze project structure
- Configure verification commands
- Set up `.axiom/` directory
- Options: `[M]` Meet the Team, `[Enter]` Start

### Step 2: Meet the Team (Optional)

Carousel showing all 8 agent personas:
- Navigate with arrow keys
- Shows emoji, name, role, responsibilities
- Press Enter to continue to init

### Step 3: Ava Briefing

Conversational chat interface with Ava:

```
┌─────────────────────────────────────────────────────────────────┐
│                   🔍 AVA - Analyst                              │
│                                                                 │
│  Analyzing your project...                                      │
│                                                                 │
│  ✓ Detected: Node.js + TypeScript                              │
│  ✓ Found: Vitest with 47 test files                            │
│  ✓ Found: Biome for linting                                    │
│                                                                 │
│  ┌─ Verification Commands ───────────────────────────────┐     │
│  │ test:      npm run test:run                            │    │
│  │ typecheck: npm run typecheck                           │    │
│  │ lint:      npm run lint                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Would you like to customize these, or proceed with setup?      │
└─────────────────────────────────────────────────────────────────┘
```

User can:
- Press Enter to accept defaults
- Type to customize (e.g., "add knip command")
- Ava responds conversationally and updates

### Step 4: Auto-Scaffold

When user accepts, Ava creates `.axiom/` directory immediately (no confirmation dialog):

```
Created .axiom/ directory:

├── config.json              Configuration
├── cases.jsonl              Case database (empty)
├── planning-state.json      Mode/planning state
├── rules/                   Shared agent rules (4 files)
├── agents/                  Agent personas (8 agents)
│   ├── ava/                 🔍 Analyst Ava
│   ├── echo/                ⚙️ Executor Echo
│   ├── axel/                📊 Architect Axel
│   ├── rex/                 🔧 Resolver Rex
│   ├── cleo/                💡 Curator Cleo
│   ├── dex/                 😎 Director Dex
│   ├── max/                 👁️ Monitor Max
│   └── ash/                 📈 Auditor Ash
└── templates/               Scratchpad template
```

Transitions to Planning Mode after scaffold complete.

---

## Planning Mode

Chat interface with Architect Axel for case decomposition. Uses the Planning Dialogue Model (5 phases).

See [03-planning.md](./03-planning.md) for detailed Planning Dialogue Model.

---

## Implementation Mode

After planning completes, AXIOM enters Implementation Mode with two sub-modes:

---

## Semi-Auto Mode (Default)

User maintains control over Task assignment.

### Workflow

1. View Tasks in Task Panel
2. Select Task and assign to an agent
3. Watch agent work in Agent Grid
4. Agent completes, outputs `<axiom>COMPLETE</axiom>`
5. Task marked done, agent stops
6. User decides next action

### Signal Handling

| Event | Behavior |
|-------|----------|
| Agent completes Task | Task done, agent stops, user selects next |
| Agent signals BLOCKED | Task marked blocked, agent stops |
| Agent signals PENDING | Agent pauses, user notified |
| Agent times out | Task marked timeout, agent stops |

### Use Cases

- Learning a new codebase
- Critical changes requiring verification
- Step-by-step debugging
- Training and demonstrations

---

## Autopilot Mode

Fully autonomous execution until all ready Tasks complete.

### Workflow

1. Get ready Tasks from CaseStore
2. Fill available agent slots with Tasks
3. On agent completion:
   - Queue branch for merge
   - Mark Task done
   - Pick next ready Task
4. Continue until no ready Tasks remain

### Signal Handling

| Event | Behavior |
|-------|----------|
| Agent completes Task | Task done, merge queued, next Task assigned |
| Agent signals BLOCKED | Task stays blocked, agent picks different Task |
| Agent signals PENDING | Alert user, agent pauses, others continue |
| Agent times out | Task marked timeout, agent picks next Task |

### Use Cases

- Overnight batch processing
- Well-defined Task queues
- High confidence changes with good test coverage
- Post-planning execution

### Incremental Planning in Autopilot

When ready Task count drops below threshold during autopilot, behavior depends on `planning.autopilotBehavior`:

| Behavior | Effect |
|----------|--------|
| `pause` | Pause autopilot, wait for user to run planning |
| `background` | Axel plans in parallel while agents work |
| `skip` | Finish remaining Tasks, stop when empty |

See [03-planning.md](./03-planning.md#incremental-planning-in-autopilot-mode) for details.

---

## Mode Switching

Mode can be toggled via Web UI. Confirmation dialogs prevent accidental switches.

### Switching to Autopilot

Shows:
- Number of ready Tasks
- Max parallel agents
- Warning about automatic assignment

### Switching to Semi-Auto

Shows:
- Currently running agents
- Notice that running agents will finish current Tasks
- Notice that new agents won't auto-start

---

## Mode Comparison

| Feature | Semi-Auto | Autopilot |
|---------|-----------|-----------|
| Task selection | User picks | Automatic (intelligent) |
| Agent spawn | Manual | On slot available |
| After completion | Agent stops | Picks next Task |
| Parallel agents | Yes (user spawns each) | Yes (auto-fills slots) |
| Human intervention | Always available | Available (pauses that agent) |

---

## Mode State Hierarchy

| Location | Field | Purpose | Precedence |
|----------|-------|---------|------------|
| `planning-state.json` | `chosenMode` | User's choice after planning | 1 (highest) |
| `state/snapshot.json` | `context.mode` | Runtime mode | 2 |
| `config.json` | `mode` | Project default | 3 (lowest) |

### Resolution Flow

1. If `planning-state.json` has `chosenMode` → use that
2. Else if `state/snapshot.json` has `context.mode` → use that
3. Else use `config.json` default

---

## Safety Limits

Both modes respect safety limits:

| Limit | Default | Config Path |
|-------|---------|-------------|
| Max parallel agents | 3 | `agents.maxParallel` |
| Task timeout | 30 min | `agents.timeoutMinutes` |
| Max iterations | 50 | `completion.maxIterations` |
| Stuck threshold | 5 | `completion.stuckThreshold` |
| Error threshold | 3 | Consecutive errors pause autopilot |
