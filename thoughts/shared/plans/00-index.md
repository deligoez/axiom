# Chorus Workflow: Master Plan Index

**Date:** 2026-01-09
**Updated:** 2026-01-17
**Status:** APPROVED - Implementation in Progress
**Version:** 6.1

---

## Overview

### What is Chorus?

Chorus is an Ink-based (React for CLI) TUI that orchestrates multiple AI coding agents working on a shared codebase. It provides:

- **Two operating modes**: Semi-auto (user-controlled) and Autopilot (fully autonomous)
- **Visual orchestration**: See all agents and tasks in a tiling view
- **Automatic mode**: Ralph Wiggum pattern for autonomous task completion
- **Memory persistence**: Shared learnings across all agent types
- **Intervention controls**: Pause, rollback, redirect agents mid-flight
- **Intelligent conflict resolution**: Agent-first, human-fallback approach
- **Agent Personas**: Named personalities for each agent role (Analyzer Ace, Engineer Ed, Planner Pat, Fixer Finn, Spotter Sam, Logger Lou, Director Dan, Watcher Will, Counter Carl)
- **Native TaskStore**: Built-in task management with intelligent selection

### Design Principles

1. **Agent-Ready Architecture**: Designed for claude-code (MVP), extensible to codex and opencode (post-MVP)
2. **Non-Invasive**: Uses existing tools (git worktrees) rather than reinventing
3. **Fail-Safe**: Can recover from crashes, bad commits, stuck agents
4. **Observable**: Every action is visible in TUI and logged
5. **Interruptible**: Human can intervene at any point without data loss
6. **Simple First**: Minimal services, clear responsibilities

---

## Plan Modules

This master plan is organized into modular documents for easier navigation and maintenance:

| Module | File | Description |
|--------|------|-------------|
| **Index** | [00-index.md](./00-index.md) | This file - overview and navigation |
| **Architecture** | [01-architecture.md](./01-architecture.md) | XState v5 actor model, state management, persistence |
| **Operating Modes** | [02-operating-modes.md](./02-operating-modes.md) | Semi-auto and Autopilot modes |
| **Planning Phase** | [03-planning-phase.md](./03-planning-phase.md) | M0 planning, initialization flow |
| **Task Management** | [04-task-management.md](./04-task-management.md) | Native TaskStore, intelligent selection |
| **Agent Personas** | [05-agent-personas.md](./05-agent-personas.md) | Persona system, shared rules, agent identity |
| **Merge Service** | [06-merge-service.md](./06-merge-service.md) | Background merge, conflict resolution |
| **Ralph Loop** | [07-ralph-loop.md](./07-ralph-loop.md) | Automatic mode, iteration control |
| **Memory System** | [08-memory-system.md](./08-memory-system.md) | Learnings, knowledge sharing, extraction |
| **Intervention & Recovery** | [09-intervention-rollback.md](./09-intervention-rollback.md) | Hooks, human intervention, rollback |
| **TUI Visualization** | [10-tui-visualization.md](./10-tui-visualization.md) | Layout, keyboard shortcuts, status indicators |
| **Review & Sprint** | [11-review-sprint.md](./11-review-sprint.md) | M13 review system, M13b sprint planning |
| **Appendix: Process Diagrams** | [12-appendix-process-diagrams.md](./12-appendix-process-diagrams.md) | Comprehensive visual diagrams of all processes |

---

## Key Decisions (Resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Multi-agent support? | YES - config supports claude, codex, opencode (see #10 for MVP scope) |
| 2 | Worktrees? | REQUIRED - with background merge service |
| 3 | Task management? | Native TaskStore (replaces Beads) |
| 4 | Auto-mode control? | Max agents + intelligent selection |
| 5 | Review process? | Automated (tests + acceptance criteria) |
| 6 | Completion detection? | Signal + Tests (AND logic) |
| 7 | Prompt construction? | Inject task context + learnings |
| 8 | Conflict resolution? | Agent-first, human-fallback |
| 9 | Operating modes? | Semi-auto (default) + Autopilot |
| 10 | MVP Scope? | **Claude-only implementation** |
| 11 | Architecture? | **Planning-first (Ralph-inspired)** |
| 12 | Config format? | **JSON (config) + Markdown (rules, learnings)** |
| 13 | Quality gates? | **Flexible commands (not just test/lint)** |
| 14 | Context strategy? | **MVP: Claude compact; Post-MVP: custom ledger** |
| 15 | State Management? | **XState v5 (actor model, crash recovery)** |
| 16 | Agent Work Review? | **Non-blocking HITL review (M13)** |
| 17 | Sprint Planning? | **Configuration wrapper (M13b)** |
| 18 | Agent Identity? | **Persona system with named agents** |
| 19 | Task Selection? | **Intelligent algorithm (no manual priority)** |

### Decision Details

See [01-architecture.md](./01-architecture.md) for detailed decision rationale.

---

## Milestones

