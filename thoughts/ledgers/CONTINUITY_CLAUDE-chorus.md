# Continuity Ledger: Chorus

**Session Date:** 2026-01-10
**Status:** Phase 4 - M1/M2/M3/M4 Beads Tasks Ready (176 tests, 18 tasks)

---

## Goal

Create a unified TUI for multi-agent development orchestration using Ink (React for CLI).

**Success Criteria:**
- [ ] `npx chorus` opens full TUI dashboard
- [ ] Real-time agent output streaming
- [ ] Tiling agent view (dynamic grid, 3+ agents)
- [ ] Live Beads task visualization
- [ ] Two modes: semi-auto + autopilot
- [ ] Keyboard-driven workflow
- [ ] < 500ms startup time
- [ ] Cross-platform (macOS, Linux, Windows)

---

## Key Decisions

### 1. Rewrite in Ink (not bash)
- **Reason:** Better TUI capabilities, native split panes, real-time updates
- **Archived:** `archive/chorus-bash-v0.1.0/` (53 passing Bats tests)

### 2. Tech Stack
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 20+ | LTS, widespread |
| Language | TypeScript | Type safety |
| TUI | Ink 6.x | React paradigm, mature |
| State | Zustand | Lightweight |
| Process | execa | Better child_process |
| Testing | Vitest | Fast, TS-native |

### 3. Beads Integration (not rewrite)
- Use existing Beads CLI/MCP
- Watch `.beads/issues.jsonl` for live updates
- Display tasks in Chorus TUI

### 4. TDD Approach
- Write tests first (Vitest)
- Atomic conventional commits
- No permission prompts for commits

### 5. Phase 4 Orchestration Decisions (v2.0 RESOLVED)
| Decision | Choice |
|----------|--------|
| Multi-agent | YES - claude, codex, opencode (no aider) |
| Worktrees | REQUIRED - with Background Merge Service |
| Task management | Beads only (bd CLI - direct calls) |
| Operating modes | Semi-auto (default) + Autopilot |
| Conflict resolution | Agent-first, human-fallback |
| Completion detection | Signal `<chorus>` + Tests (AND logic) |
| Architecture | Simplified: 2 services (Orchestrator + MergeService) |

---

## State

- Done:
  - [x] Bash CLI v0.1.0 (archived)
  - [x] Phase 1.1 - Project Setup (10 tests)
  - [x] Phase 1.2 - Basic TUI Shell (27 tests)
  - [x] Phase 1.3 - Agent Process Management (63 tests)
  - [x] Phase 2.1-2.3 - Multi-Agent (89 tests)
  - [x] Phase 2.4 - Fullscreen TUI Layout (96 tests)
  - [x] Phase 2.5 - Help Panel (99 tests)
  - [x] Phase 3 - Beads Integration (159 tests)
  - [x] Edge Case Tests & Improvements (176 tests)
  - [x] Phase 4 Planning v2.0 - Optimized workflow, all decisions resolved

- Now: [→] Phase 4 Implementation via Beads - M1-M4 Tasks Ready
  - Detailed feature analysis complete (57 features identified)
  - 12 milestones defined with dependencies
  - **Beads tracking enabled** - all tasks in `.beads/` with `ch-` prefix
  - TDD for each task, sequential execution (no worktrees)
  - **M1 + M2 + M3 + M4 tasks created** (18 tasks total)
  - **Dependency chains verified and corrected**
  - Next: `bd ready` → pick task → TDD → close → repeat

- Remaining (12 milestones, ~364 new tests):
  - [ ] M1: Infrastructure + Worktree (F01-F06, ~30 tests) ← START HERE
  - [ ] M2: Agent Preparation (F07-F09, ~23 tests)
  - [ ] M3: Task Management (F10-F13, ~28 tests)
  - [ ] M4: Core Orchestration (F14-F20, ~57 tests) **Semi-Auto**
  - [ ] M5: Merge Service (F24-F31, ~49 tests)
  - [ ] M6: Parallelism (F21-F23, ~25 tests)
  - [ ] M7: Autopilot (F32-F38, ~43 tests) **GOAL**
  - [ ] M8: Memory System (F39-F42, ~23 tests)
  - [ ] M9: Human Intervention (F43-F46, ~21 tests)
  - [ ] M10: Rollback (F47-F51, ~22 tests)
  - [ ] M11: Hooks (F52-F54, ~18 tests)
  - [ ] M12: Recovery + Init (F03, F55-F57, ~25 tests)

- Future:
  - [ ] Phase 5 - Polish (themes, responsive, error boundaries)
  - [ ] Phase 6 - Advanced (Kanban, DAG)

---

## Phase 4 Workflow Plan v2.0 (READ THIS)

**Plan Location:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v2.0)

### Architecture (Simplified)

```
ChorusApp (Ink)
      │
      ├── TaskPanel ── taskStore (Zustand)
      ├── AgentTilingView ── agentStore (Zustand)
      └── StatusBar
              │
      ┌───────┴───────┐
      │               │
Orchestrator    MergeService
      │          (background)
      │
┌─────┼─────┐
bd    git   agent CLI
```

**Key Insight:** Only 2 services needed (down from 7+)

### Operating Modes

