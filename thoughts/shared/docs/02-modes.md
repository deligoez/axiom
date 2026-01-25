# Operating Modes

Swarm has three workflow phases and two operating modes that control idea assignment and execution.

---

## Mode Routing

```
swarm command
     │
     ▼
┌─────────────────┐
│ Check .swarm/  │
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
     ▼              │ has ideas?│
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

Init Mode runs only for first-time projects (no `.swarm/` directory). Analyzer Ace guides the user through project setup in a conversational interface.

### Init Flow

```
Step 1: Welcome Screen
    │
    ├─► [M] Meet the Team ──► Step 2: Show Personas ──► Step 3
    │
    └─► [Enter] Skip ──► Step 3: Ace Init Process
                              │
                              ▼
                         Step 4: Complete (Auto-scaffold)
                              │
                              ▼
                         Planning Mode
```

### Step 1: Welcome Screen

Introduces Swarm and explains what will happen:
- Ace will analyze project structure
- Configure quality commands
- Set up `.swarm/` directory
- Options: `[M]` Meet the Team, `[Enter]` Start

### Step 2: Meet the Team (Optional)

Carousel showing all 8 agent personas:
- Navigate with arrow keys
- Shows emoji, name, role, responsibilities
- Press Enter to continue to init

### Step 3: Ace Init Process

Conversational chat interface with Ace:

```
┌─────────────────────────────────────────────────────────────────┐
│                   🔍 ACE - Project Analyzer                     │
│                                                                 │
│  Analyzing your project...                                      │
│                                                                 │
│  ✓ Detected: Node.js + TypeScript                              │
│  ✓ Found: Vitest with 47 test files                            │
│  ✓ Found: Biome for linting                                    │
│                                                                 │
│  ┌─ Quality Commands ─────────────────────────────────────┐    │
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
- Ace responds conversationally and updates

### Step 4: Auto-Scaffold

When user accepts, Ace creates `.swarm/` directory immediately (no confirmation dialog):

```
Created .swarm/ directory:

├── config.json              Configuration
├── ideas.jsonl              Idea database (empty)
├── planning-state.json      Mode/planning state
├── rules/                   Shared agent rules (4 files)
├── agents/                  Agent personas (8 agents)
│   ├── ace/                 🔍 Analyzer Ace
│   ├── ed/                  ⚙️ Engineer Ed
│   ├── pat/                 📊 Planner Pat
│   ├── finn/                🔧 Fixer Finn
│   ├── lou/                 💡 Logger Lou
│   ├── dan/                 😎 Director Dan
│   ├── will/                👁️ Watcher Will
│   └── carl/                📈 Counter Carl
└── templates/               Scratchpad template
```

Transitions to Planning Mode after scaffold complete.

---

## Planning Mode

Chat interface with Planner Pat for idea decomposition. Uses the Planning Dialogue Model (5 phases).

See [03-planning.md](./03-planning.md) for detailed Planning Dialogue Model.

---

## Implementation Mode

After planning completes, Swarm enters Implementation Mode with two sub-modes:

---

## Semi-Auto Mode (Default)

User maintains control over idea assignment.

### Workflow

1. View ideas in Idea Panel
2. Select idea and assign to an agent
3. Watch agent work in Agent Grid
4. Agent completes, outputs `<swarm>COMPLETE</swarm>`
5. Idea marked done, agent stops
6. User decides next action

### Signal Handling

| Event | Behavior |
|-------|----------|
| Agent completes idea | Idea done, agent stops, user selects next |
| Agent signals BLOCKED | Idea marked blocked, agent stops |
| Agent signals NEEDS_HUMAN | Agent pauses, user notified |
| Agent times out | Idea marked timeout, agent stops |

### Use Cases

- Learning a new codebase
- Critical changes requiring verification
- Step-by-step debugging
- Training and demonstrations

---

## Autopilot Mode

Fully autonomous execution until all ready ideas complete.

### Workflow

1. Get ready ideas from IdeaStore
2. Fill available agent slots with ideas
3. On agent completion:
   - Queue branch for merge
   - Mark idea done
   - Pick next ready idea
4. Continue until no ready ideas remain

### Signal Handling

| Event | Behavior |
|-------|----------|
| Agent completes idea | Idea done, merge queued, next idea assigned |
| Agent signals BLOCKED | Idea stays blocked, agent picks different idea |
| Agent signals NEEDS_HUMAN | Alert user, agent pauses, others continue |
| Agent times out | Idea marked timeout, agent picks next idea |

### Use Cases

- Overnight batch processing
- Well-defined idea queues
- High confidence changes with good test coverage
- Post-planning execution

---

## Mode Switching

Mode can be toggled via Web UI. Confirmation dialogs prevent accidental switches.

### Switching to Autopilot

Shows:
- Number of ready ideas
- Max parallel agents
- Warning about automatic assignment

### Switching to Semi-Auto

Shows:
- Currently running agents
- Notice that running agents will finish current ideas
- Notice that new agents won't auto-start

---

## Mode Comparison

| Feature | Semi-Auto | Autopilot |
|---------|-----------|-----------|
| Idea selection | User picks | Automatic (intelligent) |
| Agent spawn | Manual | On slot available |
| After completion | Agent stops | Picks next idea |
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
| Idea timeout | 30 min | `agents.timeoutMinutes` |
| Max iterations | 50 | `completion.maxIterations` |
| Stuck threshold | 5 | `completion.stuckThreshold` |
| Error threshold | 3 | Consecutive errors pause autopilot |
