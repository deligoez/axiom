# Continuity Ledger: Chorus

**Session Date:** 2026-01-09
**Status:** Ink Rewrite - Phase 3 Complete (159 tests)

---

## Goal

Create a unified TUI for multi-agent development orchestration using Ink (React for CLI).

**Success Criteria:**
- [ ] `npx chorus` opens full TUI dashboard
- [ ] Real-time agent output streaming
- [ ] Multi-agent split pane view (3+ agents)
- [ ] Live Beads task visualization
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

---

## State

- Done:
  - [x] Bash CLI v0.1.0 (archived to `archive/chorus-bash-v0.1.0/`)
  - [x] Ink rewrite plan (`thoughts/shared/plans/2026-01-09-chorus-ink-rewrite.md`)
  - [x] Removed old bash files + submodules (clean repo)
  - [x] Phase 1.1 - Project Setup (10 passing tests)
    - [x] Initialize npm project with TypeScript
    - [x] Setup Vitest
    - [x] Install Ink 6.x + React 19 + dependencies
    - [x] Create CLI parser (cli.ts)
    - [x] Create App component (app.tsx)
    - [x] Create entry point (index.tsx)

- [x] Phase 1.2 - Basic TUI Shell (27 passing tests)
    - [x] StatusBar component (app name, agent count, quit hint)
    - [x] Layout component (borders, structure)
    - [x] MainContent component (agent output, empty state)
    - [x] useKeyboard hook (q to quit, Ctrl+C)
    - [x] Wired App with all components

- [x] Phase 1.3 - Agent Process Management (63 passing tests)
    - [x] Agent type definitions (Agent, AgentConfig, AgentStatus)
    - [x] createAgent factory function
    - [x] AgentManager service (spawn, kill, killAll, list)
    - [x] Agent output streaming with EventEmitter
    - [x] Zustand store (add, update, remove, select agents)
    - [x] Comprehensive edge case tests (+17 tests)
      - exit/error events, stderr, invalid IDs, unique IDs

- [x] Phase 2.1-2.3 - Multi-Agent (89 passing tests)
    - [x] useAgentManager hook (wires AgentManager events to store)
    - [x] MainContent uses Agent type from types/agent.ts
    - [x] Status indicators (●/○/✗ for running/stopped/error)
    - [x] App reads agents from Zustand store
    - [x] Press 's' to spawn demo agent
    - [x] Press 'j/k' to navigate between agents (with wrap-around)
    - [x] Selection highlight (► indicator, cyan double border)
    - [x] Auto-select first agent when spawning
    - [x] StatusBar shows agent count

- [x] Phase 2.4 - Fullscreen TUI Layout (96 passing tests)
    - [x] Alternate screen buffer (ANSI escape codes)
    - [x] useTerminalSize hook for dimensions
    - [x] Center empty state properly
    - [x] Tiling layout for agent panels (horizontal)
    - [x] Scrollable output per agent panel (tail behavior)
    - [x] Terminal resize handling
    - [x] Restore terminal on exit/SIGINT/SIGTERM

- [x] Phase 2.4 Bug Fix - Top Border Cut Off
  - [x] Tried manual ANSI escape codes
  - [x] Tried fullscreen-ink package
  - [x] Tried FullScreenBox + manual ANSI combo
  - [x] **RESOLVED**: Workaround for Ink issue #808 (initial render newline bug)
    - Dynamic marginTop (1 on first render, 0 after) in Layout.tsx
    - Explicit height calculation based on terminal size

- [x] Phase 2.5 - Help Panel (99 tests)
  - [x] HelpPanel component with keyboard shortcuts
  - [x] Toggle with '?' key
  - [x] Absolute positioned overlay (agents visible behind)
  - [x] useKeyboard hook extended with onToggleHelp

- [x] Phase 3 - Beads Integration (159 tests)
  - [x] Phase 3.1: Bead types and JSONL parser (115 tests)
    - Bead, BeadStatus, BeadType, BeadPriority types
    - parseBeadLine, parseBeadsJSONL, serializeBeadLine
  - [x] Phase 3.2: BeadsService with file watching (128 tests)
    - Watch `.beads/issues.jsonl` for task updates
    - chokidar for file change detection
  - [x] Phase 3.3: beadsStore (Zustand) (143 tests)
    - setBeads, updateBead, selectBead
    - getBeadsByStatus, getBeadsSortedByPriority, getActiveBeads
  - [x] Phase 3.4: TaskPanel component (156 tests)
    - Status indicators (→/●/✓/⊗ for open/in_progress/closed/blocked)
    - Short IDs, priority badges, assignee display
  - [x] Phase 3.5: Wire TaskPanel into App (159 tests)
    - Split layout: TaskPanel (left) + MainContent (right)
    - StatusBar shows task count

- Now: [→] Phase 4 - Polish
  - [ ] Color themes
  - [ ] Responsive layout
  - [ ] Error boundaries
  - [ ] Loading states

- Remaining:
  - [ ] Phase 5 - Advanced (Kanban, DAG)

---

## Open Questions

- RESOLVED: Use Ink for TUI (not bash + tmux)
- RESOLVED: Integrate Beads (not rewrite)
- RESOLVED: Top border cut off - workaround via marginTop + explicit height (Ink issue #808)
- UNCONFIRMED: npm package name "chorus" availability

---

## Working Set

**Plan:** `thoughts/shared/plans/2026-01-09-chorus-ink-rewrite.md`

**Current Structure:**
```
src/
├── index.tsx              # Entry point (alternate screen buffer)
├── cli.ts                 # CLI parsing (--version, --help)
├── app.tsx                # Main component (wires everything together)
├── components/
│   ├── StatusBar.tsx      # App name, agent/task counts, quit hint
│   ├── Layout.tsx         # Border box, fullscreen (dynamic marginTop for Ink bug)
│   ├── MainContent.tsx    # Agent panels (tiling layout, scrollable output)
│   ├── TaskPanel.tsx      # Beads task list (status icons, priorities)
│   └── HelpPanel.tsx      # Keyboard shortcuts overlay (press ?)
├── hooks/
│   ├── useKeyboard.ts     # q/s/j/k/? key handling
│   ├── useAgentManager.ts # Wires AgentManager to store
│   ├── useBeadsManager.ts # Wires BeadsService to beadsStore
│   └── useTerminalSize.ts # Terminal width/height with resize handling
├── services/
│   ├── AgentManager.ts    # Process spawn/kill/stream
│   ├── BeadsService.ts    # Watch .beads/issues.jsonl
│   └── BeadsParser.ts     # Parse JSONL format
├── stores/
│   ├── agentStore.ts      # Zustand agent state
│   └── beadsStore.ts      # Zustand beads state
└── types/
    ├── agent.ts           # Agent, AgentConfig, AgentStatus
    └── bead.ts            # Bead, BeadStatus, BeadType, BeadPriority
```

**Commands:**
```bash
npm test               # Run Vitest
npm run dev            # Dev mode
npm run build          # Build
npx chorus             # Run TUI
```

**Remote:** git@github.com:deligoez/chorus.git

---

## Origin

Bash CLI v0.1.0 completed 2026-01-09 with 53 tests.
Rewrite decision made after tmux integration proved too complex for good UX.
Ink chosen for native TUI capabilities and React paradigm.

Archived: `archive/chorus-bash-v0.1.0/`
