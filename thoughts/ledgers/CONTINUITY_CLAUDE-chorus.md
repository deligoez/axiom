# Continuity Ledger: Chorus

**Session Date:** 2026-01-09
**Status:** Ink Rewrite - Phase 3 Ready (96 tests)

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

- Now: [→] Phase 2.4 Bug Fix - Top Border Cut Off
  - [x] Tried manual ANSI escape codes
  - [x] Tried fullscreen-ink package
  - [x] Tried FullScreenBox + manual ANSI combo
  - [ ] **UNRESOLVED**: Top border row cut off in all terminals (Ghostty, WezTerm, Mac Terminal)
  - [ ] Need to investigate Ink rendering behavior or try different approach

- Next: Phase 3 - Beads Integration
  - [ ] Watch `.beads/issues.jsonl` for task updates
  - [ ] Display tasks in TUI
  - [ ] Task status visualization

- Remaining:
  - [ ] Phase 4 - Polish
  - [ ] Phase 5 - Advanced (Kanban, DAG)

---

## Open Questions

- RESOLVED: Use Ink for TUI (not bash + tmux)
- RESOLVED: Integrate Beads (not rewrite)
- UNCONFIRMED: npm package name "chorus" availability
- **ACTIVE BUG**: Top border row cut off in fullscreen mode
  - Happens in ALL terminals (Ghostty, WezTerm, Mac Terminal)
  - Tried: manual ANSI codes, fullscreen-ink, FullScreenBox
  - The rounded corner `╭` and top border are not visible
  - Possible causes to investigate:
    1. Ink's Yoga layout starting at row 1 instead of row 0
    2. Some implicit newline being added before render
    3. Terminal rows count off by 1
  - Command to test: `npx tsx src/index.tsx`

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
│   ├── StatusBar.tsx      # App name, agent count, quit hint
│   ├── Layout.tsx         # Border box, fullscreen (uses useTerminalSize)
│   └── MainContent.tsx    # Agent panels (tiling layout, scrollable output)
├── hooks/
│   ├── useKeyboard.ts     # q/s/j/k key handling
│   ├── useAgentManager.ts # Wires AgentManager to store
│   └── useTerminalSize.ts # Terminal width/height with resize handling
├── services/
│   └── AgentManager.ts    # Process spawn/kill/stream
├── stores/
│   └── agentStore.ts      # Zustand state management
└── types/
    └── agent.ts           # Agent, AgentConfig, AgentStatus
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
