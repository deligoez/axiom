# Chorus Agent Personas

**Module:** 05-agent-personas.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [04-task-management.md](./04-task-management.md), [08-memory-system.md](./08-memory-system.md)

---

## Overview

Chorus uses a multi-persona architecture where each agent has a distinct personality and role. Personas enhance user experience, make logs more readable, and create a cohesive "team" feeling.

### Naming Convention

All personas follow an **alliterative naming pattern**: `[Role] [Name]` where both words start with the same letter. This makes names memorable and instantly conveys the agent's function.

### Benefits

| Benefit | Impact |
|---------|--------|
| User engagement | More enjoyable to watch agents work |
| Log readability | "Fixer Finn resolved merge conflict" vs "resolver-ch-123 resolved" |
| Team feel | Agents feel like collaborators, not tools |
| Debugging | Easier to track which agent did what |
| Customization | Users can edit persona prompts and rules |

---

## UI Design: Agent Display

This section defines how agents are visualized in the Implementation Mode TUI.

### Agent Grid Layout (Right Side - 70%)

The agent grid shows all active agents in a tiling layout. Grid configuration adapts to terminal width.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS │ implementation │ semi-auto │ ⚙️ 3/4 agents │ 12 tasks     │ ? help │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ Tasks (12)                   │ Agents (3/4)                                     │
│ ────────────────────────────-│──────────────────────────────────────────────────│
│ → ch-001 F01: User model     │ ┌─────────────────────┬─────────────────────┐    │
│ → ch-002 F02: JWT token...   │ │ ⚙️ ed-001             │ ⚙️ ed-002             │    │
│ → ch-003 F03: Login endp...  │ │ ch-004 Register     │ ch-006 Refresh      │    │
│ ● ch-004 F04: Register...    │ │ iter 7/50 │ 12m     │ iter 3/50 │ 5m      │    │
│ ✓ ch-005 F05: JWT valid...   │ │ ▓▓▓▓▓░░░░░ 50%     │ ▓▓░░░░░░░░ 20%      │    │
│ ● ch-006 F06: Refresh...     │ │                     │                     │    │
│ ⊗ ch-007 F07: Logout...      │ │ Running tests...    │ Creating types...   │    │
│ ⊗ ch-008 F08: Protected...   │ │ $ npm test          │ Adding validati...  │    │
│ ● ch-009 F09: Rate lim...    │ │ ✓ 4/6 tests passed  │                     │    │
│ ✗ ch-010 F10: Error han...   │ ├─────────────────────┼─────────────────────┤    │
│ ⏱ ch-011 F11: Timeout...     │ │ ⚙️ ed-003             │ [empty slot]        │    │
│ ○ ch-012 F12: Future...      │ │ ch-009 Rate limit   │                     │    │
│                              │ │ iter 1/50 │ 2m      │ Press 's' to spawn  │    │
│                              │ │ ░░░░░░░░░░ 0%      │ new agent           │    │
│                              │ │                     │                     │    │
│                              │ │ Starting task...    │                     │    │
│                              │ │                     │                     │    │
│                              │ └─────────────────────┴─────────────────────┘    │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ ✓5 ●3 →2 ⊗2 │ [Tab] Switch [s] Spawn [x] Stop [f] Fullscreen [l] Logs          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Tile States

#### Idle Agent Tile

```
┌─────────────────────────┐
│ ⚙️ ed-001                 │
│ ────────────────────────│
│                         │
│       ○ IDLE            │
│                         │
│  Waiting for task...    │
│                         │
│  Press Enter to assign  │
│                         │
└─────────────────────────┘
```

#### Working Agent Tile

```
┌─────────────────────────┐
│ ⚙️ ed-001                 │
│ ch-004 Register endpoint│
│ iter 7/50 │ 12m 34s     │
│ ▓▓▓▓▓░░░░░ 50%         │
│ ────────────────────────│
│ Running tests...        │
│ $ npm test              │
│ ✓ 4/6 tests passed      │
│                         │
└─────────────────────────┘
```

#### Completed Task (Brief)

```
┌─────────────────────────┐
│ ⚙️ ed-001                 │
│ ch-004 Register ✓       │
│ ────────────────────────│
│                         │
│   ✓ COMPLETE            │
│   8 iterations          │
│   Duration: 15m 23s     │
│                         │
│  Picking next task...   │
└─────────────────────────┘
```

#### Failed Agent Tile

```
┌─────────────────────────┐
│ ⚙️ ed-003                 │
│ ch-010 Error handling   │
│ iter 12/50 │ 25m        │
│ ────────────────────────│
│                         │
│   ✗ FAILED              │
│   Max iterations hit    │
│                         │
│ [r] Retry [x] Stop      │
└─────────────────────────┘
```

