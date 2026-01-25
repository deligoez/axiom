# Configuration

All Swarm configuration is stored in `.swarm/config.json`.

---

## Configuration Schema

```json
{
  "mode": "semi-auto",

  "agents": {
    "maxParallel": 3,
    "timeoutMinutes": 30,
    "defaultModel": "sonnet"
  },

  "completion": {
    "signal": "<swarm>COMPLETE</swarm>",
    "maxIterations": 50,
    "stuckThreshold": 5
  },

  "qualityCommands": [
    "npm test",
    "npm run typecheck",
    "npm run lint"
  ],

  "planning": {
    "incrementalEnabled": true,
    "readyThreshold": 3,
    "maxBatchSize": 10,
    "horizonBoundary": "milestone"
  },

  "review": {
    "defaultMode": "batch",
    "autoApprove": {
      "enabled": true,
      "maxIterations": 3
    }
  },

  "merge": {
    "autoMerge": true,
    "conflictRetries": 3,
    "cleanupOnSuccess": true
  },

  "checkpoints": {
    "periodic": 5,
    "beforeAutopilot": true
  },

  "ui": {
    "agentGrid": "auto",
    "theme": "default",
    "toastDuration": 5000
  },

  "hooks": {
    "post-complete": "scripts/notify.sh",
    "pre-merge": "scripts/validate.sh"
  },

  "sprint": {
    "target": { "type": "count", "value": 10 },
    "filters": { "includeTags": [], "excludeTags": ["later"] },
    "options": { "checkpointBefore": true, "batchReview": true }
  }
}
```

---

## Section Details

### Mode

| Value | Behavior |
|-------|----------|
| `semi-auto` | User selects ideas, agent stops after each |
| `autopilot` | Fully autonomous until queue empty |

### Agents

| Option | Default | Description |
|--------|---------|-------------|
| `maxParallel` | 3 | Concurrent agent slots |
| `timeoutMinutes` | 30 | Per-idea timeout |
| `defaultModel` | sonnet | AI model for agents |

### Completion

| Option | Default | Description |
|--------|---------|-------------|
| `signal` | `<swarm>COMPLETE</swarm>` | Completion signal format |
| `maxIterations` | 50 | Max iterations before timeout |
| `stuckThreshold` | 5 | Iterations without commit = warning |

### Quality Commands

Array of commands that must all pass before idea completion. Run in order.

```json
// Node.js project
"qualityCommands": ["npm test", "npm run typecheck", "npm run lint"]

// Python project
"qualityCommands": ["pytest", "mypy .", "ruff check ."]

// Go project
"qualityCommands": ["go test ./...", "go vet ./..."]
```

### Planning

| Option | Default | Description |
|--------|---------|-------------|
| `incrementalEnabled` | true | Just-in-time planning |
| `readyThreshold` | 3 | Trigger planning when ready < threshold |
| `maxBatchSize` | 10 | Max ideas per planning cycle |
| `horizonBoundary` | milestone | Planning stop point |

Horizon boundaries: `milestone`, `feature`, `uncertainty`

### Review

| Option | Default | Description |
|--------|---------|-------------|
| `defaultMode` | batch | Review mode for ideas |
| `autoApprove.enabled` | true | Enable auto-approve |
| `autoApprove.maxIterations` | 3 | Auto-approve if iterations <= N |
| `labelRules` | {} | Per-label review mode overrides |

Review modes: `per-task`, `batch`, `auto-approve`, `skip`

#### Label Rules

Override review mode based on idea labels:

```json
"labelRules": {
  "security": { "mode": "per-task", "autoApprove": false },
  "docs": { "mode": "skip" },
  "trivial": { "mode": "auto-approve" }
}
```

Ideas with `security` tag always require per-task review.

### Merge

| Option | Default | Description |
|--------|---------|-------------|
| `autoMerge` | true | Queue completed ideas automatically |
| `conflictRetries` | 3 | Retries before human escalation |
| `cleanupOnSuccess` | true | Remove worktree after merge |

### Checkpoints

| Option | Default | Description |
|--------|---------|-------------|
| `periodic` | 5 | Checkpoint every N completed ideas |
| `beforeAutopilot` | true | Checkpoint before autopilot starts |

### UI (Web Interface)

| Option | Default | Description |
|--------|---------|-------------|
| `agentGrid` | auto | Grid layout |
| `theme` | default | Color theme |
| `toastDuration` | 5000 | Notification duration (ms) |

### Hooks

| Hook | When | Use Case |
|------|------|----------|
| `pre-start` | Before agent starts idea | Custom setup |
| `post-complete` | After idea done | Notifications |
| `pre-merge` | Before merge | Extra validation |
| `post-merge` | After merge | Deployment |
| `on-conflict` | Conflict detected | Alert team |
| `on-learning` | Learning extracted | Knowledge base |
| `on-pause` | Session paused | Status update |
| `on-error` | Agent error | Logging |

### Sprint

| Option | Description |
|--------|-------------|
| `target.type` | count, duration, until_time, no_ready |
| `target.value` | Target value (N ideas, N hours, time) |
| `filters.includeTags` | Only run ideas with these tags |
| `filters.excludeTags` | Skip ideas with these tags |
| `options.checkpointBefore` | Create checkpoint before sprint |
| `options.batchReview` | Batch review at end |

---

## Configuration Precedence

Settings can come from multiple sources (higher overrides lower):

| # | Source | Description |
|---|--------|-------------|
| 1 | CLI flags | `swarm --mode autopilot` |
| 2 | Environment variables | `SWARM_MODE=autopilot` |
| 3 | planning-state.json | User's choice after planning |
| 4 | state/snapshot.json | Runtime state |
| 5 | config.json | Project defaults |

---

## Environment Variables

| Variable | Config Override |
|----------|-----------------|
| `SWARM_MODE` | `mode` |
| `SWARM_MAX_AGENTS` | `agents.maxParallel` |
| `SWARM_MODEL` | `agents.defaultModel` |
| `SWARM_TIMEOUT` | `agents.timeoutMinutes` |

---

## Per-Idea Overrides

Ideas can override defaults via properties or tags:

```json
{
  "id": "idea-001",
  "content": "Complex refactoring",
  "model": "opus",
  "tags": ["review:per-idea", "security"]
}
```
