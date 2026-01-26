# Hooks System

User-defined hooks allow custom scripts to run at key lifecycle events for extensibility and integration.

---

## Overview

Hooks provide a way to extend AXIOM without modifying core code. They're shell scripts that execute at specific lifecycle events, receiving context via environment variables.

---

## Hook File Structure

```
.axiom/hooks/
├── pre-start.sh               # Before agent starts Task
├── post-complete.sh           # After Task completes
├── pre-merge.sh               # Before branch merge
├── post-merge.sh              # After successful merge
├── on-conflict.sh             # When merge conflict detected
├── on-discovery.sh            # When Discovery extracted
├── on-pause.sh                # When session paused
└── on-error.sh                # When error occurs
```

---

## Hook Events

| Hook | Trigger | Variables |
|------|---------|-----------|
| `pre-start` | Agent claims Task | TASK_ID, AGENT, WORKSPACE |
| `post-complete` | Task done/failed | TASK_ID, AGENT, STATUS, DURATION |
| `pre-merge` | Before merge attempt | TASK_ID, BRANCH, TARGET |
| `post-merge` | After successful merge | TASK_ID, COMMIT_HASH |
| `on-conflict` | Merge conflict detected | TASK_ID, FILES, LEVEL |
| `on-discovery` | Discovery extracted | DISCOVERY_ID, SCOPE, CONTENT |
| `on-pause` | Session paused | REASON, RUNNING_TASKS |
| `on-error` | Error occurred | ERROR_TYPE, MESSAGE, TASK_ID |

---

## Environment Variables

All hooks receive context via `AXIOM_*` prefixed environment variables:

### Common Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AXIOM_TASK_ID` | Current Task ID | `task-042` |
| `AXIOM_AGENT` | Agent persona and ID | `echo-001` |
| `AXIOM_WORKSPACE` | Workspace path | `.workspaces/echo-001-task-042` |
| `AXIOM_BRANCH` | Git branch name | `agent/echo-001/task-042` |

### Event-Specific Variables

**post-complete:**
| Variable | Description |
|----------|-------------|
| `AXIOM_STATUS` | Completion status (`done`, `failed`, `timeout`) |
| `AXIOM_DURATION` | Duration in seconds |
| `AXIOM_ITERATIONS` | Number of iterations |

**on-conflict:**
| Variable | Description |
|----------|-------------|
| `AXIOM_CONFLICT_LEVEL` | `SIMPLE`, `MEDIUM`, or `COMPLEX` |
| `AXIOM_CONFLICT_FILES` | Comma-separated list of conflicting files |

**on-discovery:**
| Variable | Description |
|----------|-------------|
| `AXIOM_DISCOVERY_ID` | Discovery case ID |
| `AXIOM_DISCOVERY_SCOPE` | `local` or `global` |
| `AXIOM_DISCOVERY_CONTENT` | Discovery content text |

**on-error:**
| Variable | Description |
|----------|-------------|
| `AXIOM_ERROR_CODE` | Error code |
| `AXIOM_ERROR_MESSAGE` | Human-readable message |
| `AXIOM_ERROR_SEVERITY` | `low`, `medium`, `high`, `critical` |

---

## Execution Context

### Working Directory

Hooks run in the **project root directory** (same directory as `.axiom/`).

For workspace-specific operations, use the `$AXIOM_WORKSPACE` environment variable:

```bash
#!/bin/bash
# Run commands in workspace
cd "$AXIOM_WORKSPACE" && npm test

# Or reference workspace files
cat "$AXIOM_WORKSPACE/package.json"
```

### Environment Inheritance

Hooks inherit:
- System PATH and standard environment
- All `AXIOM_*` prefixed variables
- Current user's environment

Hooks do NOT inherit:
- Agent's internal state
- Claude CLI context
- Other agent's environment variables

### Output Handling

| Output | Handling |
|--------|----------|
| stdout | Logged to `.axiom/logs/hooks.jsonl` |
| stderr | Logged to `.axiom/logs/hooks.jsonl` |
| Exit code 0 | Hook succeeded |
| Exit code non-zero | Hook failed (logged, continues) |

### Process Management

| Scenario | Behavior |
|----------|----------|
| Hook times out | Child processes killed |
| Hook spawns background process | Process orphaned (not recommended) |
| Hook modifies project files | Changes visible to agents |
| Hook modifies workspace files | Use `$AXIOM_WORKSPACE` path |

**Best practices:**
- Keep hooks fast (< 30 seconds)
- Avoid modifying files outside workspace
- Use `$AXIOM_WORKSPACE` for workspace operations
- Log important output for debugging

---

## Hook Interface

```bash
#!/bin/bash
# .axiom/hooks/post-complete.sh

# Environment variables available:
# AXIOM_TASK_ID     - Task ID (e.g., task-001)
# AXIOM_AGENT       - Agent name (e.g., echo-001)
# AXIOM_STATUS      - Completion status (done, failed)
# AXIOM_DURATION    - Duration in seconds
# AXIOM_BRANCH      - Git branch name

# Example: Notify on completion
if [ "$AXIOM_STATUS" = "done" ]; then
  echo "Task $AXIOM_TASK_ID completed by $AXIOM_AGENT"
  # notify-send "AXIOM: $AXIOM_TASK_ID done"
fi

# Example: Alert on failure
if [ "$AXIOM_STATUS" = "failed" ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -d "{\"text\": \"Task $AXIOM_TASK_ID failed after $AXIOM_DURATION seconds\"}"
fi
```

