# Web Interface

Web-based UI built with HTMX for real-time server-rendered updates. No JavaScript frameworks—just HTML fragments and SSE.

---

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser       │  HTTP   │   Go Server     │   RPC   │   Daemon        │
│   (HTMX)        │◄───────►│   (net/http)    │◄───────►│   (Orchestrator)│
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                          │
         │ SSE                      │ Mutations
         ◄──────────────────────────┘
```

**Key design principles:**

1. **Server-rendered HTML** — No JSON APIs for UI, endpoints return HTML fragments
2. **Single-writer daemon** — All state changes go through daemon RPC
3. **Mutation-based updates** — SSE pushes HTML fragments when state changes
4. **Progressive enhancement** — Works without JS (degraded), enhanced with HTMX

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

No page refreshes needed. HTMX handles partial DOM updates automatically.

---

## HTMX Patterns

### HTML Fragment Endpoints

All UI endpoints return HTML fragments, not JSON:

```go
// Server: Return HTML fragment
func handleTaskList(w http.ResponseWriter, r *http.Request) {
    tasks := daemon.List(&rpc.ListArgs{Status: "open"})

    w.Header().Set("Content-Type", "text/html")
    tmpl.ExecuteTemplate(w, "partials/task-list.html", tasks)
}
```

```html
<!-- Browser: Request HTML fragment -->
<div hx-get="/partials/tasks"
     hx-trigger="load"
     hx-swap="innerHTML">
    Loading tasks...
</div>
```

### SSE for Real-Time Updates

```html
<!-- Connect to SSE stream -->
<div hx-ext="sse" sse-connect="/api/events">

    <!-- Task panel updates on task-updated event -->
    <div id="task-panel"
         hx-get="/partials/tasks"
         hx-trigger="sse:task-updated"
         hx-swap="innerHTML">
    </div>

    <!-- Agent grid updates on agent-progress event -->
    <div id="agent-grid"
         hx-get="/partials/agents"
         hx-trigger="sse:agent-progress"
         hx-swap="innerHTML">
    </div>

</div>
```

```go
// Server: SSE endpoint with mutation polling
func handleSSE(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    flusher := w.(http.Flusher)
    lastPoll := int64(0)

    for {
        mutations := daemon.GetMutations(&rpc.GetMutationsArgs{Since: lastPoll})

        for _, m := range mutations {
            // Send event type based on mutation
            eventType := mutationToEvent(m.Operation)
            fmt.Fprintf(w, "event: %s\n", eventType)
            fmt.Fprintf(w, "data: %s\n\n", m.IssueID)
            flusher.Flush()

            lastPoll = m.Timestamp.UnixMilli()
        }

        time.Sleep(500 * time.Millisecond)
    }
}
```

### Actions with HTMX

```html
<!-- Assign task to agent -->
<button hx-post="/api/action/assign"
        hx-vals='{"taskId": "task-123", "agentId": "echo-001"}'
        hx-swap="none"
        hx-confirm="Assign task-123 to echo-001?">
    Assign
</button>

<!-- Stop agent with confirmation -->
<button hx-post="/api/action/stop"
        hx-vals='{"agentId": "echo-001"}'
        hx-confirm="Stop agent echo-001?"
        hx-swap="none">
    Stop
</button>

<!-- Inline edit task title -->
<h3 hx-get="/partials/task-edit/task-123"
    hx-trigger="dblclick"
    hx-swap="outerHTML">
    Task Title
</h3>
```

### Out-of-Band Updates

When an action affects multiple parts of the UI:

```go
// Server: Return multiple fragments with hx-swap-oob
func handleAssignTask(w http.ResponseWriter, r *http.Request) {
    // ... perform assignment ...

    // Return primary response + OOB updates
    tmpl.ExecuteTemplate(w, "partials/assign-response.html", map[string]any{
        "task":  task,
        "agent": agent,
        "stats": stats,  // For footer update
    })
}
```

```html
<!-- partials/assign-response.html -->
<div>Task assigned successfully</div>

