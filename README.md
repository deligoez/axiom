# Chorus

> Unified TUI for multi-agent development orchestration

Chorus is an Ink-based (React for CLI) terminal UI that orchestrates multiple AI coding agents working on a shared codebase. Think of it as a control center for your AI pair programmers.

![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/tests-2774%20passing-success)

## Features

### Operating Modes

| Mode | Description |
|------|-------------|
| **Semi-auto** | User-controlled task assignment and review (default) |
| **Autopilot** | Fully autonomous Ralph Loop pattern - agents work continuously |
| **Planning** | Incremental task planning with Ralph pattern |

### Ralph Loop Pattern

The Ralph Loop is an autonomous execution pattern used in both Autopilot and Planning modes:

```
┌─────────────────────────────────────────────────┐
│                 RALPH LOOP                       │
│                                                  │
│   ┌──────┐    ┌────────┐    ┌──────────┐       │
│   │ Idle │───▶│ Active │───▶│ Complete │       │
│   └──────┘    └────────┘    └──────────┘       │
│       ▲           │              │              │
│       │           ▼              │              │
│       │      ┌────────┐          │              │
│       └──────│ Paused │◀─────────┘              │
│              └────────┘                         │
│                                                  │
│   Features:                                      │
│   • Error threshold monitoring                   │
│   • Stuck agent detection                        │
│   • Disk space monitoring                        │
│   • Automatic task assignment                    │
└─────────────────────────────────────────────────┘
```

### Visual Orchestration

- Real-time tiling view of all agents
- Configurable grid layout (1-4 agents per row)
- Fullscreen mode for single agent focus
- Live output streaming with progress indicators

### Agent Personas

| Persona | Role | Description |
|---------|------|-------------|
| **Sage** | Analyzer | Project structure analysis, configuration detection |
| **Chip** | Implementer | TDD implementation, feature development |
| **Archie** | Architect | Task decomposition, dependency planning |
| **Patch** | Fixer | Bug fixes, merge conflict resolution |
| **Scout** | Explorer | Task selection, prioritization heuristics |
| **Echo** | Reviewer | Code review, learning extraction |

### Memory System

- **Per-agent learnings**: Each persona stores insights in `.chorus/agents/{persona}/learnings.md`
- **Cross-agent propagation**: Learnings shared across agents
- **Deduplication**: Jaccard similarity (0.85 threshold) prevents duplicates
- **Scope filtering**: LOCAL, CROSS-CUTTING, ARCHITECTURAL categories

### Review System

- **Single task review** (R01): Review individual completed tasks
- **Batch review** (R02): Review multiple tasks at once
- **Feedback loop** (R03): Redo with specific feedback
- **Auto-approve** (R04): Automatic approval when quality checks pass

### Intervention Controls

| Feature | Description |
|---------|-------------|
| **Pause/Resume** | Temporarily halt all agents |
| **Rollback** | Revert to previous checkpoint |
| **Redirect** | Change agent's current task |
| **Stop** | Terminate specific agent |

### Sprint Planning

- Configure iteration goals and agent limits
- Track sprint progress with visual indicators
- Auto-complete when target reached

### Crash Recovery

- XState snapshot persistence
- Event sourcing fallback
- Automatic session recovery on restart
- Worktree state preservation

## Installation

```bash
# Clone the repository
git clone https://github.com/deligoez/chorus.git
cd chorus

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

### Requirements

- Node.js >= 20.0.0
- [Claude CLI](https://claude.ai/cli) installed and configured
- Git (for worktree management)

## Quick Start

```bash
# Start Chorus in your project directory
cd your-project
chorus

