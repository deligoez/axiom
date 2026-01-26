# Gastown vs Chorus: Comparison & Inspiration Report

**Date:** 2026-01-15
**Purpose:** Identify ideas from Gastown that Chorus could adopt

---

## Executive Summary

Gastown and Chorus are both multi-agent orchestration systems for AI coding assistants, but with different philosophies:

| Aspect | Gastown | Chorus |
|--------|---------|--------|
| **Primary Interface** | CLI (`gt`, `bd`) | TUI (Ink-based) |
| **Coordination Layer** | tmux + file system | XState actors |
| **Agent Lifecycle** | Self-cleaning (no idle) | Pooled slots |
| **Task System** | Beads (external) | Native TaskStore |
| **Work Assignment** | Hook + Propulsion | Manual/Autopilot mode |
| **Monitoring** | Watchdog chain (Boot→Deacon) | XState monitoring region |
| **Scope** | Multi-rig (cross-repo) | Single project |

---

## Key Ideas Chorus Should Adopt

### 1. Universal Attribution (BD_ACTOR Pattern) ⭐⭐⭐

**Gastown Approach:**
```bash
BD_ACTOR="gastown/polecats/toast"
GIT_AUTHOR_NAME="gastown/polecats/toast"
```

Every action (git commits, task updates, events) is attributed to a specific agent identity.

**Chorus Gap:**
Currently, Chorus tracks `assignee` in tasks but doesn't have universal attribution in:
- Git commits (who committed?)
- Event logs (which agent triggered?)
- Learning extraction (who learned?)

**Recommendation:**
```typescript
// Add to agent context
interface AgentContext {
  actorId: string;  // "chorus/ed-001" or "chorus/finn"
  // ... existing fields
}

// Use in git operations
export function createCommit(message: string, actorId: string) {
  const env = {
    GIT_AUTHOR_NAME: actorId,
    GIT_AUTHOR_EMAIL: userEmail,
  };
  // ...
}
```

**Benefits:**
- Git blame shows which Ed instance wrote the code
- Metrics per-agent: "Ed-001 completed 15 tasks, Ed-002 completed 12"
- A/B testing different models via different agent identities

---

### 2. Propulsion Principle (GUPP) ⭐⭐⭐

**Gastown Approach:**
> "If you find something on your hook, YOU RUN IT."

Agents don't poll or wait. Work appears → Execute immediately.

**Chorus Gap:**
Semi-auto mode requires user to press Enter. Even autopilot has selection logic.

**Recommendation:**
Add a "Propulsion Mode" to autopilot:
```typescript
// In config.json
{
  "mode": "autopilot",
  "autopilot": {
    "propulsion": true,  // NEW: Immediate execution when ready
    "selectionDelay": 0  // No delay between task completion and next pickup
  }
}
```

When an agent completes a task, immediately grab next ready task without orchestrator intervention.

---

### 3. Watchdog Chain Pattern ⭐⭐⭐

**Gastown Approach:**
```
Daemon (mechanical timer)
    │
    └──▶ Boot (ephemeral AI triage)
              │
              └──▶ Deacon (long-running watchdog)
```

Three-tier monitoring with escalating sophistication:
1. **Daemon**: Simple timer, checks Boot freshness
2. **Boot**: Short-lived AI, triages Deacon health
3. **Deacon**: Full AI, monitors all workers

**Chorus Gap:**
Currently monitoring is a single XState region. No tiered approach.

**Recommendation:**
Add a lightweight "heartbeat" layer before full monitoring:

```typescript
// New: HeartbeatService (mechanical, no AI)
class HeartbeatService {
  private lastAgentPings: Map<string, number> = new Map();

  checkAgentHealth(agentId: string): HealthStatus {
    const lastPing = this.lastAgentPings.get(agentId);
    const age = Date.now() - lastPing;

    if (age < 5 * 60 * 1000) return 'fresh';      // < 5 min
    if (age < 15 * 60 * 1000) return 'stale';     // 5-15 min
    return 'zombie';                               // > 15 min
  }
}

// Agent actors emit HEARTBEAT events
// HeartbeatService triggers ESCALATE to monitoring region only when stale
```

**Benefits:**
- Separates mechanical checks from AI-based intervention
- Reduces monitoring overhead for healthy agents
- Clear escalation path: heartbeat → monitoring → human

---

### 4. Session vs Sandbox Distinction ⭐⭐

**Gastown Approach:**
```
Session (ephemeral): Claude instance, context window
Sandbox (persistent): Git worktree, branch
Slot (allocation): Name reservation
```

Clear separation prevents confusion about what survives restarts.

