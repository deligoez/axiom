# Configuration

All AXIOM configuration is stored in `.axiom/config.json`.

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
    "signal": "<axiom>COMPLETE</axiom>",
    "maxIterations": 50,
    "stuckThreshold": 5
  },

  "verification": [
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
| `semi-auto` | User selects Tasks, agent stops after each |
| `autopilot` | Fully autonomous until queue empty |

### Agents

| Option | Default | Description |
|--------|---------|-------------|
| `maxParallel` | 3 | Concurrent agent slots |
| `timeoutMinutes` | 30 | Per-Task timeout |
| `defaultModel` | sonnet | AI model for agents |

### Completion

| Option | Default | Description |
|--------|---------|-------------|
| `signal` | `<axiom>COMPLETE</axiom>` | Completion signal format |
| `maxIterations` | 50 | Max iterations before timeout |
| `stuckThreshold` | 5 | Iterations without commit = warning |

### Verification

Array of commands that must all pass before Task completion. Run in order.

```json
// Node.js project
"verification": ["npm test", "npm run typecheck", "npm run lint"]

// Python project
"verification": ["pytest", "mypy .", "ruff check ."]

// Go project
"verification": ["go test ./...", "go vet ./..."]
```

### Planning

| Option | Default | Description |
|--------|---------|-------------|
| `incrementalEnabled` | true | Just-in-time planning |
| `readyThreshold` | 3 | Trigger planning when ready < threshold |
| `maxBatchSize` | 10 | Max Tasks per planning cycle |
| `horizonBoundary` | milestone | Planning stop point |

Horizon boundaries: `milestone`, `feature`, `uncertainty`

### Review

| Option | Default | Description |
|--------|---------|-------------|
| `defaultMode` | batch | Review mode for Tasks |
| `autoApprove.enabled` | true | Enable auto-approve |
| `autoApprove.maxIterations` | 3 | Auto-approve if iterations <= N |
| `labelRules` | {} | Per-label review mode overrides |

Review modes: `per-task`, `batch`, `auto-approve`, `skip`

#### Label Rules

Override review mode based on case labels:

```json
"labelRules": {
  "security": { "mode": "per-task", "autoApprove": false },
  "docs": { "mode": "skip" },
  "trivial": { "mode": "auto-approve" }
}
```

Cases with `security` tag always require per-task review.

### Merge

| Option | Default | Description |
|--------|---------|-------------|
| `autoMerge` | true | Queue completed Tasks automatically |
| `conflictRetries` | 3 | Retries before human escalation |
| `cleanupOnSuccess` | true | Remove workspace after merge |

### Checkpoints

| Option | Default | Description |
|--------|---------|-------------|
| `periodic` | 5 | Checkpoint every N completed Tasks |
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
| `pre-start` | Before agent starts Task | Custom setup |
| `post-complete` | After Task done | Notifications |
| `pre-merge` | Before merge | Extra validation |
| `post-merge` | After merge | Deployment |
| `on-conflict` | Conflict detected | Alert team |
| `on-discovery` | Discovery extracted | Knowledge base |
| `on-pause` | Session paused | Status update |
| `on-error` | Agent error | Logging |

### Sprint

| Option | Description |
|--------|-------------|
| `target.type` | count, duration, until_time, no_ready |
| `target.value` | Target value (N Tasks, N hours, time) |
| `filters.includeTags` | Only run Tasks with these tags |
| `filters.excludeTags` | Skip Tasks with these tags |
| `options.checkpointBefore` | Create checkpoint before sprint |
| `options.batchReview` | Batch review at end |

---

## Configuration Precedence

Settings can come from multiple sources (higher overrides lower):

| # | Source | Description |
|---|--------|-------------|
| 1 | CLI flags | `axiom --mode autopilot` |
| 2 | Environment variables | `AXIOM_MODE=autopilot` |
| 3 | planning-state.json | User's choice after planning |
| 4 | state/snapshot.json | Runtime state |
| 5 | config.json | Project defaults |

---

## Environment Variables

| Variable | Config Override |
|----------|-----------------|
| `AXIOM_MODE` | `mode` |
| `AXIOM_MAX_AGENTS` | `agents.maxParallel` |
| `AXIOM_MODEL` | `agents.defaultModel` |
| `AXIOM_TIMEOUT` | `agents.timeoutMinutes` |

---

## Per-Case Overrides

Cases can override defaults via properties or tags:

```json
{
  "id": "task-001",
  "content": "Complex refactoring",
  "model": "opus",
  "tags": ["review:per-task", "security"]
}
```
