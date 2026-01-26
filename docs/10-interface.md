# Web Interface

Web-based UI built with htmx for real-time server-rendered updates.

---

## Starting AXIOM

```bash
# Start AXIOM server (opens browser automatically)
axiom

# Start on custom port
axiom --port 8080

# Start without opening browser
axiom --no-open
```

Server starts at `http://localhost:3000` by default.

---

## Layout Overview

The Web UI uses a responsive two-panel layout: Task Panel on the left (30%) and Agent Grid on the right (70%), with Header and Footer bars.

```
┌─────────────────────────────────────────────────────────────┐
│  AXIOM   semi-auto ●   Agents: 2/3   Tasks: 15              │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│   TASK PANEL       │           AGENT GRID                   │
│                    │                                        │
│  ■ Directive       │  ┌─────────────┐  ┌─────────────┐     │
│  ▢ Operation       │  │  echo-001   │  │  echo-002   │     │
│  ▤ Task ●          │  │  task-123   │  │  task-456   │     │
│  ▤ Task →          │  │  iter: 3    │  │  iter: 1    │     │
│  ● Discovery       │  │  [████░░]   │  │  [██░░░░]   │     │
│                    │  └─────────────┘  └─────────────┘     │
│                    │                                        │
├────────────────────┴────────────────────────────────────────┤
│  Done: 5  Running: 2  Ready: 8  Blocked: 0   ⏱ 00:23:45   │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Header Bar

Shows: App title, current mode indicator, active/max agents count, total cases.

Mode indicator:
- `semi-auto ○` - Semi-auto mode (user controls assignment)
- `autopilot ●` - Autopilot mode (fully autonomous)

### Task Panel (Left - 30%)

Lists cases organized by type with status indicators. Click to select, double-click to expand details.

#### Type Symbols

| Symbol | Color | Type |
|--------|-------|------|
| `■` | ⬛ | Directive |
| `□` | ⬜ | Draft |
| `◆` | 🟧 | Research |
| `◇` | 🟪 | Pending |
| `▣` | 🟥 | Deferred |
| `▢` | 🟦 | Operation |
| `▤` | 🟩 | Task |
| `●` | 🟡 | Discovery |

#### Status Symbols

| Symbol | Status | Meaning |
|--------|--------|---------|
| `→` | pending | Ready |
| `●` | active | Running |
| `✓` | done | Completed |
| `⊗` | blocked | Blocked |
| `✗` | failed | Error (Task only) |
| `⏱` | timeout | Timed out (Task only) |
| `◐` | review | Awaiting review (Task only) |

### Agent Grid (Right - 70%)

Shows active agents in a responsive grid. Each card displays:
- Agent ID and persona emoji
- Current Task being worked on
- Iteration count and elapsed time
- Progress bar
- Current activity/status

Cards are clickable to view agent details and logs.

### Footer Bar

Shows: Task statistics (done/running/ready/blocked counts), integration queue status, session runtime.

---

## Real-Time Updates

The UI updates in real-time using Server-Sent Events (SSE):

```
Browser ←─────── SSE ──────── Server
         task-updated
         agent-progress
         merge-complete
         discovery-added
```

No page refreshes needed. htmx handles partial DOM updates automatically.

---

## Keyboard Shortcuts

Global shortcuts work anywhere in the UI:

| Key | Action |
|-----|--------|
| `?` | Toggle help panel |
| `Esc` | Close modal / Cancel action |
| `Space` | Toggle autopilot (with confirmation) |
| `P` | Open planning mode |
| `L` | Open discoveries panel |
| `M` | Open integration queue |
| `S` | Open settings |

### Task Panel Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Assign selected Task to agent |
| `e` | Edit selected case |
| `d` | Mark as Deferred |
| `b` | Mark as blocked |

### Agent Grid Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Cycle focus between panels |
| `1-9` | Quick select agent by position |
| `i` | Open intervention panel for selected agent |
| `x` | Stop selected agent (with confirmation) |

---

## Modal Panels

Click buttons or use keyboard shortcuts to open:

### Help Panel (`?`)
Shows all keyboard shortcuts and quick reference.

### Intervention Panel (`i`)
Allows human intervention on running agent:
- Send message to agent
- Pause/resume execution
- Rollback to checkpoint
- Force stop

### Discoveries Panel (`L`)
Browse and manage Discovery cases:
- Filter by scope (local/global)
- Search by content
- Mark as outdated/archived

### Integration Panel (`M`)
View integration queue status:
- Pending merges
- Conflict resolution status
- Force merge options

### Settings Panel (`S`)
Configure AXIOM options:
- Mode toggle (semi-auto/autopilot)
- Max parallel agents
- Verification commands
- Review settings

---

## Confirmation Dialogs

Dangerous actions require confirmation:
- Quit AXIOM
- Stop running agent
- Rollback to checkpoint
- Enable autopilot mode
- Force merge with conflicts

---

## Grid Layout

Agent grid adapts to viewport width:
- < 768px: 1 column (mobile)
- < 1200px: 2 columns (tablet)
- ≥ 1200px: 3 columns (desktop)

Configurable via settings: auto, 1x1, 2x2, 3x2, etc.

---

## Toast Notifications

Temporary notifications appear at top-right with icons and colors:

| Type | Color | Icon | Duration |
|------|-------|------|----------|
| Success | Green | ✓ | 3s |
| Warning | Yellow | ⚠ | 5s |
| Error | Red | ✗ | 8s |
| Info | Blue | ℹ | 3s |

Duration configurable via `ui.toastDuration` in config.

---

## Themes

Built-in themes:
- `default` - Dark theme with AXIOM colors
- `light` - Light theme for bright environments
- `high-contrast` - Accessibility-focused

Custom themes can be added via `.axiom/themes/`.

---

## Mobile Support

The Web UI is responsive and works on tablets and mobile devices:
- Touch-friendly buttons and controls
- Collapsible panels on small screens
- Swipe gestures for navigation (planned)

---

## Agent Output Visibility

Real-time visibility into agent execution via log streaming and output display.

### Agent Card Expanded View

Click an agent card to expand and see:

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ echo-001                             task-042  ●    │
├─────────────────────────────────────────────────────────┤
│  Iteration: 5 of 50                    Elapsed: 04:32   │
│  Progress: [████████████░░░░░░░░] 60%                   │
├─────────────────────────────────────────────────────────┤
│  LIVE OUTPUT                                    [pause] │
│  ─────────────────────────────────────────────────────  │
│  > Running tests...                                     │
│  ✓ auth.test.ts passed (4 tests)                       │
│  ✓ user.test.ts passed (2 tests)                       │
│  > Running typecheck...                                 │
│  ─────────────────────────────────────────────────────  │
│  [Scroll for history]                                   │
├─────────────────────────────────────────────────────────┤
│  SIGNALS                                                │
│  ─────────────────────────────────────────────────────  │
│  04:30  PROGRESS:60                                     │
│  04:15  DISCOVERY_LOCAL:This API uses JWT auth          │
│  04:00  PROGRESS:50                                     │
├─────────────────────────────────────────────────────────┤
│  [View Full Logs]  [Intervene]  [Stop]                  │
└─────────────────────────────────────────────────────────┘
```