| Mode | Behavior |
|------|----------|
| **semi-auto** | User selects task, agent completes one, STOPS |
| **autopilot** | Runs until no ready tasks remain |

### Signal Protocol

```xml
<chorus>COMPLETE</chorus>
<chorus>BLOCKED: reason</chorus>
<chorus>NEEDS_HUMAN: reason</chorus>
```

### Conflict Resolution Flow

```
SIMPLE → Auto-resolve (merge drivers)
MEDIUM → Rebase + retry
COMPLEX → Spawn Resolver Agent → If fails → Human
```

### Phase 4.1 MVP Features

- [ ] Semi-auto mode only
- [ ] Task selection in TUI (Enter key)
- [ ] Single agent spawn with prompt
- [ ] Worktree creation
- [ ] Agent output streaming
- [ ] Signal detection
- [ ] Task status update
- [ ] Manual merge (user runs git merge)

### Key Files to Create (Phase 4.1)

```
src/services/Orchestrator.ts      (NEW)
src/types/orchestration.ts        (NEW)
src/stores/orchestrationStore.ts  (UPDATE)
src/hooks/useOrchestration.ts     (NEW)
tests/services/Orchestrator.test.ts (NEW)
```

---

## v2.0 Changes Summary

From v1.x to v2.0:
- **Simplified:** 7+ services → 2 (Orchestrator + MergeService)
- **Phases:** 7 → 6 (~160 tests → ~115 tests)
- **Modes:** Added semi-auto (default) + autopilot
- **View:** Tiling agent grid (dynamic rows/cols)
- **Conflict:** Agent-first resolution
- **Signal:** `<promise>` → `<chorus>`
- **Removed:** aider, GitHub Issues import, PRD parsing (v2 scope)
- **Added:** Custom model per task, user parallel worktree

---

## Open Questions

- RESOLVED: Use Ink for TUI (not bash + tmux)
- RESOLVED: Integrate Beads (not rewrite)
- RESOLVED: All Phase 4 orchestration decisions (v2.0)
- UNCONFIRMED: npm package name "chorus" availability

---

## Working Set

**Plans:**
- `thoughts/shared/plans/2026-01-10-chorus-phase4-master.md` ← MASTER TRACKER
- `thoughts/shared/plans/2026-01-10-feature-dependency-analysis.md` ← ALL 57 FEATURES
- `thoughts/shared/plans/features/` ← Individual feature plans
- `thoughts/shared/plans/2026-01-09-chorus-workflow.md` ← Original workflow (v2.0)

**Current Structure:**
```
src/
├── index.tsx              # Entry point
├── cli.ts                 # CLI parsing
├── app.tsx                # Main component
├── components/
│   ├── StatusBar.tsx      # App name, counts, quit hint
│   ├── Layout.tsx         # Border box, fullscreen
│   ├── MainContent.tsx    # Agent panels
│   ├── TaskPanel.tsx      # Beads task list
│   └── HelpPanel.tsx      # Keyboard shortcuts
├── hooks/
│   ├── useKeyboard.ts     # Key handling
│   ├── useAgentManager.ts # AgentManager → store
│   ├── useBeadsManager.ts # BeadsService → store
│   └── useTerminalSize.ts # Terminal dimensions
├── services/
│   ├── AgentManager.ts    # Process spawn/kill
│   ├── BeadsService.ts    # Watch .beads/
│   └── BeadsParser.ts     # Parse JSONL
├── stores/
│   ├── agentStore.ts      # Agent state
│   └── beadsStore.ts      # Beads state
└── types/
    ├── agent.ts           # Agent types
    └── bead.ts            # Bead types
```

**Commands:**
```bash
npm test               # Run Vitest (176 tests)
npm run dev            # Dev mode
npm run build          # Build
npx chorus             # Run TUI
bd ready               # Show ready tasks
bd show <id>           # Task details
```

---

## NEXT SESSION: Start Here

### Immediate Action
```bash
bd ready               # See: ch-2n6 (F01a Config Types)
bd update ch-2n6 --status=in_progress
```

### TDD Workflow
1. Read task: `bd show ch-2n6`
2. Write tests first (RED)
3. Implement (GREEN)
4. Commit: `git add . && git commit -m "feat: F01a config types"`
5. Close: `bd close ch-2n6`
6. Next: `bd ready` → pick next

### Current Ready Tasks (6)
**M1 - Infrastructure:**
- `ch-2n6`: F01a Config Types ← START
- `ch-ah6`: F02a State Types
- `ch-glq`: F04 Worktree Create

**M2 - Agent Preparation:**
- `ch-wk8`: F07 Prompt Builder
- `ch-mpl`: F08 Signal Parser

**M3 - Task Management:**
- `ch-zqi`: F12 Task Claimer

### Task Tracking Rules
See: `.claude/rules/beads-task-tracking.md` (updated with ch- prefix)

**Remote:** git@github.com:deligoez/chorus.git

---

## Origin

Bash CLI v0.1.0 completed 2026-01-09 with 53 tests.
Rewrite decision made after tmux integration proved too complex.
Ink chosen for native TUI capabilities and React paradigm.

Archived: `archive/chorus-bash-v0.1.0/`