# Or specify a mode
chorus --mode semi-auto    # User-controlled (default)
chorus --mode autopilot    # Fully autonomous Ralph Loop
```

### First Run

On first run, Chorus will:
1. Detect your project type (TypeScript, Python, etc.)
2. Suggest quality commands (test, lint, typecheck)
3. Create a `.chorus/` directory for configuration and state
4. Show agent introduction screen

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CHORUS ROOT MACHINE                    │
│                     (XState v5 Actor)                    │
├─────────────────────────────────────────────────────────┤
│  orchestration │ mergeQueue │ ralphLoop │     TUI       │
├─────────────────────────────────────────────────────────┤
│              SPAWNED CHILD ACTORS: AgentMachine × n     │
└─────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **Orchestrator** | Manages agent lifecycle and task assignment |
| **SlotManager** | Controls parallel agent execution (configurable slots) |
| **RalphLoop** | Autonomous execution with error/stuck detection |
| **MergeService** | Background merge queue with conflict resolution |
| **TaskStore** | JSONL-based task persistence with dependency tracking |
| **LearningStore** | Cross-agent knowledge persistence |
| **ReviewSystem** | Non-blocking human-in-the-loop review |
| **CheckpointService** | Snapshot creation for rollback |

## Configuration

Chorus stores configuration in `.chorus/config.json`:

```json
{
  "mode": "semi-auto",
  "maxAgents": 4,
  "qualityCommands": [
    { "name": "test", "command": "npm run test:run", "required": true },
    { "name": "typecheck", "command": "npm run typecheck", "required": true },
    { "name": "lint", "command": "npm run lint", "required": false }
  ],
  "autoApprove": {
    "enabled": true,
    "maxIterations": 3,
    "requireQualityPass": true
  },
  "ralphLoop": {
    "errorThreshold": 3,
    "stuckThreshold": 300000,
    "minDiskSpaceMB": 500
  }
}
```

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `j/↓` | Move down |
| `k/↑` | Move up |
| `Tab` | Switch panels |
| `1-9` | Quick select |

### Agent Control
| Key | Action |
|-----|--------|
| `s` | Spawn agent |
| `x` | Stop agent |
| `r` | Redirect agent |
| `Enter` | Assign task |

### Mode Control
| Key | Action |
|-----|--------|
| `m` | Toggle mode (semi-auto/autopilot) |
| `Space` | Pause/resume |
| `a` | Start autopilot |

### Task Management
| Key | Action |
|-----|--------|
| `n` | New task |
| `e` | Edit task |
| `b` | Block task |
| `d` | Mark done |

### View
| Key | Action |
|-----|--------|
| `f` | Fullscreen agent |
| `g` | Grid settings |
| `l` | View logs |
| `L` | View learnings |
| `M` | Merge queue view |

### Recovery
| Key | Action |
|-----|--------|
| `R` | Rollback menu |
| `c` | Create checkpoint |
| `u` | Undo last action |

### Planning & Learning
| Key | Action |
|-----|--------|
| `P` | Plan more tasks (incremental) |
| `Shift+P` | Force plan |
| `Ctrl+L` | Review learnings |
| `Shift+L` | Force learning review |

### General
| Key | Action |
|-----|--------|
| `?` | Toggle help |
| `i` | Intervention menu |
| `q` | Quit |

## Agent Signals

Agents communicate via signals in their output:

```
<chorus>COMPLETE</chorus>              # Task completed
<chorus>BLOCKED:reason</chorus>        # Task blocked
<chorus>PROGRESS:75</chorus>           # Progress update (0-100)
<chorus>NEEDS_HELP:context</chorus>    # Needs human help
<chorus>NEEDS_HUMAN:context</chorus>   # Requires human decision
<chorus>RESOLVED:what</chorus>         # Issue resolved
```

## Project Structure

```
src/
├── components/     # React/Ink UI components (50+)
├── hooks/          # Custom React hooks (28)
├── machines/       # XState v5 state machines
│   ├── chorus.machine.ts      # Root orchestration
│   ├── agent.machine.ts       # Agent lifecycle
│   ├── ralphloop.machine.ts   # Autonomous execution
│   ├── reviewRegion.ts        # Review system
│   └── sprintRegion.ts        # Sprint planning
├── modes/          # Application modes
│   ├── InitMode.tsx           # First-run wizard
│   ├── PlanningMode.tsx       # Planning workflow
│   ├── ImplementationMode.tsx # Main working mode
│   └── ReviewLoop.tsx         # Review workflow
├── services/       # Business logic (105 services)
├── types/          # TypeScript definitions
├── e2e/            # End-to-end tests
└── integration/    # Integration tests (real Claude)
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm run test:run        # Unit + E2E tests (2,774 tests)

# Run integration tests (requires Claude CLI)
npm run test:integration  # 100 tests with real Claude

# Quality checks (test + typecheck + lint + knip)
npm run quality
```

### Testing

| Type | Command | Description |
|------|---------|-------------|
| Unit | `npm run test:run` | Component and service tests |
| E2E | `npm run test:run` | PTY-based keyboard tests |
| Integration | `npm run test:integration` | Real Claude CLI tests |

## Roadmap

### Completed (MVP)
- [x] XState v5 state management
- [x] Multi-agent orchestration with SlotManager
- [x] Semi-auto and Autopilot modes
- [x] Ralph Loop autonomous execution
- [x] Planning mode with incremental planning
- [x] Background merge service
- [x] Learning/memory system with deduplication
- [x] Human intervention controls
- [x] Checkpoint and rollback system
- [x] Review system (R01-R04)
- [x] Sprint planning
- [x] Session crash recovery
- [x] 6 agent personas

### Post-MVP
- [ ] Codex agent support
- [ ] OpenCode agent support
- [ ] Learning injection into prompts
- [ ] Custom context ledger system

## Contributing

1. Check available tasks: `bd ready -n 0`
2. Follow TDD pattern: RED → GREEN → REFACTOR
3. Run quality checks before committing: `npm run quality`
4. Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- State management via [XState v5](https://xstate.js.org/)
- Task tracking via [Beads](https://github.com/beads-ai/beads)