**Chorus Gap:**
Worktree = agent lifetime. When agent dies, worktree handling is unclear.

**Recommendation:**
Formalize the three-layer model:

```typescript
interface AgentSlot {
  id: string;           // "ed-001" - persists across sessions
  persona: PersonaType;
}

interface AgentSandbox {
  slotId: string;
  worktreePath: string;
  branch: string;
  createdAt: number;
  // Survives agent restarts
}

interface AgentSession {
  sandboxId: string;
  processId: number;
  startedAt: number;
  iterationCount: number;
  // Ephemeral per-run
}
```

**Benefits:**
- Clearer recovery semantics
- Can restart session without losing sandbox
- Better crash recovery: "resume session in existing sandbox"

---

### 5. Mail Protocol (Inter-Agent Communication) ⭐⭐

**Gastown Approach:**
```bash
# Structured message types
POLECAT_DONE    # Worker completed task
MERGE_READY     # Branch ready for merge
REWORK_REQUEST  # Review failed, needs fixes
HANDOFF         # Context transfer to new session
HELP            # Escalation to human
```

Agents communicate via typed mail, not arbitrary text.

**Chorus Gap:**
Signals are one-way (`<chorus>COMPLETE</chorus>`). No inter-agent messaging.

**Recommendation:**
Add structured inter-agent events:

```typescript
type AgentMessage =
  | { type: 'TASK_COMPLETE'; taskId: string; branch: string }
  | { type: 'MERGE_READY'; taskId: string; commitHash: string }
  | { type: 'CONFLICT_DETECTED'; taskId: string; files: string[] }
  | { type: 'NEEDS_HELP'; taskId: string; reason: string }
  | { type: 'HANDOFF'; taskId: string; context: string };

// In XState
sendTo(parentRef, { type: 'AGENT_MESSAGE', message, from: actorId });
```

**Benefits:**
- Agents can coordinate (Ed tells Finn about conflict)
- Structured logging of agent interactions
- Foundation for future multi-agent collaboration

---

### 6. Molecules (Workflow Templates) ⭐⭐

**Gastown Approach:**
```toml
[molecule]
name = "patrol"
steps = ["capture", "decide", "act"]

[step.capture]
command = "gt patrol capture"
on_complete = "decide"

[step.decide]
command = "gt patrol decide"
on_complete = "act"
```

Durable, chained workflows that survive restarts.

**Chorus Gap:**
Ralph loop is hardcoded. No reusable workflow templates.

**Recommendation:**
Create workflow templates for common patterns:

```typescript
// .chorus/workflows/review-and-fix.yaml
name: review-and-fix
steps:
  - id: implement
    signal: COMPLETE
    next: test
  - id: test
    command: npm run test
    on_fail: fix
    on_pass: done
  - id: fix
    signal: COMPLETE
    next: test
```

**Benefits:**
- Customizable per-project workflows
- Can define domain-specific patterns
- Survives crashes (resume from last step)

---

### 7. Self-Cleaning Workers (No Idle Pool) ⭐

**Gastown Approach:**
> "Polecats have NO IDLE STATE. They're either working, stalled, or zombie."

Workers self-terminate after completion:
```bash
gt done  # Clean up and exit
```

**Chorus Gap:**
Agents stay in `idle` state waiting for next task.

**Recommendation:**
Consider "ephemeral agents" mode:

```typescript
// In config
{
  "agents": {
    "lifecycle": "ephemeral",  // vs "pooled"
    "cleanupOnComplete": true
  }
}

// After task complete:
// 1. Merge branch
// 2. Remove worktree
// 3. Kill agent process
// 4. Spawn fresh for next task
```

**Benefits:**
- No context pollution between tasks
- Fresh Claude instance each time
- Cleaner resource management

**Tradeoff:**
- Slower spawn time
- No context carryover (could be good or bad)

---

### 8. Property Layers (Config Hierarchy) ⭐

**Gastown Approach:**
```
1. Wisp (transient, local)
2. Rig Bead (persistent, synced)
3. Town Defaults
4. System Defaults
```

**Chorus Gap:**
Single config.json with no layering.

**Recommendation:**
Add config layers:

```
1. CLI args (--max-agents=5)
2. Environment (CHORUS_MODE=autopilot)
3. .chorus/local-config.json (gitignored)
4. .chorus/config.json (committed)
5. Defaults (compiled in)
```

**Benefits:**
- Local overrides without touching committed config
- Team settings vs personal preferences
- CI/CD can override via environment

---

### 9. Escalation System with Severity ⭐