<!-- Out-of-band updates -->
<div id="agent-{{.agent.ID}}" hx-swap-oob="true">
    {{template "partials/agent-card.html" .agent}}
</div>

<div id="footer-stats" hx-swap-oob="true">
    {{template "partials/stats.html" .stats}}
</div>
```

### Loading States

```html
<button hx-post="/api/action/assign"
        hx-indicator="#spinner">
    <span class="htmx-indicator" id="spinner">⏳</span>
    Assign Task
</button>
```

### Error Handling

```html
<div hx-post="/api/action/stop"
     hx-target="#result"
     hx-target-error="#error">
</div>

<div id="result"></div>
<div id="error" class="error-message"></div>
```

---

## Error Recovery

### SSE Connection Recovery

SSE connections can drop due to network issues. HTMX SSE extension handles reconnection automatically:

```html
<!-- SSE with auto-reconnect -->
<div hx-ext="sse"
     sse-connect="/api/events"
     sse-reconnect="true">

    <!-- Connection status indicator -->
    <div id="connection-status"
         class="sse-connected">
        Connected
    </div>

</div>
```

**Reconnection behavior:**

| Scenario | Behavior |
|----------|----------|
| Connection lost | Auto-reconnect after 3 seconds |
| Server restart | Reconnect when server available |
| Auth expired | Redirect to login |
| Too many failures | Show manual reconnect button |

**Connection status handling:**

```html
<script>
document.body.addEventListener('htmx:sseOpen', function() {
    document.getElementById('connection-status').className = 'sse-connected';
    document.getElementById('connection-status').textContent = 'Connected';
});

document.body.addEventListener('htmx:sseError', function() {
    document.getElementById('connection-status').className = 'sse-disconnected';
    document.getElementById('connection-status').textContent = 'Reconnecting...';
});
</script>
```

**Stale UI detection:**

When reconnecting, HTMX triggers a full refresh of SSE-dependent elements:

```html
<div hx-get="/partials/tasks"
     hx-trigger="sse:task-updated, sse:reconnected"
     hx-swap="innerHTML">
</div>
```

### Server Error Handling

```html
<!-- Target different elements for success vs error -->
<button hx-post="/api/action/assign"
        hx-target="#result"
        hx-target-error="#error-panel"
        hx-swap="innerHTML">
    Assign Task
</button>

<div id="result"></div>
<div id="error-panel" class="error-message"></div>
```

**Server-side error responses:**

```go
func handleAssign(w http.ResponseWriter, r *http.Request) {
    result, err := daemon.Assign(args)
    if err != nil {
        // Return error fragment with 4xx/5xx status
        w.WriteHeader(http.StatusBadRequest)
        tmpl.ExecuteTemplate(w, "partials/error.html", map[string]any{
            "Message": err.Error(),
            "Retry":   true,
        })
        return
    }

    // Success response
    tmpl.ExecuteTemplate(w, "partials/assign-result.html", result)
}
```

**Error fragment template:**

```html
<!-- templates/partials/error.html -->
<div class="error-message">
    <span class="error-icon">✗</span>
    <span class="error-text">{{.Message}}</span>
    {{if .Retry}}
    <button hx-get="{{.RetryURL}}" hx-swap="outerHTML">
        Retry
    </button>
    {{end}}
</div>
```

**HTTP status handling:**

| Status | Behavior |
|--------|----------|
| 200 | Success, update target |
| 4xx | Client error, update error target |
| 5xx | Server error, show retry option |
| Timeout | Show timeout message with retry |

### Request Timeout Handling

```html
<button hx-post="/api/action/assign"
        hx-timeout="10000"
        hx-on:htmx:timeout="handleTimeout(event)">
    Assign Task
</button>

<script>
function handleTimeout(event) {
    document.getElementById('error-panel').innerHTML =
        '<div class="timeout-error">Request timed out. <a href="#" onclick="retryRequest()">Retry</a></div>';
}
</script>
```

### Progressive Enhancement

AXIOM works without JavaScript (degraded) and enhances with HTMX:

**Without JS (fallback):**
- Full page reloads for navigation
- Standard form submissions
- No real-time updates (manual refresh)

**With JS (enhanced):**
- Partial DOM updates via HTMX
- Real-time SSE updates
- Loading indicators and transitions

**Fallback form example:**

```html
<!-- Works with or without JS -->
<form action="/api/action/assign" method="POST"
      hx-post="/api/action/assign"
      hx-swap="none">
    <input type="hidden" name="taskId" value="{{.TaskID}}">
    <button type="submit">Assign Task</button>
