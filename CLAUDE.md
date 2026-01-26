# AXIOM

Multi-agent AI coding orchestrator written in Go.

## Overview

AXIOM orchestrates multiple Claude Code agents to work on software projects. It manages:
- Task breakdown and assignment
- Agent workspace isolation (git worktrees)
- Code integration and conflict resolution
- Learning extraction and propagation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AXIOM                                 │
├─────────────────────────────────────────────────────────────┤
│  Web UI (htmx)  │  State Machine  │  Agent Orchestration    │
├─────────────────────────────────────────────────────────────┤
│  CaseStore      │  WorkspaceManager  │  IntegrationService  │
└─────────────────────────────────────────────────────────────┘
```

## Documentation

Full documentation is in `/docs`:

| Document | Purpose |
|----------|---------|
| [00-overview.md](./docs/00-overview.md) | System introduction |
| [01-configuration.md](./docs/01-configuration.md) | Config system |
| [02-modes.md](./docs/02-modes.md) | Operating modes |
| [03-planning.md](./docs/03-planning.md) | Planning system |
| [04-cases.md](./docs/04-cases.md) | Case management |
| [05-agents.md](./docs/05-agents.md) | Agent personas |
| [06-integration.md](./docs/06-integration.md) | Code integration |
| [07-execution.md](./docs/07-execution.md) | Execution loop |
| [08-discovery.md](./docs/08-discovery.md) | Learning system |
| [09-intervention.md](./docs/09-intervention.md) | Human intervention |
| [10-interface.md](./docs/10-interface.md) | Web UI |
| [11-review.md](./docs/11-review.md) | Review system |
| [12-hooks.md](./docs/12-hooks.md) | Lifecycle hooks |
| [16-glossary.md](./docs/16-glossary.md) | Terminology |

## Development

### Prerequisites

- Go 1.22+
- Claude Code CLI (`claude`)

### Build

```bash
go build -o axiom ./cmd/axiom
```

### Test

```bash
go test ./...
```

### Run

```bash
./axiom
```

## Task Tracking

We use Beads for task management:

```bash
bd ready -n 0          # List available tasks
bd update <id> --status=in_progress
bd close <id>          # Complete task
```

## Key Concepts

| Term | Description |
|------|-------------|
| **Case** | Unit of work (Directive, Task, Discovery, etc.) |
| **CaseStore** | JSONL-based case storage |
| **Workspace** | Git worktree for agent isolation |
| **Persona** | Agent personality (Echo, Axel, Cleo, etc.) |
| **Signal** | Agent output format (`<axiom>TYPE:payload</axiom>`) |

## Project Structure

```
axiom/
├── cmd/axiom/         # Main entry point
├── internal/          # Private packages
│   ├── case/          # CaseStore
│   ├── workspace/     # Git worktree management
│   ├── agent/         # Agent spawning
│   ├── integration/   # Merge service
│   └── ui/            # Web UI (htmx)
├── docs/              # Documentation
└── .axiom/            # Runtime state (gitignored)
```

## Archive

Previous TypeScript/Ink implementation is in `archive-v2/`.