**Gastown Approach:**
```toml
[escalation]
severity_levels = ["low", "medium", "high", "critical"]
re_escalate_after = "15m"
max_age = "4h"

[routing.high]
notify = ["overseer", "witness"]
```

**Chorus Gap:**
Single `NEEDS_HELP` signal, no severity routing.

**Recommendation:**
Add severity to signals:

```typescript
// Current
<chorus>NEEDS_HELP:reason</chorus>

// Proposed
<chorus>NEEDS_HELP:low:Optional question about approach</chorus>
<chorus>NEEDS_HELP:high:Blocked on external dependency</chorus>
<chorus>NEEDS_HELP:critical:Security vulnerability found</chorus>
```

Route by severity:
- `low`: Queue for next review cycle
- `medium`: Toast notification
- `high`: Pause agent, alert user
- `critical`: Pause ALL agents, require immediate attention

---

### 10. TTL Markers (Prevent Double-Spawn) ⭐

**Gastown Approach:**
```bash
# Create marker before spawn
touch /tmp/spawning-polecat-toast.lock

# Check marker before spawn
if [ -f /tmp/spawning-polecat-toast.lock ]; then
  exit 0  # Already spawning
fi
```

**Chorus Gap:**
Potential race condition if orchestrator crashes mid-spawn.

**Recommendation:**
Add spawn markers:

```typescript
// Before spawning
const markerPath = `.chorus/spawning/${taskId}.lock`;
await writeFile(markerPath, JSON.stringify({
  taskId,
  startedAt: Date.now(),
  ttl: 60000  // 1 minute
}));

// Before any spawn, check for stale markers
const markers = await glob('.chorus/spawning/*.lock');
for (const marker of markers) {
  const data = JSON.parse(await readFile(marker));
  if (Date.now() - data.startedAt > data.ttl) {
    // Stale marker, clean up
    await unlink(marker);
  } else {
    // Recent spawn, skip this task
    continue;
  }
}
```

---

### 11. Seance (Query Previous Sessions) ⭐

**Gastown Approach:**
```bash
gt seance toast  # Talk to previous Toast sessions
```

Agents can query their predecessors for context.

**Chorus Gap:**
No way to query previous agent sessions.

**Recommendation:**
Store session summaries in learnings:

```typescript
// On agent completion, extract session summary
interface SessionSummary {
  agentId: string;
  taskId: string;
  completedAt: number;
  keyDecisions: string[];
  blockers: string[];
  insights: string[];
}

// Future agents can query
const previousSessions = await getSessionsForTask(taskId);
```

---

## Ideas NOT to Adopt

### 1. tmux-Based Coordination
Gastown uses tmux heavily. Chorus uses XState actors which is more robust for state management.

### 2. Two-Level Architecture (Town/Rig)
Gastown's multi-rig model adds complexity. Chorus is single-project focused, which is appropriate for MVP.

### 3. Separate CLI Tools
Gastown has `gt` and `bd` as separate binaries. Chorus's unified TUI approach is more user-friendly.

### 4. Dogs as Infrastructure Workers
Gastown's "Dogs" are daemon helpers. Chorus's XState monitoring region handles this more cleanly.

---

## Implementation Priority

| Priority | Idea | Effort | Impact |
|----------|------|--------|--------|
| P0 | Universal Attribution | Medium | High |
| P0 | Watchdog Chain | Medium | High |
| P1 | Session/Sandbox Distinction | Low | Medium |
| P1 | Mail Protocol | Medium | Medium |
| P1 | Severity-Based Escalation | Low | Medium |
| P2 | Propulsion Mode | Low | Medium |
| P2 | TTL Markers | Low | Low |
| P2 | Property Layers | Medium | Medium |
| P3 | Molecules/Workflows | High | Medium |
| P3 | Self-Cleaning Workers | Medium | Low |
| P3 | Seance | Medium | Low |

---

## Clarifications (2026-01-15)

### Director Dan = AI Agent + XState Controller

Director Dan is NOT just XState - he is an AI agent that:
- Interprets user intent and makes strategic decisions
- Controls XState machine transitions
- Handles escalations and human-AI bridging
- Coordinates all other agents

This is analogous to Gastown's Mayor but with AI intelligence layer.

### Commit Attribution Format

Adopted format: `<type>: <description> #<task-id> @<agent>`

Examples:
```
feat: add login validation #ch-004 @ed-001
fix: resolve merge conflict #ch-004 @finn
docs: update README #ch-012 @human
```