</form>
```

**Detecting JS availability:**

```html
<noscript>
    <div class="no-js-warning">
        JavaScript is disabled. Real-time updates are unavailable.
        <a href="javascript:location.reload()">Refresh</a> to see latest state.
    </div>
</noscript>
```

### Client Error Recovery

```html
<!-- Global error handler -->
<script>
document.body.addEventListener('htmx:responseError', function(evt) {
    const status = evt.detail.xhr.status;
    const target = document.getElementById('global-error');

    if (status === 0) {
        target.innerHTML = 'Network error. Check your connection.';
    } else if (status >= 500) {
        target.innerHTML = 'Server error. Please try again.';
    } else if (status === 401) {
        window.location.href = '/login';
    }

    target.style.display = 'block';
    setTimeout(() => target.style.display = 'none', 5000);
});
</script>
```

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

### Page Routes (Full HTML)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Main dashboard |
| `/planning` | GET | Planning mode page |
| `/settings` | GET | Settings page |
| `/agents/:id` | GET | Agent detail page |

### Partial Routes (HTML Fragments)

Used by HTMX for dynamic updates:

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/partials/tasks` | GET | Task panel HTML |
| `/partials/tasks/:id` | GET | Single task row |
| `/partials/agents` | GET | Agent grid HTML |
| `/partials/agents/:id` | GET | Single agent card |
| `/partials/stats` | GET | Footer stats |
| `/partials/discoveries` | GET | Discoveries list |
| `/partials/merge-queue` | GET | Integration queue |

### SSE Stream

| Endpoint | Purpose |
|----------|---------|
| `/api/events` | Real-time mutation events |

Event types pushed:
- `task-created`, `task-updated`, `task-closed`
- `agent-started`, `agent-progress`, `agent-stopped`
- `merge-queued`, `merge-complete`, `merge-conflict`
- `discovery-added`

### Action Endpoints

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/action/assign` | POST | Assign task to agent | Updated fragments |
| `/api/action/stop` | POST | Stop agent | Confirmation |
| `/api/action/rollback` | POST | Rollback to checkpoint | Status |
| `/api/action/intervene` | POST | Send message to agent | Confirmation |
| `/api/action/toggle-mode` | POST | Switch semi-auto/autopilot | Header update |
| `/api/action/defer` | POST | Defer a task | Task row update |

### Daemon RPC (Internal)

The Go server communicates with daemon via Unix socket:

```
Server ──── /tmp/axiom.sock ──── Daemon

Operations:
- list, show, create, update, close
- ready, blocked, stats
- get_mutations (for SSE)
- assign, stop, intervene
```

---

## Go Server Implementation

### Project Structure

```
cmd/
  axiom/
    main.go           # Entry point
internal/
  web/
    server.go         # HTTP server setup
    handlers.go       # Route handlers
    sse.go            # SSE implementation
    templates.go      # Template loading
  rpc/
    client.go         # Daemon RPC client
    protocol.go       # RPC types
  daemon/
    daemon.go         # Orchestrator daemon
web/
  templates/
    layouts/
      base.html       # Base layout
    pages/
      index.html      # Dashboard page
      planning.html   # Planning page
    partials/
      task-list.html  # Task panel fragment
      agent-card.html # Agent card fragment
      stats.html      # Footer stats fragment
  static/
    htmx.min.js       # HTMX library
    sse.js            # HTMX SSE extension
    style.css         # Styles
```

### Server Setup

```go
package web

import (
    "embed"
    "html/template"
    "net/http"
)

//go:embed templates static
var webFS embed.FS

