# Chorus TUI - Ink Rewrite Plan

**Date:** 2026-01-09
**Status:** Planning
**Archived:** `archive/chorus-bash-v0.1.0/`

---

## Vision

A unified TUI for multi-agent development orchestration:
- Real-time agent monitoring in split panes
- Live Beads task visualization
- Keyboard-driven workflow
- Single `npx chorus` to run

```
┌─────────────────────────────────────────────────────────────────┐
│  CHORUS v2.0                                      ⏱ 00:12:34   │
├─────────────────────────┬───────────────────────────────────────┤
│  📋 TASKS (Beads)       │  🤖 AGENTS                            │
│  ─────────────────      │  ─────────                            │
│  → bd-a1b2 Auth [C]     │  CLAUDE ████████░░ 80%                │
│  → bd-c3d4 Tests [X]    │  └─ "Reading jwt.ts..."               │
│  ○ bd-e5f6 Docs         │                                       │
│  ✓ bd-g7h8 DB setup     │  CODEX  ██████░░░░ 60%                │
│                         │  └─ "Running tests..."                │
├─────────────────────────┴───────────────────────────────────────┤
│  > Agent output streams here...                                 │
├─────────────────────────────────────────────────────────────────┤
│  [N]ew Task  [A]ssign  [S]tart  [P]ause  [Q]uit                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Runtime | Node.js 20+ | LTS, widespread |
| Language | TypeScript | Type safety |
| TUI Framework | Ink 5.x | React paradigm, mature |
| State | Zustand | Lightweight, simple |
| Process | execa | Better than child_process |
| File Watch | chokidar | Cross-platform |
| CLI Parser | meow | Ink-compatible |
| Testing | Vitest | Fast, TS-native |
| Build | tsup | Simple bundling |

---

## Architecture

```
src/
├── index.tsx              # Entry point
├── cli.ts                 # CLI argument parsing
├── app.tsx                # Main App component
├── components/
│   ├── Layout.tsx         # Main grid layout
│   ├── TaskPanel.tsx      # Beads task list
│   ├── AgentPanel.tsx     # Agent status cards
│   ├── OutputPanel.tsx    # Scrollable output
│   ├── StatusBar.tsx      # Bottom status/shortcuts
│   └── common/
│       ├── Box.tsx
│       ├── Text.tsx
│       └── ProgressBar.tsx
├── hooks/
│   ├── useBeads.ts        # Beads file watcher
│   ├── useAgent.ts        # Agent process manager
│   ├── useKeyboard.ts     # Keyboard shortcuts
│   └── useGitWorktree.ts  # Git worktree ops
├── services/
│   ├── beads.ts           # Beads JSONL parser
│   ├── agent.ts           # Agent spawning
│   ├── git.ts             # Git operations
│   └── config.ts          # Config management
├── types/
│   └── index.ts           # Type definitions
└── utils/
    └── index.ts           # Helpers
