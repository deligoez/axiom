# Chorus TUI Visualization

**Module:** 10-tui-visualization.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [01-architecture.md](./01-architecture.md), [05-agent-personas.md](./05-agent-personas.md)

---

## Overview

Chorus provides a rich Terminal User Interface (TUI) built with Ink (React for CLI) that visualizes the entire orchestration state in real-time.

**UI Design Locations:** Each feature module contains its own UI Design section for context. This module defines shared components and patterns.

| Feature | UI Section Location |
|---------|---------------------|
| Init, Planning, Review Modes | [03-planning-phase.md](./03-planning-phase.md#ui-design-planning-phase) |
| Task Panel + Detail View | [04-task-management.md](./04-task-management.md#ui-design-task-management) |
| Agent Grid + Tiles | [05-agent-personas.md](./05-agent-personas.md#ui-design-agent-display) |
| Merge Queue Panel | [06-merge-service.md](./06-merge-service.md#ui-design-merge-queue-panel) |
| Iteration Progress | [07-ralph-loop.md](./07-ralph-loop.md#ui-design-iteration-progress) |
| Learnings Panel | [08-memory-system.md](./08-memory-system.md#ui-design-learnings-panel) |
| Intervention Menu | [09-intervention-rollback.md](./09-intervention-rollback.md#ui-design-intervention--rollback) |

---

## Design Standards

### Layout Dimensions

| Element | Width |
|---------|-------|
| Full width | 85 characters |
| Left panel (Tasks) | 30% (~25 chars) |
| Right panel (Details/Agents) | 70% (~60 chars) |
| Modal panels | 85 characters (full width) |
| Toast notifications | 40 characters |

### Two-Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (1 line)                                                                  │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ LEFT PANEL (30%)             │ RIGHT PANEL (70%)                                │
│                              │                                                  │
│ • Task list                  │ • Task details, OR                               │
│ • Filter/search              │ • Agent grid, OR                                 │
│                              │ • Chat interface (Planning)                      │
│                              │                                                  │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ FOOTER (1 line)                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Shared Components

### Header Bar

Present in all modes, adapts content based on current mode:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ {mode} │ {context} │ {stats}                             │ ? help   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

| Mode | Content Example |
|------|-----------------|
| Init | `🔍 INIT │ Step 3/5 │ Configuring quality commands │ ? help` |
| Planning | `📊 PLANNING │ 8 tasks │ Chatting with Pat │ ? help` |
| Implementation | `😎 CHORUS │ semi-auto │ ⚙️ 2/3 agents │ 12 tasks │ ? help` |

### Footer Bar

Shows context-sensitive shortcuts and statistics:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ {stats} │ {merge queue} │ {runtime}                              │ {shortcuts} │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation Mode Footer:**
```
│ ✓5 ●3 →2 ⊗2 │ Merge: 2 queued │ Runtime: 45m              │ [?] Help [i] Menu │
```

**Planning Mode Footer:**
```
│ 8 tasks created │ 2 with deps                          │ [r] Review [ESC] Exit │
```

### Toast Notifications

Appear in bottom-right, auto-dismiss after 5 seconds:

```
┌────────────────────────────────────────┐
│ {icon} {title}                         │
│   {message line 1}                     │
│   {message line 2}                     │
└────────────────────────────────────────┘
```

| Type | Icon | Color |
|------|------|-------|
| Success | ✓ | Green |
| Error | ✗ | Red |
| Warning | ⚠ | Yellow |
| Info | ℹ | Blue |
| Learning | 💡 | Teal |
| Merge | 🔀 | Orange |

### Help Panel (?)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ? KEYBOARD SHORTCUTS                                                 │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  NAVIGATION                     AGENT CONTROL                                   │
│  j/↓  Move down                 s      Spawn agent for task                     │
│  k/↑  Move up                   x      Stop selected agent                      │
│  Tab  Switch panels             r      Redirect agent                           │
│  1-9  Quick select              Enter  Assign task to agent                     │
│                                                                                  │
│  MODE CONTROL                   TASK MANAGEMENT                                 │
│  m    Toggle semi-auto/autopilot n      New task                                │
│  Space Pause/resume             e      Edit task                                │
│  a    Start autopilot           b      Block task                               │
│                                 d      Mark done (manual)                       │
│                                                                                  │
│  VIEW                           RECOVERY                                        │
│  f    Fullscreen agent          R      Rollback menu                            │
│  g    Grid settings             c      Create checkpoint                        │
│  l    View logs                 u      Undo last action                         │
│  L    View learnings (modal)    Ctrl+L Trigger learning review                  │
│                                                                                  │
│  PLANNING                       GENERAL                                         │
│  P    Plan (if ready < 3)       ?      Toggle help                              │
│  Shift+P Force plan (always)    i      Intervention menu                        │
│                                 q      Quit (confirm if agents)                 │
│                                 M      Merge queue view                         │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Press any key to close                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Status Indicators

### Task Status

| Symbol | Status | Description | Color |
|--------|--------|-------------|-------|
| `→` | todo | Ready to assign | White |
| `●` | doing | Agent working | Blue (pulsing) |
| `✓` | done | Completed | Green |
| `⊗` | stuck | Waiting on dependencies | Yellow |
| `✗` | failed | Agent error, needs attention | Red |
| `⏱` | timeout | Agent couldn't finish in time | Orange |
| `◐` | review | Awaiting human review | Cyan |
| `○` | later | Deferred | Gray |

### Agent Status

| Symbol | Status | Description | Color |
|--------|--------|-------------|-------|
| `●` | running | Actively working | Blue (pulsing) |
| `○` | idle | Waiting for task | Gray |
| `⏸` | paused | User paused | Yellow |
| `✗` | error | Crashed/failed | Red |

### Selection Indicators

| Symbol | Meaning |
|--------|---------|
| `▸` | Selected item |
| `●` | Active/current (filled) |
| `○` | Inactive (outline) |

---

## Keyboard Shortcuts

### Global Shortcuts (All Modes)

| Key | Action | Description |
|-----|--------|-------------|
| `?` | Help | Show keyboard shortcuts |
| `q` | Quit | Exit Chorus (with confirmation) |
| `ESC` | Close/Back | Close modal or go back |

### Implementation Mode Shortcuts

| Category | Keys | Purpose |
|----------|------|---------|
| Navigation | j/k, ↑/↓, Tab, 1-9 | Move within panels |
| Mode Control | m, Space, a | Control operating mode |
| Agent Control | s, x, r, Enter | Manage agents |
| Task Management | n, e, b, d | Manage tasks |
| View | f, g, l, L | Change display |
| Recovery | R, c, u | Rollback and checkpoints |
| Planning | P, Shift+P | Planning triggers |
| General | ?, i, q, M | Help, intervention, quit |

### Modal Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down in list |
| `k` / `↑` | Move up in list |
| `Enter` | Select/confirm |
| `ESC` | Cancel/close |
| `/` | Search/filter |
| `Tab` | Switch sections |

### Shortcut Clarifications

**Planning Keys (P / Shift+P):**

| Key | Condition | Action |
|-----|-----------|--------|
| `P` | Ready tasks < threshold (default: 3) | Trigger incremental planning - Pat creates more tasks |
| `P` | Ready tasks >= threshold | No action (enough work available) |
| `Shift+P` | Always | Force planning even if enough ready tasks exist |

> **See:** [03-planning-phase.md](./03-planning-phase.md#incremental-planning-f98-f99-f100) for incremental planning details.

**Learning Keys (L / Ctrl+L):**

| Key | Action |
|-----|--------|
| `l` | View logs - Opens agent log panel (lowercase L) |
| `L` | View learnings - Opens learnings modal showing `.chorus/learnings.md` |
| `Ctrl+L` | Trigger learning review - Lou re-processes recent task logs for missed learnings |

> **See:** [08-memory-system.md](./08-memory-system.md#learning-review-trigger-f101a) for learning review details.

---

## TUI Events (XState)

```typescript
type TUIEvent =
  // Focus
  | { type: 'FOCUS_TASK_PANEL' }
  | { type: 'FOCUS_AGENT_GRID' }
  | { type: 'TOGGLE_FOCUS' }

  // Modals
  | { type: 'OPEN_HELP' }
  | { type: 'OPEN_INTERVENTION' }
  | { type: 'OPEN_LOGS'; agentId: string }
  | { type: 'OPEN_LEARNINGS' }
  | { type: 'OPEN_MERGE_VIEW' }
  | { type: 'OPEN_CONFIRM'; action: ConfirmAction }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_MODAL' }

  // Selection
  | { type: 'SELECT_TASK'; taskId: string }
  | { type: 'SELECT_AGENT'; agentId: string }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREV' }
  | { type: 'CLEAR_SELECTION' }

  // Keyboard
  | { type: 'KEY_PRESS'; key: string; ctrl?: boolean; shift?: boolean };
```

---

## Persona Colors

> **See:** [05-agent-personas.md](./05-agent-personas.md#persona-colors-in-tui) for full color definitions.

| Persona | Color Code | Usage |
|---------|------------|-------|
| 🔍 Analyzer Ace | `#6366F1` (Indigo) | Init mode |
| ⚙️ Engineer Ed | `#3B82F6` (Blue) | Agent tiles |
| 📊 Planner Pat | `#8B5CF6` (Purple) | Planning mode |
| 🔧 Fixer Finn | `#F97316` (Orange) | Merge conflicts |
| 🎯 Spotter Sam | `#22C55E` (Green) | Task selection |
| 💡 Logger Lou | `#14B8A6` (Teal) | Learnings |
| 😎 Director Dan | `#EAB308` (Gold) | App header |
| 👁️ Watcher Will | `#F59E0B` (Amber) | Health alerts |
| 📈 Counter Carl | `#64748B` (Slate) | Metrics/stats |

---

## Configuration

```json
{
  "tui": {
    "agentGrid": "auto",
    "theme": "default",
    "showProgress": true,
    "showTimestamps": true,
    "toastDuration": 5000
  }
}
```

### Grid Configuration

```
Terminal Width:  Grid Layout:
< 120 chars      1 column  (1×n)
< 180 chars      2 columns (2×n)  ← Default
≥ 180 chars      3 columns (3×n)

Press 'g' to manually change grid:
  1×1  1×2  1×3  1×4
  2×1  2×2  2×3  2×4
  auto
```

---

## XState TUI Region

> **See:** [01-architecture.md](./01-architecture.md#tui-region) for full TUI Region state machine definition including states, context, and benefits.

---

## References

- [01-architecture.md](./01-architecture.md) - XState TUI region
- [03-planning-phase.md](./03-planning-phase.md) - Init, Planning, Review mode UIs
- [04-task-management.md](./04-task-management.md) - Task panel and detail view
- [05-agent-personas.md](./05-agent-personas.md) - Agent grid and tiles, persona colors
- [06-merge-service.md](./06-merge-service.md) - Merge queue panel
- [07-ralph-loop.md](./07-ralph-loop.md) - Iteration progress UI
- [08-memory-system.md](./08-memory-system.md) - Learnings panel
- [09-intervention-rollback.md](./09-intervention-rollback.md) - Intervention menu

---

**End of TUI Visualization Module**