---

## Hook Configuration

Hooks can be configured in `config.json` to use custom script paths:

```json
{
  "hooks": {
    "post-complete": "scripts/notify-slack.sh",
    "pre-merge": "scripts/run-e2e.sh",
    "on-error": "scripts/alert-pagerduty.sh"
  }
}
```

If not configured, AXIOM looks for scripts in `.axiom/hooks/` with default names.

---

## Hook Execution

### Timeout

Hooks have a default timeout of 30 seconds. If a hook doesn't complete within this time, AXIOM:
1. Logs a warning
2. Kills the hook process
3. Continues normal operation

Configure timeout per hook:

```json
{
  "hooks": {
    "pre-merge": {
      "script": "scripts/run-e2e.sh",
      "timeout": 300
    }
  }
}
```

### Exit Codes

| Exit Code | Behavior |
|-----------|----------|
| 0 | Success, continue |
| 1-127 | Log warning, continue |
| 128+ | Log error, continue (signal-based exit) |

Hooks never block AXIOM operation. Failures are logged but don't stop the workflow.

### Execution Order

When multiple hooks could fire (e.g., `post-complete` and `on-error` for a failed Task):
1. Specific hooks run first (`on-error`)
2. General hooks run after (`post-complete`)

---

## Common Use Cases

### Slack Notifications

```bash
#!/bin/bash
# .axiom/hooks/post-complete.sh

WEBHOOK_URL="$AXIOM_SLACK_WEBHOOK"

if [ "$AXIOM_STATUS" = "done" ]; then
  EMOJI=":white_check_mark:"
  COLOR="good"
else
  EMOJI=":x:"
  COLOR="danger"
fi

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"attachments\": [{
      \"color\": \"$COLOR\",
      \"text\": \"$EMOJI Task $AXIOM_TASK_ID $AXIOM_STATUS by $AXIOM_AGENT\"
    }]
  }"
```

### E2E Tests Before Merge

```bash
#!/bin/bash
# .axiom/hooks/pre-merge.sh

echo "Running E2E tests before merging $AXIOM_TASK_ID..."

cd "$AXIOM_WORKSPACE"
npm run test:e2e

if [ $? -ne 0 ]; then
  echo "E2E tests failed, merge should be reviewed"
  # Hook failure is logged but doesn't block merge
fi
```

### Discovery Export

```bash
#!/bin/bash
# .axiom/hooks/on-discovery.sh

# Export discoveries to external knowledge base
if [ "$AXIOM_DISCOVERY_SCOPE" = "global" ]; then
  curl -X POST "$KNOWLEDGE_BASE_URL/discoveries" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$AXIOM_DISCOVERY_ID\",
      \"content\": \"$AXIOM_DISCOVERY_CONTENT\",
      \"source\": \"axiom\"
    }"
fi
```

### Metrics Collection

```bash
#!/bin/bash
# .axiom/hooks/post-complete.sh

# Send metrics to Prometheus pushgateway
cat <<EOF | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/axiom"
axiom_task_duration_seconds{task="$AXIOM_TASK_ID",agent="$AXIOM_AGENT",status="$AXIOM_STATUS"} $AXIOM_DURATION
axiom_task_iterations{task="$AXIOM_TASK_ID",agent="$AXIOM_AGENT"} $AXIOM_ITERATIONS
EOF
```

---

## Debugging Hooks

### Enable Hook Logging

```json
{
  "hooks": {
    "debug": true
  }
}
```

When enabled, AXIOM logs:
- Hook invocation with all environment variables
- Hook stdout/stderr
- Hook exit code and duration

### Test Hook Manually

```bash
# Set environment variables
export AXIOM_TASK_ID="task-001"
export AXIOM_AGENT="echo-001"
export AXIOM_STATUS="done"
export AXIOM_DURATION="45"

# Run hook
.axiom/hooks/post-complete.sh
```

---

## Hook Best Practices

1. **Keep hooks fast** - Long-running hooks should be async (fire and forget)
2. **Handle failures gracefully** - Hooks should not crash on missing variables
3. **Use environment variables** - Don't hardcode paths or values
4. **Log appropriately** - Output goes to AXIOM logs
5. **Test in isolation** - Verify hooks work before deploying

---

## State Machine Events

Hooks are triggered by State machine events:

```
on:
  AGENT_STARTED:
    actions: runHook('pre-start')
  TASK_COMPLETED:
    actions: runHook('post-complete')
  MERGE_STARTED:
    actions: runHook('pre-merge')
  MERGE_COMPLETED:
    actions: runHook('post-merge')
  MERGE_CONFLICT:
    actions: runHook('on-conflict')
  DISCOVERY_CREATED:
    actions: runHook('on-discovery')
  SESSION_PAUSED:
    actions: runHook('on-pause')
  ERROR_OCCURRED:
    actions: runHook('on-error')
```
