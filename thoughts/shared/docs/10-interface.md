# Web Interface

Web-based UI built with htmx for real-time server-rendered updates.

---

## Starting Swarm

```bash
# Start Swarm server (opens browser automatically)
swarm

# Start on custom port
swarm --port 8080

# Start without opening browser
swarm --no-open
```

Server starts at `http://localhost:3000` by default.

---

## Layout Overview

The Web UI uses a responsive two-panel layout: Idea Panel on the left (30%) and Agent Grid on the right (70%), with Header and Footer bars.

```
┌─────────────────────────────────────────────────────────────┐
│  SWARM   semi-auto ●   Agents: 2/3   Ideas: 15             │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│   IDEA PANEL       │           AGENT GRID                   │
│                    │                                        │
│  ■ Black Need      │  ┌─────────────┐  ┌─────────────┐     │
│  ▢ Blue Feature    │  │   ed-001    │  │   ed-002    │     │
│  ▤ Green Task ●    │  │  idea-123   │  │  idea-456   │     │
│  ▤ Green Task →    │  │  iter: 3    │  │  iter: 1    │     │
│  ● Yellow Learn    │  │  [████░░]   │  │  [██░░░░]   │     │
│                    │  └─────────────┘  └─────────────┘     │
│                    │                                        │
├────────────────────┴────────────────────────────────────────┤
│  Done: 5  Running: 2  Ready: 8  Blocked: 0   ⏱ 00:23:45   │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Header Bar

Shows: App title, current mode indicator, active/max agents count, total ideas.

Mode indicator:
- `semi-auto ○` - Semi-auto mode (user controls assignment)
- `autopilot ●` - Autopilot mode (fully autonomous)

### Idea Panel (Left - 30%)

Lists ideas organized by color with status indicators. Click to select, double-click to expand details.

#### Color Symbols

| Symbol | Color | Name |
|--------|-------|------|
| `■` | ⬛ Black | Raw need |
| `□` | ⬜ Gray | Plan draft |
| `◆` | 🟧 Orange | Research needed |
| `◇` | 🟪 Purple | Decision pending |
| `▣` | 🟥 Red | Deferred |
| `▢` | 🟦 Blue | Feature |
| `▤` | 🟩 Green | Atomic task |
| `●` | 🟡 Yellow | Learning |

#### Status Symbols

| Symbol | Status | Meaning |
|--------|--------|---------|
| `→` | pending | Ready |
| `●` | active | Running |
| `✓` | done | Completed |
| `⊗` | blocked | Blocked |
| `✗` | failed | Error (Green only) |
| `⏱` | timeout | Timed out (Green only) |
| `◐` | review | Awaiting review (Green only) |

### Agent Grid (Right - 70%)

Shows active agents in a responsive grid. Each card displays:
- Agent ID and persona emoji
- Current idea being worked on
- Iteration count and elapsed time
- Progress bar
- Current activity/status

Cards are clickable to view agent details and logs.

### Footer Bar

Shows: Idea statistics (done/running/ready/blocked counts), merge queue status, session runtime.

---

## Real-Time Updates

The UI updates in real-time using Server-Sent Events (SSE):

```
Browser ←─────── SSE ──────── Server
         idea-updated
         agent-progress
         merge-complete
         learning-added
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
| `L` | Open learnings panel |
| `M` | Open merge queue |
| `S` | Open settings |

### Idea Panel Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Assign selected idea to agent |
| `e` | Edit selected idea |
| `d` | Mark as deferred (Red) |
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

### Learnings Panel (`L`)
Browse and manage Yellow ideas (learnings):
- Filter by scope (local/global)
- Search by content
- Mark as outdated/archived

### Merge Panel (`M`)
View merge queue status:
- Pending merges
- Conflict resolution status
- Force merge options

### Settings Panel (`S`)
Configure Swarm options:
- Mode toggle (semi-auto/autopilot)
- Max parallel agents
- Quality commands
- Review settings

---

## Confirmation Dialogs

Dangerous actions require confirmation:
- Quit Swarm
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
- `default` - Dark theme with Swarm colors
- `light` - Light theme for bright environments
- `high-contrast` - Accessibility-focused

Custom themes can be added via `.swarm/themes/`.

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
│  ⚙️ ed-001                              idea-042  ●     │
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
│  04:15  LEARNING_LOCAL:This API uses JWT auth           │
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
| `signal` | Blue badge | PROGRESS, LEARNING, etc. |

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
│  Agent Logs: ed-001 / idea-042               [✕ Close] │
├─────────────────────────────────────────────────────────┤
│  Filter: [all ▼]  Search: [________]     [Download]    │
├─────────────────────────────────────────────────────────┤
│  2026-01-25 10:00:00  [START] Iteration 1              │
│  2026-01-25 10:00:05  > Reading idea context...        │
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

Logs are stored in `.swarm/agents/{persona}/logs/{ideaId}.jsonl`:

```json
{"ts":"2026-01-25T10:00:00Z","level":"info","event":"start","iteration":1}
{"ts":"2026-01-25T10:00:05Z","level":"info","line":"> Reading idea context..."}
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
│  abc1234  feat: add login validation #idea-042 @ed-001 │
│           +45 -12  src/auth.ts, src/auth.test.ts       │
│  def5678  fix: handle empty email #idea-042 @ed-001    │
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
| `/api/ideas` | GET | List ideas |
| `/api/ideas/:id` | GET/PUT | Idea details |
| `/api/agents` | GET | List agents |
| `/api/agents/:id` | GET | Agent details |
| `/api/agents/:id/logs` | GET | Agent logs |
| `/api/events` | SSE | Real-time updates |
| `/api/action/assign` | POST | Assign idea to agent |
| `/api/action/stop` | POST | Stop agent |
| `/api/action/rollback` | POST | Rollback to checkpoint |