```

---

## Phase 1: Foundation (MVP)

### 1.1 Project Setup
- [x] Initialize npm project
- [x] Configure TypeScript
- [x] Setup Vitest
- [x] Install Ink + dependencies
- [x] Create basic CLI entry point

### 1.2 Basic TUI Shell
- [x] Main App component
- [x] Layout grid (3 sections)
- [x] Static placeholder panels
- [x] Keyboard quit (q)

### 1.3 Agent Process Management
- [x] Spawn single agent (claude)
- [x] Capture stdout/stderr
- [x] Stream to OutputPanel
- [x] Handle process exit

**Deliverable:** `npx chorus run "task"` shows agent output in TUI

---

## Phase 2: Multi-Agent

### 2.1 Agent Panel
- [x] Agent status component
- [x] Progress indicator (status icons)
- [x] Current task display
- [x] Multiple agent cards

### 2.2 Git Worktree Integration
- [ ] Create worktree for agent
- [ ] Branch naming convention
- [ ] Cleanup on exit

### 2.3 Multi-Agent Orchestration
- [x] Spawn multiple agents
- [x] j/k to switch focus (with wrap-around)
- [x] Parallel execution
- [x] Split pane output (tiling layout)

### 2.4 Fullscreen TUI Layout
- [x] Alternate screen buffer (ANSI escape codes)
- [x] useTerminalSize hook for dimensions
- [x] Center empty state properly
- [x] Tiling layout for agent panels (horizontal)
- [x] Scrollable output per agent panel (tail behavior)
- [x] Terminal resize handling
- [x] Restore terminal on exit/SIGINT/SIGTERM

**Deliverable:** `npx chorus` shows fullscreen TUI with tiled agents (96 tests)

---

## Phase 3: Beads Integration

### 3.1 Beads Parser
- [ ] Read .beads/issues.jsonl
- [ ] Parse task structure
- [ ] Watch for changes
- [ ] Update state on change

### 3.2 Task Panel
- [ ] Task list component
- [ ] Status icons (ready/active/done)
- [ ] Assignee display
- [ ] Priority sorting

### 3.3 Task Actions
- [ ] [N]ew task → bd add
- [ ] [A]ssign to agent
- [ ] [D]one → bd close
- [ ] [V]iew details

**Deliverable:** Live task updates as agents work

---

## Phase 4: Polish

### 4.1 UX Improvements
- [ ] Color themes
- [ ] Responsive layout
- [ ] Error boundaries
- [ ] Loading states

### 4.2 Configuration
- [ ] chorus.config.json
- [ ] Agent definitions
- [ ] Custom keybindings

### 4.3 Project Init
- [ ] `chorus init` command
- [ ] Setup wizard
- [ ] AGENTS.md generation

**Deliverable:** Production-ready TUI

---

## Phase 5: Advanced (Future)

### 5.1 Kanban View
- [ ] Column-based layout
- [ ] Drag-drop (keyboard)
- [ ] Swimlanes per agent

### 5.2 DAG Visualization
- [ ] Dependency graph
- [ ] Blocked task indicators
- [ ] Critical path

### 5.3 MCP Integration
- [ ] beads-mcp server
- [ ] Direct Claude API
- [ ] Tool use tracking

---

## Testing Strategy

### Unit Tests
```typescript
// services/beads.test.ts
describe('parseBeadsJSONL', () => {
  it('parses single task', () => {
    const jsonl = '{"id":"bd-a1b2","title":"Test","status":"ready"}';
    expect(parseBeadsJSONL(jsonl)).toEqual([
      { id: 'bd-a1b2', title: 'Test', status: 'ready' }
    ]);
  });
});
```

### Integration Tests
```typescript
// hooks/useAgent.test.ts
describe('useAgent', () => {
  it('spawns agent and captures output', async () => {
    const { result } = renderHook(() => useAgent('claude'));
    await act(() => result.current.start('echo hello'));
    expect(result.current.output).toContain('hello');
  });
});
```

### E2E Tests
```typescript
// e2e/basic.test.ts
describe('chorus run', () => {
  it('shows agent output in TUI', async () => {
    const { stdout } = await execa('npx', ['chorus', 'run', 'echo test']);
    expect(stdout).toContain('test');
  });
});
```

---

## Commands

| Command | Description |
|---------|-------------|
| `chorus` | Open TUI dashboard |
| `chorus run "task"` | Run single agent with task |
| `chorus squad -a x,y` | Run multiple agents |
| `chorus init` | Initialize project |
| `chorus status` | Quick status (no TUI) |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` | Quit |
| `Tab` | Switch panel focus |
| `↑/↓` | Navigate list |
| `Enter` | Select/confirm |
| `n` | New task |
| `a` | Assign task |
| `d` | Mark done |
| `s` | Start agent |
| `p` | Pause agent |
| `r` | Restart agent |
| `?` | Help |

---

## Migration from Bash

| Bash Command | Ink Equivalent |
|--------------|----------------|
| `chorus init` | `chorus init` (wizard) |
| `chorus loop "task"` | `chorus run "task"` |
| `chorus squad --agents x,y` | `chorus squad -a x,y` |
| `chorus status` | `chorus status` |
| `chorus monitor` | Built into main TUI |

---

## Success Criteria

1. **Single command** - `npx chorus` opens full TUI
2. **Real-time** - Agent output streams instantly
3. **Multi-agent** - 3+ agents visible simultaneously
4. **Beads live** - Tasks update as agents work
5. **Keyboard-only** - No mouse required
6. **Fast startup** - < 500ms to interactive
7. **Cross-platform** - macOS, Linux, Windows

---

## References

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Beads by Steve Yegge](https://github.com/steveyegge/beads)
- [Zustand](https://github.com/pmndrs/zustand)
- [execa](https://github.com/sindresorhus/execa)
- Archived bash implementation: `archive/chorus-bash-v0.1.0/`