#### Blocked Agent Tile

```
┌─────────────────────────┐
│ ⚙️ ed-002                 │
│ ch-007 Logout endpoint  │
│ ────────────────────────│
│                         │
│   ⊗ BLOCKED             │
│   Waiting on: ch-003    │
│                         │
│ [x] Stop [r] Redirect   │
└─────────────────────────┘
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

### Agent Fullscreen View (Press 'f')

When viewing a single agent in fullscreen mode:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ ed-001 │ ch-004: Register endpoint │ iter 7/50 │ 12m 34s           │ ESC exit │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Progress: ▓▓▓▓▓░░░░░░░░░░░░░░░ 50%                                            │
│                                                                                  │
│  Branch:   agent/ed-001/ch-004                                                   │
│  Worktree: .worktrees/ed-001-ch-004                                              │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  LIVE OUTPUT                                                                     │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  [10:15:32] Starting iteration 7...                                             │
│  [10:15:33] Reading src/routes/auth.ts                                          │
│  [10:15:35] Modifying registerUser function                                      │
│  [10:15:40] Running quality checks...                                            │
│  [10:15:41] $ npm test                                                           │
│  [10:15:45]                                                                      │
│             PASS  src/routes/auth.test.ts                                        │
│               ✓ should register new user (15ms)                                  │
│               ✓ should reject duplicate email (8ms)                              │
│               ✓ should validate password strength (5ms)                          │
│               ✓ should hash password before storing (12ms)                       │
│               ✗ should send verification email (failed)                          │
│               ✗ should create user session (failed)                              │
│                                                                                  │
│             Tests: 4 passed, 2 failed, 6 total                                   │
│                                                                                  │
│  [10:15:48] Tests failed - analyzing failures...                                 │
│  [10:15:50] <chorus>PROGRESS:50</chorus>                                        │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [ESC] Back [x] Stop agent [r] Redirect to task [l] View full logs               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Log Panel (Press 'l')

Modal showing full agent logs with scrollback:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📜 LOGS: ⚙️ ed-001 │ ch-004: Register endpoint                         │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [10:00:00] ─────────── ITERATION 1 ───────────                                 │
│  [10:00:01] Task assigned: ch-004 Register endpoint                             │
│  [10:00:02] Created worktree: .worktrees/ed-001-ch-004                           │
│  [10:00:03] Created branch: agent/ed-001/ch-004                                  │
│  [10:00:05] Reading task description...                                          │
│  [10:00:10] Planning implementation approach...                                  │
│  [10:00:15] Creating src/routes/auth.ts                                          │
│  [10:00:30] Running: npm test                                                    │
│  [10:00:45] Tests: 0 passed, 6 failed                                           │
│  [10:00:46] <chorus>PROGRESS:10</chorus>                                        │
│                                                                                  │
│  [10:01:00] ─────────── ITERATION 2 ───────────                                 │
│  [10:01:01] Analyzing test failures...                                          │
│  [10:01:10] Updating registerUser function...                                    │
│  [10:01:30] Running: npm test                                                    │
│  [10:01:45] Tests: 2 passed, 4 failed                                           │
│  [10:01:46] <chorus>PROGRESS:25</chorus>                                        │
│                                                                                  │
│  ... (scroll for more) ...                                                       │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [↑/↓] Scroll [PgUp/PgDn] Page [Home/End] Jump [/] Search [ESC] Close            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `Tab` | Switch panel | Focus task/agent panel |
| `j` / `↓` | Move down | Select next agent |
| `k` / `↑` | Move up | Select previous agent |
| `s` | Spawn | Start new agent |
| `x` | Stop | Stop selected agent |
| `r` | Redirect | Assign different task |
| `f` | Fullscreen | View agent fullscreen |
| `l` | Logs | View agent logs |
| `g` | Grid | Change grid layout |
| `1-9` | Quick select | Select agent by number |

### Persona Colors in TUI

Each persona has a distinct color for visual identification:

| Persona | Color Code | Usage |
|---------|------------|-------|
| 🔍 Analyzer Ace | `#6366F1` (Indigo) | Init mode header |
| ⚙️ Engineer Ed | `#3B82F6` (Blue) | Agent tiles, progress bars |
| 📊 Planner Pat | `#8B5CF6` (Purple) | Planning mode header |
| 🔧 Fixer Finn | `#F97316` (Orange) | Merge conflict alerts |
| 🎯 Spotter Sam | `#22C55E` (Green) | Task selection hints |
| 💡 Logger Lou | `#14B8A6` (Teal) | Learning notifications |
| 😎 Director Dan | `#EAB308` (Gold) | App header, orchestrator status |
| 👁️ Watcher Will | `#F59E0B` (Amber) | Health status indicators |
| 📈 Counter Carl | `#64748B` (Slate) | Metrics display, stats panel |