| Label | Milestone | Module Reference |
|-------|-----------|------------------|
| **m-1-xstate** | XState Foundation (BLOCKS ALL) | [01-architecture.md](./01-architecture.md) |
| **m0-planning** | Planning Phase | [03-planning-phase.md](./03-planning-phase.md) |
| **m1-infrastructure** | Config, State, Worktree | [01-architecture.md](./01-architecture.md) |
| **m2-agent-prep** | Prompt, Signal, Linking | [05-agent-personas.md](./05-agent-personas.md) |
| **m3-task-mgmt** | Test, Completion, Claim | [04-task-management.md](./04-task-management.md) |
| **m4-orchestration** | Orchestrator, Semi-Auto | [02-operating-modes.md](./02-operating-modes.md) |
| **m5-merge** | Merge Service | [06-merge-service.md](./06-merge-service.md) |
| **m6-parallelism** | Slot Manager | [07-ralph-loop.md](./07-ralph-loop.md) |
| **m7-autopilot** | Ralph Loop | [07-ralph-loop.md](./07-ralph-loop.md) |
| **m8-memory** | Learning/Memory | [08-memory-system.md](./08-memory-system.md) |
| **m9-intervention** | Human Intervention | [09-intervention-rollback.md](./09-intervention-rollback.md) |
| **m10-rollback** | Rollback & Recovery | [09-intervention-rollback.md](./09-intervention-rollback.md) |
| **m11-hooks** | Hooks System | [09-intervention-rollback.md](./09-intervention-rollback.md) |
| **m12-tui** | TUI Visualization | [10-tui-visualization.md](./10-tui-visualization.md) |
| **m13-review** | Review System | [11-review-sprint.md](./11-review-sprint.md) |
| **m13b-sprint** | Sprint Planning | [11-review-sprint.md](./11-review-sprint.md) |
| **m-personas** | Agent Personas | [05-agent-personas.md](./05-agent-personas.md) |
| **m-taskstore** | Native TaskStore | [04-task-management.md](./04-task-management.md) |

---

## Quick Reference

### TUI Flow

```
chorus command
     │
     ▼
┌─────────────────┐
│ Check .chorus/  │
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
     ▼              │ has tasks?│
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

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHORUS ARCHITECTURE                           │
│                      XState Actor Model                          │
└─────────────────────────────────────────────────────────────────┘

                      ┌─────────────────┐
                      │   ChorusApp     │
                      │   (Ink root)    │
                      └────────┬────────┘
                               │
                      useMachine(chorusMachine)
                               │
                               ▼
         ┌─────────────────────────────────────────────┐
         │              CHORUS MACHINE                  │
         │              type: 'parallel'                │
         │                                              │
         │  ┌─────────────┐ ┌─────────────┐ ┌────────┐  │
         │  │orchestration│ │ mergeQueue  │ │monitor │  │
         │  │   region    │ │   region    │ │ region │  │
         │  └─────────────┘ └─────────────┘ └────────┘  │
         │                                              │
         │  ┌────────────────────────────────────────┐  │
         │  │         SPAWNED CHILD ACTORS           │  │
         │  │  (ed-001, ed-002, ace-001, dan-003)     │  │
         │  └────────────────────────────────────────┘  │
         └─────────────────────────────────────────────┘
```

### Persona System

All 9 personas are agents with consistent file structure (prompt.md, rules.md, skills/, logs/, learnings.md, metrics.json). **All agents get instance numbers** (`ace-001`, `ed-047`, `dan-003`) - counters persist across Chorus restarts.

| Persona             | Emoji | Role              | Color  | Implementation    | Concurrency |
|---------------------|-------|-------------------|--------|-------------------|-------------|
| **Analyzer Ace**    | 🔍    | Analyzer          | Indigo | Claude Agent      | 1 at a time |
| **Engineer Ed**     | ⚙️    | Worker            | Blue   | Claude Agent      | N parallel  |
| **Planner Pat**     | 📊    | Planner           | Purple | Claude Agent      | 1 at a time |
| **Fixer Finn**      | 🔧    | Resolver          | Orange | Claude Agent      | 1 at a time |
| **Spotter Sam**     | 🎯    | Task Selector     | Green  | Claude Agent      | 1 at a time |
| **Logger Lou**      | 💡    | Learning Extractor| Teal   | Claude Agent      | 1 at a time |
| **Director Dan**    | 😎    | Orchestrator      | Gold   | XState + Claude   | 1 at a time |
| **Watcher Will**    | 👁️    | Health Monitor    | Amber  | Claude Agent      | 1 at a time |
| **Counter Carl**    | 📈    | Statistician      | Slate  | Claude Agent      | 1 at a time |

---

## References

- [Ralph Wiggum Pattern](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
- [Git Worktrees](https://git-scm.com/docs/git-worktree)
- [XState v5 Documentation](https://stately.ai/docs/xstate-v5)

---

## Changelog

- **v6.1 (2026-01-17):** Process Diagrams Appendix
  - Added [12-appendix-process-diagrams.md](./12-appendix-process-diagrams.md) with comprehensive visual diagrams
  - Covers: End-to-End Lifecycle, App Routing, Planning Dialogue, Task Lifecycle, Agent Spawn, Ralph Loop, Merge Service, Memory System, Review System, Intervention/Rollback, Agent Personas, Event Flow

- **v6.0 (2026-01-14):** Modularization
  - Split master plan into 12 module files for maintainability
  - Merged Native TaskStore plan into [04-task-management.md](./04-task-management.md)
  - Merged Agent Personas plan into [05-agent-personas.md](./05-agent-personas.md)
  - Added cross-references between modules
  - Updated decision table with TaskStore and Personas decisions
  - Deleted standalone plan files (consolidated)

- **v5.1 (2026-01-12):** Plan Files Consolidation
  - Merged XState Migration Plan into Architecture section
  - Merged Agent Work Review Plan into M13/M13b sections
  - Added Decision Records section (#27-51)

- **v5.0 (2026-01-12):** Agent Work Review System & Sprint Planning
  - Added M13 Review System (24 tasks, 169 tests)
  - Added M13b Sprint Planning (10 tasks, 42 tests)

See individual module files for detailed changelogs.

---

**End of Index**