### Log Streaming

Agent output streams in real-time via SSE:

```
Browser ←──── SSE: /api/agents/:id/stream ──── Server
              event: output
              data: {"line": "> Running tests...", "ts": "..."}

              event: signal
              data: {"type": "PROGRESS", "payload": "60"}

              event: iteration
              data: {"number": 5, "status": "running"}
```

### Log Levels

| Level | Display | Examples |
|-------|---------|----------|
| `info` | Normal text | General progress |
| `success` | Green | Tests passed, commit made |
| `warning` | Yellow | Retry, slow operation |
| `error` | Red | Test failed, command error |
| `signal` | Blue badge | PROGRESS, DISCOVERY, etc. |

### Log Filtering

Filter logs by level or content:

```
┌─────────────────────────────────────────────┐
│ Filter: [all ▼]  Search: [________] [Clear] │
│                                             │
│ □ info  ☑ success  ☑ warning  ☑ error      │
└─────────────────────────────────────────────┘
```

### Full Log Modal

Click "View Full Logs" to open modal with complete history:

```
┌─────────────────────────────────────────────────────────┐
│  Agent Logs: echo-001 / task-042              [✕ Close] │
├─────────────────────────────────────────────────────────┤
│  Filter: [all ▼]  Search: [________]     [Download]    │
├─────────────────────────────────────────────────────────┤
│  2026-01-25 10:00:00  [START] Iteration 1              │
│  2026-01-25 10:00:05  > Reading Task context...        │
│  2026-01-25 10:00:10  > Analyzing acceptance criteria  │
│  2026-01-25 10:00:30  [SIGNAL] PROGRESS:25             │
│  2026-01-25 10:00:45  > Writing test: auth.test.ts     │
│  2026-01-25 10:01:00  > Running tests...               │
│  2026-01-25 10:01:05  ✗ Test failed: expected true     │
│  2026-01-25 10:01:10  [SIGNAL] PROGRESS:30             │
│  2026-01-25 10:01:15  > Fixing implementation...       │
│  ...                                                   │
├─────────────────────────────────────────────────────────┤
│  Showing 1-50 of 234 entries      [< Prev] [Next >]    │
└─────────────────────────────────────────────────────────┘
```

### Log Persistence

Logs are stored in `.axiom/agents/{persona}/logs/{taskId}.jsonl`:

```json
{"ts":"2026-01-25T10:00:00Z","level":"info","event":"start","iteration":1}
{"ts":"2026-01-25T10:00:05Z","level":"info","line":"> Reading Task context..."}
{"ts":"2026-01-25T10:00:30Z","level":"signal","type":"PROGRESS","payload":"25"}
{"ts":"2026-01-25T10:01:05Z","level":"error","line":"✗ Test failed: expected true"}
```

### Output Truncation

Long outputs are truncated with "Show more":

```
> Building project...
  Compiling src/index.ts
  Compiling src/auth.ts
  ... (47 more lines)  [Show more]
  Build complete in 3.2s
```

### Commit Activity

Commits made by agent are highlighted:

```
┌─────────────────────────────────────────────────────────┐
│  COMMITS                                                │
│  ─────────────────────────────────────────────────────  │
│  abc1234  feat: add login validation #task-042 @echo-001│
│           +45 -12  src/auth.ts, src/auth.test.ts       │
│  def5678  fix: handle empty email #task-042 @echo-001  │
│           +8 -2   src/auth.ts                          │
└─────────────────────────────────────────────────────────┘
```

### Download Logs

Export logs for debugging:

| Format | Description |
|--------|-------------|
| `.jsonl` | Raw log entries |
| `.txt` | Plain text, human readable |
| `.html` | Formatted with colors |

---

## API Endpoints

The Web UI communicates with these internal endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Main UI |
| `/api/cases` | GET | List cases |
| `/api/cases/:id` | GET/PUT | Case details |
| `/api/agents` | GET | List agents |
| `/api/agents/:id` | GET | Agent details |
| `/api/agents/:id/logs` | GET | Agent logs |
| `/api/events` | SSE | Real-time updates |
| `/api/action/assign` | POST | Assign Task to agent |
| `/api/action/stop` | POST | Stop agent |
| `/api/action/rollback` | POST | Rollback to checkpoint |