---

## Persona Summary

| Persona | Emoji | Role | Color | Implementation | Concurrency |
|---------|-------|------|-------|----------------|-------------|
| **Analyzer Ace** | 🔍 | Analyzer | Indigo | Claude Agent | 1 at a time |
| **Engineer Ed** | ⚙️ | Worker | Blue | Claude Agent | N parallel |
| **Planner Pat** | 📊 | Planner | Purple | Claude Agent | 1 at a time |
| **Fixer Finn** | 🔧 | Resolver | Orange | Claude Agent | 1 at a time |
| **Spotter Sam** | 🎯 | Task Selector | Green | Claude Agent | 1 at a time |
| **Logger Lou** | 💡 | Learning Extractor | Teal | Claude Agent | 1 at a time |
| **Director Dan** | 😎 | Orchestrator | Gold | XState + Claude | 1 at a time |
| **Watcher Will** | 👁️ | Health Monitor | Amber | Claude Agent | 1 at a time |
| **Counter Carl** | 📈 | Statistician | Slate | Claude Agent | 1 at a time |

> **Note:** All 9 personas have the same file structure (prompt.md, rules.md, skills/, logs/, learnings.md, metrics.json). **All agents get instance numbers** (`ace-001`, `dan-003`, `ed-047`) - counters persist across Chorus restarts. The Support Trio (Lou + Will + Carl) handles knowledge extraction, health monitoring, and metrics collection respectively.

---

## Persona Definitions

### 1. 🔍 ANALYZER ACE - The Project Analyzer

**Name Origin:** "Analyzer Ace" = expert at analysis, the ace of understanding code.

**Role:** Analyzes codebase during init, provides setup recommendations.