func NewServer(daemon *rpc.Client) *Server {
    s := &Server{
        daemon: daemon,
        tmpl:   template.Must(template.ParseFS(webFS, "templates/**/*.html")),
    }

    mux := http.NewServeMux()

    // Pages
    mux.HandleFunc("/", s.handleIndex)
    mux.HandleFunc("/planning", s.handlePlanning)
    mux.HandleFunc("/settings", s.handleSettings)

    // Partials (HTML fragments)
    mux.HandleFunc("/partials/tasks", s.handleTasksPartial)
    mux.HandleFunc("/partials/agents", s.handleAgentsPartial)
    mux.HandleFunc("/partials/stats", s.handleStatsPartial)

    // SSE
    mux.HandleFunc("/api/events", s.handleSSE)

    // Actions
    mux.HandleFunc("/api/action/assign", s.handleAssign)
    mux.HandleFunc("/api/action/stop", s.handleStop)

    // Static files
    mux.Handle("/static/", http.FileServer(http.FS(webFS)))

    s.handler = mux
    return s
}
```

### Template Rendering

```go
// Render full page
func (s *Server) renderPage(w http.ResponseWriter, name string, data any) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    s.tmpl.ExecuteTemplate(w, name, data)
}

// Render partial (for HTMX)
func (s *Server) renderPartial(w http.ResponseWriter, name string, data any) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    s.tmpl.ExecuteTemplate(w, name, data)
}

// Render with OOB updates
func (s *Server) renderWithOOB(w http.ResponseWriter, primary string, oob []string, data any) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")

    // Primary response
    s.tmpl.ExecuteTemplate(w, primary, data)

    // Out-of-band updates
    for _, name := range oob {
        s.tmpl.ExecuteTemplate(w, name, data)
    }
}
```

### SSE Implementation

```go
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "SSE not supported", http.StatusInternalServerError)
        return
    }

    ctx := r.Context()
    lastPoll := int64(0)
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            mutations, _ := s.daemon.GetMutations(&rpc.GetMutationsArgs{Since: lastPoll})

            for _, m := range mutations {
                event := operationToEvent(m.Operation)
                fmt.Fprintf(w, "event: %s\n", event)
                fmt.Fprintf(w, "data: %s\n\n", m.IssueID)
                flusher.Flush()

                if m.Timestamp.UnixMilli() > lastPoll {
                    lastPoll = m.Timestamp.UnixMilli()
                }
            }
        }
    }
}

func operationToEvent(op string) string {
    switch op {
    case "create":
        return "task-created"
    case "update":
        return "task-updated"
    case "close":
        return "task-closed"
    default:
        return "update"
    }
}
```

### Base Template

```html
<!-- templates/layouts/base.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AXIOM - {{.Title}}</title>
    <link rel="stylesheet" href="/static/style.css">
    <script src="/static/htmx.min.js"></script>
    <script src="/static/sse.js"></script>
</head>
<body hx-ext="sse" sse-connect="/api/events">
    {{template "header" .}}

    <main>
        {{template "content" .}}
    </main>

    {{template "footer" .}}
</body>
</html>
```

### Task List Partial

```html
<!-- templates/partials/task-list.html -->
<ul class="task-list"
    hx-get="/partials/tasks"
    hx-trigger="sse:task-created, sse:task-updated, sse:task-closed"
    hx-swap="outerHTML">

    {{range .Tasks}}
    <li class="task-item task-{{.Status}}"
        hx-get="/partials/tasks/{{.ID}}"
        hx-trigger="click"
        hx-target="#task-detail"
        hx-swap="innerHTML">

        <span class="task-type">{{.TypeSymbol}}</span>
        <span class="task-title">{{.Title}}</span>
        <span class="task-status">{{.StatusSymbol}}</span>
    </li>
    {{end}}

</ul>
```

---

## Dependencies

Minimal external dependencies:

| Package | Purpose |
|---------|---------|
| `net/http` | HTTP server (stdlib) |
| `html/template` | Server-side templates (stdlib) |
| `embed` | Embedded static files (stdlib) |
| **HTMX** | Client-side interactivity (JS, ~14kb) |

No build step required. No npm. No bundler.
