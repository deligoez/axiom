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
    "horizonBoundary": "milestone",
    "autopilotBehavior": "pause",
    "afkTimeout": 30,
    "afkAction": "stop"
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

  "init": {
    "allowDirtyWorkdir": true,
    "warnDirtyWorkdir": true
  },

  "checkpoints": {
    "periodic": 5,
    "beforeAutopilot": true,
    "maxCount": 50,
    "maxAgeDays": 30,
    "protectNamed": true
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
  },

  "system": {
    "diskWarningThreshold": 1000,
    "diskCriticalThreshold": 500,
    "diskEmergencyThreshold": 100,
    "autoCleanupEnabled": true
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

### Init

| Option | Default | Description |
|--------|---------|-------------|
| `allowDirtyWorkdir` | true | Allow starting with uncommitted changes |
| `warnDirtyWorkdir` | true | Show warning for uncommitted changes |

When `allowDirtyWorkdir` is `false` and uncommitted changes exist, AXIOM will refuse to start and suggest stashing or committing changes.

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

Commands that must all pass before Task completion. Supports simple array or detailed configuration.

**Warning:** If verification is empty (`[]`) or undefined, Tasks auto-pass on COMPLETE signal without validation. A warning is logged. See [07-execution.md](./07-execution.md#empty-verification-array) for details.

#### Simple Format (Array)

```json
"verification": ["npm test", "npm run typecheck", "npm run lint"]
```

All commands use default timeout (300 seconds).

#### Detailed Format (Object)

```json
"verification": {
  "defaultTimeout": 300,
  "commands": [
    {
      "command": "npm test",
      "timeout": 600,
      "required": true,
      "name": "Unit Tests"
    },
    {
      "command": "npm run typecheck",
      "timeout": 120,
      "required": true,
      "name": "TypeScript"
    },
    {
      "command": "npm run lint",
      "timeout": 60,
      "required": false,
      "name": "Linting"
    }
  ]
}
```

#### Verification Options

| Option | Default | Description |
|--------|---------|-------------|
| `defaultTimeout` | 300 | Default timeout in seconds |
| `commands[].command` | - | Command to run |
| `commands[].timeout` | `defaultTimeout` | Per-command timeout (seconds) |
| `commands[].required` | true | If false, timeout/failure is warning only |
| `commands[].name` | command | Display name in UI |

#### Examples by Project Type

```json
// Node.js project
"verification": {
  "defaultTimeout": 300,
  "commands": [
    { "command": "npm test", "timeout": 600, "name": "Tests" },
    { "command": "npm run typecheck", "timeout": 120 },
    { "command": "npm run lint", "timeout": 60 }
  ]
}

// Python project
"verification": {
  "defaultTimeout": 300,
  "commands": [
    { "command": "pytest", "timeout": 600 },
    { "command": "mypy .", "timeout": 180 },
    { "command": "ruff check .", "timeout": 60, "required": false }
  ]
}

// Go project
"verification": {
  "defaultTimeout": 300,
  "commands": [
    { "command": "go test ./...", "timeout": 600 },
    { "command": "go vet ./...", "timeout": 120 }
  ]
}
```

### Planning

| Option | Default | Description |
|--------|---------|-------------|
| `incrementalEnabled` | true | Just-in-time planning |
| `readyThreshold` | 3 | Trigger planning when ready < threshold |
| `maxBatchSize` | 10 | Max Tasks per planning cycle |
| `horizonBoundary` | milestone | Planning stop point |
| `autopilotBehavior` | pause | Behavior when planning triggers in autopilot |
| `afkTimeout` | 30 | Minutes before AFK timeout |
| `afkAction` | stop | Action on AFK timeout |

Horizon boundaries: `milestone`, `feature`, `uncertainty`

Autopilot behaviors: `pause` (default, safest), `background` (parallel planning), `skip` (finish sprint)

AFK actions: `stop`, `continue`, `notify`

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
| `remoteSyncInterval` | 300 | Seconds between remote sync checks |
| `autoFetchBeforeMerge` | true | Fetch before each merge attempt |
| `escalationTimeout` | 3600 | Seconds before escalation timeout |
| `escalationAction` | defer | Action on timeout (defer/skip/retry/notify) |

See [06-integration.md](./06-integration.md#escalation-timeout) for timeout handling.

### Checkpoints

| Option | Default | Description |
|--------|---------|-------------|
| `periodic` | 5 | Checkpoint every N completed Tasks |
| `beforeAutopilot` | true | Checkpoint before autopilot starts |
| `maxCount` | 50 | Maximum checkpoints to retain |
| `maxAgeDays` | 30 | Delete checkpoints older than N days |
| `protectNamed` | true | Keep user-named checkpoints regardless of age |

See [09-intervention.md](./09-intervention.md#checkpoint-retention-policy) for retention policy details.

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

### System

| Option | Default | Description |
|--------|---------|-------------|
| `diskWarningThreshold` | 1000 | MB free before warning |
| `diskCriticalThreshold` | 500 | MB free before agent pause |
| `diskEmergencyThreshold` | 100 | MB free before emergency stop |
| `autoCleanupEnabled` | true | Auto-cleanup when disk low |

See [09-intervention.md](./09-intervention.md#disk-space-recovery) for disk recovery procedures.

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

---

## Config Validation and Recovery

### Validation at Startup

AXIOM validates `config.json` at startup:

```
Load config.json
     │
     ▼
┌─────────────┐     ┌─────────────────────────────┐
│ Valid JSON? │──No─►│ Error: CONFIG_INVALID_JSON  │
└─────┬───────┘     └─────────────────────────────┘
      │Yes
      ▼
┌─────────────┐     ┌─────────────────────────────┐
│ Schema OK?  │──No─►│ Warning: CONFIG_SCHEMA_ERROR│
└─────┬───────┘     │ (uses defaults for bad keys)│
      │Yes          └─────────────────────────────┘
      ▼
┌─────────────┐
│ Config      │
│ loaded      │
└─────────────┘
```

### Automatic Backup

Every time config is successfully loaded, AXIOM creates a backup:

```
.axiom/
├── config.json           # Active config
└── config.json.backup    # Last known good
```

### Recovery Options

When `config.json` is corrupted:

| Error | Recovery |
|-------|----------|
| Invalid JSON | Offer: restore from backup, reset to defaults, or manual fix |
| Missing file | Use defaults, create new config.json |
| Schema errors | Load valid keys, use defaults for invalid |

### Interactive Recovery (Init)

```
Error: Config file is corrupted

.axiom/config.json contains invalid JSON:
  Unexpected token '}' at line 15

Options:
  [r] Restore from backup (config.json.backup from 2 hours ago)
  [d] Reset to defaults (will lose custom settings)
  [q] Quit and fix manually

Choice:
```

### Non-Interactive Recovery

With `--non-interactive` flag or in CI:

1. Try `config.json.backup`
2. If backup fails, use defaults
3. Log warning, continue

### Error Codes

| Code | Cause | Severity |
|------|-------|----------|
| `CONFIG_INVALID_JSON` | Syntax error in JSON | Critical |
| `CONFIG_SCHEMA_ERROR` | Invalid field value | Warning |
| `CONFIG_NOT_FOUND` | Missing config.json | Info (uses defaults) |
| `CONFIG_BACKUP_RESTORED` | Restored from backup | Info |

See [15-errors.md](./15-errors.md#config-errors) for detailed error handling.