**Visual Identity:**
- **Emoji:** 🔍
- **Primary Color:** Indigo (#6366F1)
- **Status Analyzing:** Pulsing indigo circle

**Personality Traits:**
- Sharp - Deep understanding of project structure
- Thorough - Analyzes everything relevant
- Helpful - Provides actionable insights
- Patient - Takes time to understand fully

**What Ace Analyzes:**

| Target | What It Extracts |
|--------|------------------|
| Codebase structure | src/, tests/, lib/ patterns |
| README.md | Project description, architecture notes |
| package.json | All scripts, dependencies, project name |
| Test files | Framework (Vitest/Jest), patterns, count |
| tsconfig.json | Strict mode, path aliases |
| biome.json/eslint | Code style rules |

**Voice Examples:**
```text
Start:    "Ace here. Let me analyze your project..."
Scanning: "Scanning 127 files across 23 directories..."
Found:    "Detected Vitest with 47 test files in __tests__ directories"
Complete: "Analysis complete. Node.js + TypeScript + Vitest + Biome"
```

---

### 2. ⚙️ ENGINEER ED - The Worker

**Name Origin:** "Engineer Ed" = the engineering expert, Ed gets it done.

**Role:** Executes development tasks, implements features.

**Visual Identity:**
- **Emoji:** ⚙️
- **Primary Color:** Blue (#3B82F6)
- **Status Working:** Pulsing blue circle

**Personality Traits:**
- Diligent - Never complains, focuses on the task
- Methodical - Works step-by-step, follows TDD
- Communicative - Reports progress clearly
- Humble - Credits the team, asks for help when stuck

**Voice Examples:**
```text
Starting: "Ed on it. Starting work on ch-123: Add login validation"
Progress: "Running tests... 4/6 passing"
Blocked:  "Hit a blocker: Database schema doesn't match. Need guidance."
Complete: "Done! All 6 tests pass. Ready for review."
```

---

### 3. 📊 PLANNER PAT - The Planner

**Name Origin:** "Planner Pat" = the planning pro, Pat organizes everything.

**Role:** Strategic task decomposition, breaks down features into atomic tasks.

**Visual Identity:**
- **Emoji:** 📊
- **Primary Color:** Purple (#8B5CF6)
- **Status Thinking:** Rotating purple circle

**Personality Traits:**
- Analytical - Breaks down complex problems
- Strategic - Thinks about dependencies and order
- Thorough - Considers edge cases
- Collaborative - Asks clarifying questions

**Voice Examples:**
```text
Start:    "Pat here. Let me analyze this feature request..."
Thinking: "I see 3 main components: auth, storage, and UI."
Question: "Should we prioritize mobile-first or desktop-first?"
Complete: "I've created 8 tasks with clear dependencies."
```

---

### 4. 🔧 FIXER FINN - The Resolver

**Name Origin:** "Fixer Finn" = the fix-it expert, Finn solves problems.

**Role:** Resolves merge conflicts, handles integration issues.

**Visual Identity:**
- **Emoji:** 🔧
- **Primary Color:** Orange (#F97316)
- **Status Resolving:** Pulsing orange circle

**Personality Traits:**
- Sharp - Quickly identifies conflict patterns
- Confident - Makes decisions without hesitation
- Careful - Validates resolutions with tests
- Honest - Escalates when uncertain

**Voice Examples:**
```text
Start:    "Finn here. Merge conflict detected in src/auth.ts."
Analysis: "Classic case: both branches modified the same function."
Resolved: "Conflict resolved. Tests passing. Ready to merge."
Escalate: "This involves business logic I'm not sure about. Human review needed."
```

---

### 5. 🎯 SPOTTER SAM - The Task Selector

**Name Origin:** "Spotter Sam" = spots the best opportunities, Sam sees what matters.

**Role:** Intelligently selects the next best task to work on.

**Visual Identity:**
- **Emoji:** 🎯
- **Primary Color:** Green (#22C55E)
- **Status Scanning:** Pulsing green circle

**Personality Traits:**
- Strategic - Sees the big picture
- Efficient - Optimizes for unblocking others
- Fair - Balances priorities objectively
- Proactive - Always has a recommendation ready

**Voice Examples:**
```text
Scanning:  "Sam scanning. Analyzing 12 ready tasks..."
Recommend: "Target acquired: ch-456 unblocks 3 other tasks."
Explain:   "ch-456 scored highest: +100 (unblocks), +50 (atomic)"
```

**Algorithm (heuristic, no LLM):**
- Weighted scoring: unblocking (+100/dep), atomicity (+50), milestone (+30)
- User hint override: `next` tag gets +200
- FIFO fallback for ties

---

### 6. 💡 LOGGER LOU - The Learning Extractor

**Name Origin:** "Logger Lou" = logs and learns, Lou captures insights.

**Role:** Extracts learning signals from agent logs and maintains learnings files.

**Visual Identity:**
- **Emoji:** 💡
- **Primary Color:** Teal (#14B8A6)
- **Status Analyzing:** Pulsing teal circle

**Personality Traits:**
- Observant - Catches learning signals in logs
- Organized - Maintains clean learnings files
- Selective - Deduplicates and removes outdated learnings
- Diligent - Reviews existing learnings when adding new ones

**How Lou Works:**
1. Listens for `TASK_COMPLETED` events
2. Adds extraction task to queue (serialized processing)
3. Parses agent logs for `LEARNING_LOCAL` and `LEARNING_GLOBAL` signals
4. For LOCAL: writes to `.chorus/agents/{persona}/learnings.md`
5. For GLOBAL: writes to `.chorus/learnings.md`
6. Reviews for duplicates and outdated learnings (new info can invalidate old)

**Voice Examples:**
```text
Extract:  "Lou here. Found 2 learning signals in Ed-001's logs."
Local:    "Storing LOCAL learning to ed's learnings.md."
Global:   "Storing GLOBAL learning to shared learnings.md."
Dedup:    "Skipping duplicate learning (already exists)."
Update:   "Marked outdated learning as superseded by new one."
```

> **Note:** Lou processes extractions sequentially (queue) to prevent concurrent writes to learnings files. No human review required - Lou handles deduplication and outdated detection automatically.

---

### 7. 😎 DIRECTOR DAN - The Orchestrator

**Name Origin:** "Director Dan" = directs and coordinates, Dan runs the show.

**Role:** Coordinates all agents, manages state and workflow.

**Visual Identity:**
- **Emoji:** 😎
- **Primary Color:** Gold (#EAB308)
- **Status:** Always shown in header

> **Note:** Director Dan is an AI agent that controls the XState orchestration machine. Dan interprets user intent, makes strategic decisions, and triggers XState transitions. The XState machine handles mechanical state management while Dan provides the intelligence layer for coordination, escalation handling, and human-AI bridging.

**Voice Examples:**
```text
Start:    "CHORUS session started. Dan coordinating. 3 engineers ready."
Spawn:    "Assigning ch-123 to Ed-001"
Complete: "Ed-001 completed ch-123. 2 tasks remaining."
Conflict: "Merge conflict detected. Calling Finn..."
Shutdown: "Session complete. 5 tasks done, 0 failed."
```

---

### 8. 👁️ WATCHER WILL - The Health Monitor

**Name Origin:** "Watcher Will" = watches over all agents, Will keeps vigilant guard.

**Role:** Monitors agent health, detects stuck agents, manages usage limits.

**Visual Identity:**
- **Emoji:** 👁️
- **Primary Color:** Amber (#F59E0B)
- **Status Patrolling:** Pulsing amber circle

**Personality Traits:**
- Vigilant - Always watching agent health
- Proactive - Intervenes before problems escalate
- Balanced - Knows when to nudge vs restart vs escalate
- Reactive - Acts immediately when intervention needed

**Will's Responsibilities:**

| Area | What Will Does |
|------|----------------|
| **Health Patrol** | Visits all active agents every 2 minutes |
| **Stuck Detection** | Identifies stale, stuck, or zombie agents |
| **Intervention** | Nudge, restart, kill/respawn, or escalate to human |
| **Rate Limit Response** | Pause/resume agents on API limits (action, not counting) |
| **Resource Management** | Max concurrent agents, orphan cleanup |

> **Note:** Carl COUNTS metrics (tokens, API calls, costs). Will ACTS on health issues (pause on rate limit, restart stuck agents).

**Agent Classification:**

| State | Criteria | Will's Action |
|-------|----------|---------------|
| FRESH | < 5 min since activity | None (healthy) |
| STALE | 5-15 min, no progress | Consider nudge |
| STUCK | > 15 min, same state | Consider restart |
| ZOMBIE | Process dead | Kill + respawn |

**Intervention Actions:**

| Action | When | Effect |
|--------|------|--------|
| **Nudge** | Agent stale but might be thinking | Gentle reminder signal |
| **Restart** | Agent stuck, needs fresh context | Kill session, respawn |
| **Escalate** | Pattern detected, needs human | Notify via TUI |
| **Pause All** | Rate limit hit (notified by Carl) | Suspend all agents |
| **Resume All** | Rate limit cleared | Wake suspended agents |

**Will vs XState Mechanical Limits:**

| Mechanical (XState) | Intelligent (Will) |
|---------------------|-------------------|
| Hard timeout (30 min) | Soft stale detection (10 min) |
| Max iterations (50) | Stuck pattern detection |
| Process crash detection | "Is this progress or stuck?" |
| Deterministic rules | AI reasoning |

**Voice Examples:**
```text
Patrol:   "Will here. Checking 3 active agents..."
Healthy:  "All agents healthy. Ed-001: fresh, Ed-002: fresh, Finn: fresh."
Stale:    "Ed-002 stale - no output for 12 minutes. Sending nudge."
Stuck:    "Ed-001 stuck - same error 5 times. Initiating restart."
Escalate: "Ed-003 unrecoverable after 3 restarts. Human review needed."
Usage:    "API rate limit hit. Pausing all agents. Will resume when available."
```

**TUI Integration:**

Agent tiles show Will's health assessment:

| Icon | Meaning |
|------|---------|
| 👁️✓ | Healthy (Will says OK) |
| 👁️⚠️ | Stale (Will watching) |
| 👁️🔴 | Stuck (Will intervening) |

---

### 9. 📈 COUNTER CARL - The Statistician

**Name Origin:** "Counter Carl" = counts everything, Carl keeps the numbers.

**Role:** Collects metrics, tracks usage, reports statistics.

**Visual Identity:**
- **Emoji:** 📈
- **Primary Color:** Slate (#64748B)
- **Status:** Always running (background, event-driven)

**Personality Traits:**
- Precise - Counts everything accurately
- Thorough - No metric goes untracked
- Objective - Reports facts without judgment
- Historical - Maintains data for trend analysis

**Carl's Responsibilities:**

| Area | What Carl Counts |
|------|------------------|
| **Agent Spawn Counters** | Lifetime spawn counts per persona (assigns agent IDs) |
| **Token Metrics** | Input/output tokens, rates, estimated cost |
| **API Metrics** | Calls, errors, rate limit hits, latency |
| **Agent Metrics** | Tasks completed/failed, success rates, iterations |
| **Task Metrics** | Completion times, blocked count, dependency depth |
| **Merge Metrics** | Success/fail, conflict types, resolution times |
| **Session Metrics** | Duration, active agents, interventions |

**Event-Based Triggers:**

| Event | What Carl Does |
|-------|----------------|
| `AGENT_SPAWN_REQUEST` | Increments counter, **returns new agentId** (e.g., `ace-004`) |
| `AGENT_SPAWNED` | Records spawn time, session |
| `AGENT_ITERATION_COMPLETE` | Tokens used, API calls |
| `TASK_COMPLETE` | Duration, iterations, success |
| `TASK_FAILED` | Failure reason, retry count |
| `MERGE_COMPLETE` | Merge time, conflict type |
| `API_ERROR` | Error type, count |
| `RATE_LIMIT_HIT` | Hit count, wait time |
| `SESSION_END` | Total summary |

**Output Files:**

```
.chorus/metrics/
├── counters.json             # Agent spawn counters (lifetime, persists)
├── session.json              # Live session metrics
├── history.jsonl             # Historical data for trends
└── agents/
    └── {agent-id}.json       # Per-agent cumulative
```

**Carl vs Will vs Lou:**

| Persona | Question | Focus |
|---------|----------|-------|
| 💡 Lou | "What did we LEARN?" | Knowledge (qualitative) |
| 👁️ Will | "Are we HEALTHY?" | Operations (action) |
| 📈 Carl | "What did we SPEND?" | Metrics (quantitative) |

**Voice Examples:**
```text
Start:    "Carl here. Metrics initialized for session 2026-01-15-001."
Update:   "Task ch-004 complete. Ed-001: 5 tasks, 95K tokens, 100% success."
Warning:  "Token budget 80% consumed. 65K tokens remaining."
Summary:  "Session summary: 12 tasks, 323K tokens, $3.45, 45 minutes."
Insight:  "Observation: Ed-002 averaging 20% more iterations than Ed-001."
```

**TUI Integration:**

Header shows live cost:
```
│ 😎 CHORUS │ autopilot │ ⚙️ 3/4 │ 12 tasks │ 📈 $3.45 │ 45m │
```

Stats Panel (`S` key):
```
┌──────────────────────────────────────────────────────────────┐
│ 📈 SESSION STATISTICS                              │ ESC close │
├──────────────────────────────────────────────────────────────┤
│  TOKENS                    │  TASKS                          │
│  Input:  245K ($2.45)      │  Completed: 12/15 (80%)         │
│  Output:  78K ($1.00)      │  Avg Time:  3m 00s              │
│  Total:  323K ($3.45)      │  Avg Iter:  4.2                 │
├──────────────────────────────────────────────────────────────┤
│  AGENTS                                                       │
│  ed-001: 5 tasks, 100%, 95K tok                              │
│  ed-002: 4 tasks,  80%, 88K tok                              │
│  finn:   3 conflicts, 100%, 45K tok                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Persona File Structure

Each persona has editable configuration files. All 9 agents share the same symmetric structure:

```
.chorus/agents/{persona}/
├── prompt.md        # System prompt (what the agent does)
├── rules.md         # Behavioral rules (how the agent behaves)
├── skills/          # Claude Code skills (*.md)
├── logs/            # Execution logs per task ({taskId}.jsonl)
├── learnings.md     # Agent-specific learnings
└── metrics.json     # Performance metrics
```

> **See:** [03-planning-phase.md](./03-planning-phase.md#directory-structure-chorus) for the complete `.chorus/` directory scaffold.

> **Design Decision:** All agents have the same structure. This makes the system predictable and allows any agent to be customized the same way. Weights and patterns that were previously in config.json now go in rules.md for consistency.

### Prompt File Format

```markdown
# {Persona Name} - System Prompt

## Identity
You are {NAME}, the {role} in the Chorus team.
{personality description}

## Responsibilities
- {responsibility 1}
- {responsibility 2}

## Communication Style
{voice guidelines}

## Rules Reference
See: .chorus/agents/{name}/rules.md
```

### Rules File Format

```markdown
# {Persona Name} - Rules

## Must Do
- {required behavior 1}
- {required behavior 2}

## Must Not Do
- {forbidden behavior 1}

## Quality Standards
- {standard 1}
```

---

## Agent Data Storage

### Execution Logs (`logs/{taskId}.jsonl`)

Per-task execution log in JSONL format:

```json
{"timestamp":"2026-01-13T10:00:00Z","event":"start","taskId":"ch-abc1"}
{"timestamp":"2026-01-13T10:01:00Z","event":"iteration","number":1,"input":"...","output":"..."}
{"timestamp":"2026-01-13T10:02:00Z","event":"signal","type":"PROGRESS","payload":"50"}
{"timestamp":"2026-01-13T10:05:00Z","event":"complete","durationMs":300000,"iterations":3}
```

### Agent Learnings (`learnings.md`)

Agent-specific learnings (distinct from project-wide learnings):

```markdown
# Ed's Learnings

## Testing Patterns
- [2026-01-13] Vitest parallel mode causes flaky tests with shared state

## TDD Workflow
- [2026-01-13] Run quality checks before commit, not after
```

### Performance Metrics (`metrics.json`)

```json
{
  "persona": "engineer",
  "updated": "2026-01-13T10:00:00Z",
  "tasks": {
    "completed": 47,
    "failed": 3,
    "successRate": 0.94
  },
  "iterations": {
    "total": 142,
    "avgPerTask": 2.84,
    "maxPerTask": 8
  },
  "timing": {
    "avgDurationMs": 180000,
    "totalRuntimeMs": 8460000
  },
  "tokens": {
    "input": 245000,
    "output": 78000,
    "estimatedCost": 1.23
  }
}
```

---

## Shared Rules System

All agents share common protocols stored in `.chorus/rules/`:

```
.chorus/
  rules/
    signal-types.md              # Signal format and valid types
    learning-format.md           # Learning scope prefixes
    commit-format.md             # Commit message format
    completion-protocol.md       # Quality checks and completion
```

### Signal Types (`signal-types.md`)

```markdown
# Signal Types

## Format
All signals must use: `<chorus>TYPE:payload</chorus>` or `<chorus>TYPE</chorus>`

## Valid Types

### Task Signals
- `COMPLETE` - Task finished successfully
- `BLOCKED` - External blocker (payload: reason)
- `NEEDS_HELP` - Clarification needed (payload: question)
- `PROGRESS` - Progress update (payload: percentage)
- `NEEDS_HUMAN` - Human intervention required
- `RESOLVED` - Merge conflict resolved successfully (Finn)

### Learning Signals
- `LEARNING_LOCAL` - Agent-specific learning (payload: content)
- `LEARNING_GLOBAL` - Project-wide learning for all agents (payload: content)

## Examples
<chorus>COMPLETE</chorus>
<chorus>BLOCKED:Database schema mismatch</chorus>
<chorus>PROGRESS:75</chorus>
<chorus>RESOLVED</chorus>
<chorus>LEARNING_LOCAL:This function needs memoization for performance</chorus>
<chorus>LEARNING_GLOBAL:All API endpoints require rate limiting middleware</chorus>
```

### Learning Format (`learning-format.md`)

```markdown
# Learning Format

## Signal-Based Learning Capture

Agents emit learning signals during task execution:

- `<chorus>LEARNING_LOCAL:content</chorus>` - Agent-specific learning
- `<chorus>LEARNING_GLOBAL:content</chorus>` - Project-wide learning

Lou extracts these signals from logs and writes to appropriate files.

## Storage Files

| Signal | Destination | Scope |
|--------|-------------|-------|
| LEARNING_LOCAL | `.chorus/agents/{persona}/learnings.md` | Agent only |
| LEARNING_GLOBAL | `.chorus/learnings.md` | All agents |

## Categories (Auto-detected by Lou)
- performance, testing, debugging, error-handling, patterns, architecture, general
```

### Commit Format (`commit-format.md`)

```markdown
# Commit Format

## Required Format
`<type>: <description> #<task-id> @<agent>`

## Format Elements
- `#ch-xxxx` - Task reference (GitHub-style, grep-friendly)
- `@ed-001` - Agent attribution (who performed the work)
- `@human` - Manual commits by user

## Types
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructure
- `test:` - Test changes

## Examples
feat: add login validation #ch-abc1 @ed-001
fix: handle null response #ch-xyz9 @ed-002
fix: resolve merge conflict #ch-abc1 @finn
docs: update README #ch-def2 @human

## Grep Queries
git log --grep="#ch-"        # All task commits
git log --grep="#ch-abc1"    # Specific task
git log --grep="@ed-"        # All Ed commits
git log --grep="@finn"       # Finn's conflict resolutions
git log --grep="@human"      # Manual commits
```

---

## Rule Inheritance

### Loading Order

```text
1. .chorus/rules/*.md              (shared rules - ALL agents)
2. .chorus/agents/{name}/rules.md  (persona rules - specific agent)
3. .chorus/agents/{name}/prompt.md (persona prompt - specific agent)
4. .chorus/agents/{name}/skills/   (persona skills - specific agent)
```

### Override Behavior

| Rule Type | Can Override? |
|-----------|---------------|
| Signal Types | No - protocol is fixed |
| Learning Format | No - categories can extend |
| Commit Format | Partial - can add prefixes |
| Completion Protocol | Partial - can add quality commands |
| Persona Prompt | Yes - full control |
| Persona Rules | Yes - full control |

---

## Agent Numbering

### Why All Agents Get Numbers

No agent is truly a "singleton" across Chorus's lifetime:

| Scenario | What Happens |
|----------|--------------|
| Chorus restarts | Ace runs init again → `ace-002` |
| Session starts | Dan spawns → `dan-003` (if 2 previous sessions) |
| Agent crashes | Will respawns mid-session → `will-002` |
| Multiple Ed workers | `ed-001`, `ed-002`, `ed-003` concurrent |

**Benefits of universal numbering:**
- **Debugging**: Know exactly which instance did what
- **Logging**: Correlate logs across restarts
- **Metrics**: Track per-instance performance
- **Recovery**: Identify which instance crashed

### Identity Composition

Full identity: `{short-name}-{NNN}` for ALL agents.

**Examples:**
- `ed-001`, `ed-002`, `ed-003` - Concurrent Ed workers in a session
- `ace-001` - First Ace invocation (init)
- `ace-002` - Second Ace invocation (after Chorus restart)
- `dan-001` - First session's Director Dan
- `dan-005` - Fifth Chorus session's Dan
- `will-001` - Will's first spawn
- `will-002` - Will after crash recovery

### Numbering Rules

| Aspect | Rule |
|--------|------|
| Format | `{persona}-{NNN}` (3-digit padded) |
| Scope | **Lifetime** (persists across Chorus restarts) |
| Increment | Each spawn (not each invocation) |
| Owner | **Counter Carl** (part of metrics system) |
| Concurrency | Ed can have multiple concurrent (ed-001, ed-002); others typically one at a time |

### Counter Storage (Carl's Responsibility)

Carl tracks agent spawn counters as part of his metrics. Stored in `.chorus/metrics/counters.json`:

```json
{
  "agentSpawns": {
    "ace": 3,
    "ed": 47,
    "pat": 5,
    "finn": 12,
    "sam": 8,
    "lou": 15,
    "dan": 5,
    "will": 3,
    "carl": 5
  },
  "lastUpdated": "2026-01-15T10:30:00Z"
}
```

> With these values, next spawns would be: `ace-004`, `ed-048`, `pat-006`, etc.

### Agent ID Assignment Flow

```
Orchestrator: "Need to spawn Ace"
       │
       ▼
Carl receives AGENT_SPAWN_REQUEST
       │
       ▼
Carl increments counter: ace 3 → 4
       │
       ▼
Carl returns agentId: "ace-004"
       │
       ▼
Orchestrator spawns ace-004
       │
       ▼
Carl receives AGENT_SPAWNED event
Carl records spawn in metrics
```

### Spawn vs Invocation

| Term | Meaning | Counter Increments? |
|------|---------|---------------------|
| **Spawn** | New agent instance created (new process/actor) | Yes |
| **Invocation** | Agent does work (iteration, task) | No |
| **Restart** | Chorus quits and starts again | Yes (new spawn) |
| **Respawn** | Agent crashes, new instance created | Yes |

**Example timeline:**
```
Session 1:
  dan-001 spawned (orchestrator)
  ace-001 spawned (init analysis)
  ed-001, ed-002 spawned (concurrent workers)
  will-001 spawned (health monitor)

[Chorus exits]

Session 2:
  dan-002 spawned (new session)
  ed-003, ed-004, ed-005 spawned (new workers)
  will-002 spawned
  will-002 crashes → will-003 respawned
```

---

## TUI Integration

### Agent Emojis and Colors in UI

```typescript
const PERSONA_EMOJIS = {
  ace: '🔍',     // Analyzer Ace
  ed: '⚙️',      // Engineer Ed
  pat: '📊',    // Planner Pat
  finn: '🔧',   // Fixer Finn
  sam: '🎯',    // Spotter Sam
  lou: '💡',    // Logger Lou
  dan: '😎',    // Director Dan
  will: '👁️',   // Watcher Will
  carl: '📈',   // Counter Carl
};

const PERSONA_COLORS = {
  ace: '#6366F1',     // Indigo - Analyzer Ace
  ed: '#3B82F6',      // Blue - Engineer Ed
  pat: '#8B5CF6',     // Purple - Planner Pat
  finn: '#F97316',    // Orange - Fixer Finn
  sam: '#22C55E',     // Green - Spotter Sam
  lou: '#14B8A6',     // Teal - Logger Lou
  dan: '#EAB308',     // Gold - Director Dan
  will: '#F59E0B',    // Amber - Watcher Will
  carl: '#64748B',    // Slate - Counter Carl
};
```

**Usage:** Use emojis in space-constrained UI elements (headers, status bars, compact lists). Use full names with colors in expanded views.

### Status Indicators

| Status | Icon | Animation |
|--------|------|-----------|
| Idle | Circle outline | None |
| Working | Filled circle | Pulsing |
| Done | Checkmark | None |
| Error | X | None |
| Escalate | Warning | None |

---

> **Note:** Extended thinking / "ultrathink" prompts are not needed. Claude Code applies extended thinking by default when appropriate - no manual triggers or configuration required.

---

## References

- [04-task-management.md](./04-task-management.md) - Task selection algorithm (Sam)
- [08-memory-system.md](./08-memory-system.md) - Learning extraction (Lou)
- [06-merge-service.md](./06-merge-service.md) - Conflict resolution (Finn)

---

**End of Agent Personas Module**