Benefits:
- GitHub-native syntax (#issue, @mention)
- Grep-friendly queries
- Human ownership preserved in Author field

### Watcher Will - Single-Tier Monitoring

Chorus uses **single-tier monitoring** (not 3-tier like Gastown):

| Gastown 3-Tier | Chorus Single-Tier |
|----------------|-------------------|
| Daemon (Go) → Boot (AI) → Deacon (AI) | 👁️ Watcher Will (AI) |

**Why single-tier is sufficient for Chorus:**
- Single process (XState event-driven)
- Will can observe XState directly
- No distributed tmux coordination needed
- Less complexity, same benefits

**Watcher Will responsibilities:**
- Health patrol (every 2 min)
- Stuck/stale/zombie detection
- Nudge/restart/escalate decisions
- Pause/resume on rate limits (action, not counting)
- Resource management

> **Note:** Will ACTS on health issues. Carl COUNTS metrics (see below).

### Agent Lifecycle - Ephemeral Sessions

**Clarification:** Chorus agents are ephemeral, not pooled.

| Aspect | Chorus Design |
|--------|---------------|
| `maxAgents: 3` | Maximum concurrent SLOTS (not persistent agents) |
| Task complete | Session TERMINATES (not idle) |
| Fresh context | Each task gets fresh Claude session |
| Slot reuse | Same slot ID, new session |

This matches Gastown's "NO IDLE STATE" principle.

### Fixer Finn vs Refinery

Both do similar work, but Finn is more sophisticated:

| Aspect | Gastown Refinery | Chorus Fixer Finn |
|--------|------------------|-------------------|
| Merge processing | ✓ | ✓ |
| Conflict resolution | Simple (often escalate) | AI-powered semantic analysis |
| Conflict classification | None | SIMPLE/MEDIUM/COMPLEX |
| Test running | ✓ | ✓ |
| Worktree cleanup | ✓ | ✓ |

Finn = Refinery + intelligent conflict resolution.

### Counter Carl - The Statistician (NEW)

Chorus adds a dedicated **metrics persona** that Gastown lacks:

| Aspect | Gastown | Chorus Counter Carl |
|--------|---------|---------------------|
| Metrics tracking | Scattered in logs | Centralized in Carl |
| Token counting | Manual grep | Real-time tracking |
| Cost estimation | None | Per-agent + total |
| API usage stats | None | Calls, errors, latency |

**Counter Carl responsibilities:**
- Token metrics (input/output, rates, costs)
- API metrics (calls, errors, rate limit hits, latency)
- Agent metrics (tasks completed/failed, success rates)
- Task metrics (completion times, blocked count)
- Merge metrics (success/fail, conflict types)
- Session metrics (duration, interventions)

**Event-driven design:**
```typescript
| Event                      | What Carl Counts        |
|---------------------------|-------------------------|
| AGENT_ITERATION_COMPLETE  | Tokens used, API calls  |
| TASK_COMPLETE             | Duration, iterations    |
| TASK_FAILED               | Failure reason, count   |
| MERGE_COMPLETE            | Merge time, conflict    |
| API_ERROR                 | Error type, count       |
| RATE_LIMIT_HIT            | Hit count, wait time    |
| SESSION_END               | Total summary           |
```

**Support Trio Pattern:**
- 💡 **Logger Lou** = Knowledge (qualitative learnings)
- 👁️ **Watcher Will** = Health (operational actions)
- 📈 **Counter Carl** = Metrics (quantitative data)

This is a Chorus innovation - Gastown has no equivalent.

---

## Summary

Gastown has excellent ideas around:
1. **Attribution** - Every action has an actor
2. **Monitoring** - Tiered watchdog chain
3. **Communication** - Typed inter-agent messages
4. **Lifecycle** - Clear session/sandbox/slot separation
5. **Escalation** - Severity-based routing

Chorus should adopt these patterns while keeping its strengths:
- XState-based state management
- Visual TUI interface
- Simpler single-project scope
- Native task store
- **Learning system (Logger Lou)** - Gastown lacks this!
- **Metrics system (Counter Carl)** - Gastown lacks this!

**Adopted from Gastown:**
1. ✅ **Commit attribution** - `#task @agent` format
2. ✅ **Watcher Will** - Single-tier monitoring persona
3. ✅ **Director Dan clarified** - AI agent + XState controller
4. ✅ **Ephemeral agents** - Sessions terminate on complete

**Chorus Innovations (not in Gastown):**
1. 📈 **Counter Carl** - Dedicated metrics/statistics persona
2. 💡 **Logger Lou** - Learning extraction persona
3. 🎯 **Support Trio** - Lou + Will + Carl pattern

**Remaining to consider:**
1. Session handoff (context transfer between sessions)
2. Severity-based escalation (NEEDS_HELP:low/medium/high/critical)

---

**End of Comparison Report**
