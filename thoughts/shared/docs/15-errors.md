# Error Handling Matrix

Comprehensive error handling, recovery strategies, and escalation paths.

---

## Error Categories

| Category | Source | Severity Range |
|----------|--------|----------------|
| Agent Errors | Claude CLI, output parsing | Low - Critical |
| Git Errors | Workspace, merge operations | Medium - Critical |
| System Errors | Disk, memory, network | Medium - Critical |
| State Errors | Persistence, recovery | Low - High |
| User Errors | Invalid input, config | Low - Medium |

---

## Agent Errors

### CLI Spawn Failure

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `claude not found` | CLI not installed | Abort, show install instructions | User action required |
| `spawn ENOENT` | Invalid path | Check workspace path, retry | After 3 retries |
| `spawn EACCES` | Permission denied | Check file permissions | User action required |
| `timeout` | Process hung | Kill process, retry Task | After 2 retries |

**Recovery Code:**
```go
func spawnAgent(ctx context.Context, config AgentConfig) error {
    for attempt := 0; attempt < 3; attempt++ {
        err := doSpawn(ctx, config)
        if err == nil {
            return nil
        }

        if isPermissionError(err) {
            return &FatalError{err, "Check file permissions"}
        }

        log.Warn("Spawn failed, retrying", "attempt", attempt, "error", err)
        time.Sleep(time.Second * time.Duration(attempt+1))
    }
    return &RetryExhaustedError{config.TaskID}
}
```

### Output Parsing Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `invalid signal format` | Malformed output | Log warning, continue | Never (non-fatal) |
| `unknown signal type` | Unexpected signal | Ignore signal, log | Never |
| `empty output` | Agent produced nothing | Retry iteration | After 3 empty outputs |
| `output too large` | Exceeded buffer | Truncate, warn | Never |

### Agent Behavior Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `stuck_iterations` | No progress | Send nudge prompt | After stuckThreshold |
| `infinite_loop` | Same output repeated | Force stop, human review | Immediately |
| `invalid_commits` | Broken git state | Reset workspace | After 2 occurrences |
| `verification_failures` | Tests/lint failing | Retry with feedback | After maxIterations |

---

## Git Errors

### Workspace Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `workspace exists` | Orphaned workspace | Remove and recreate | Never |
| `branch exists` | Previous run | Delete branch, retry | After 1 retry |
| `lock file exists` | Concurrent access | Wait and retry | After 5 retries |
| `not a git repo` | Invalid project | Abort session | User action required |

**Recovery Code:**
```go
func createWorkspace(taskID, agentID string) (string, error) {
    path := filepath.Join(".workspaces", fmt.Sprintf("%s-%s", agentID, taskID))

    // Clean up if exists
    if exists(path) {
        if err := removeWorkspace(path); err != nil {
            return "", fmt.Errorf("cleanup failed: %w", err)
        }
    }

    // Create fresh workspace
    branch := fmt.Sprintf("agent/%s/%s", agentID, taskID)
    return path, exec.Command("git", "worktree", "add", "-b", branch, path).Run()
}
```

### Merge Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `merge conflict` | Overlapping changes | Classify → Auto/Rex/Human | Based on level |
| `nothing to merge` | Already merged | Skip, mark done | Never |
| `not mergeable` | Diverged history | Rebase attempt | Human review |
| `protected branch` | Main branch rules | Human push | Immediately |

### Conflict Classification

```go
func classifyConflict(conflict Conflict) ConflictLevel {
    // SIMPLE: Whitespace, formatting only
    if isWhitespaceOnly(conflict) {
        return LevelSimple
    }

    // COMPLEX: File renamed, deleted, or very large
    if conflict.FileRenamed || conflict.FileDeleted || conflict.Lines > 50 {
        return LevelComplex
    }

    // MEDIUM: Everything else
    return LevelMedium
}
```

---

## System Errors

### Disk Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `ENOSPC` | Disk full | Cleanup old workspaces | If still full |
| `EROFS` | Read-only filesystem | Abort | User action required |
| `EIO` | I/O error | Retry once | If persists |

**Disk Monitoring:**
```go
func checkDiskSpace() error {
    usage := getDiskUsage(".workspaces")

    if usage > 0.95 {
        return &CriticalError{"Disk >95% full, stopping agents"}
    }

    if usage > 0.90 {
        cleanupOldWorkspaces()
        return &WarningError{"Disk >90% full, cleaned up"}
    }

    return nil
}
```

### Memory Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `OOM killed` | Memory exhausted | Reduce maxParallel | If recurring |
| `high memory` | Memory leak | Restart agent | After threshold |

### Network Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `API timeout` | Slow connection | Retry with backoff | After 5 retries |
| `rate limited` | Too many requests | Exponential backoff | Auto-resolve |
| `connection refused` | Service down | Queue and retry | After 10 minutes |

---

## State Errors

### Persistence Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `snapshot corrupt` | Crash during write | Use event log | Automatic |
| `events corrupt` | Parse error | Start fresh, warn | User decision |
| `cases.jsonl corrupt` | Invalid JSON | Recover valid lines | Log lost entries |

**Recovery Strategy:**
```go
func recoverState() (*State, error) {
    // Try snapshot first (fast)
    state, err := loadSnapshot()
    if err == nil && state.Valid() {
        return state, nil
    }

    log.Warn("Snapshot invalid, replaying events")

    // Fallback to event replay (reliable)
    events, err := loadEvents()
    if err != nil {
        return nil, &FatalError{err, "Both snapshot and events corrupt"}
    }

    return replayEvents(events)
}
```

### Consistency Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `orphaned task` | Agent crashed | Reset to pending | Automatic |
| `orphaned workspace` | Cleanup failed | Remove workspace | Automatic |
| `counter mismatch` | Concurrent access | Use file lock | Never |

---

## User Errors

### Configuration Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `invalid config` | Bad JSON | Show validation errors | User fix |
| `missing required` | Required field empty | Use defaults, warn | User decision |
| `invalid path` | Non-existent path | Suggest corrections | User fix |

**Validation Example:**
```go
func validateConfig(config *Config) []ValidationError {
    var errors []ValidationError

    if config.Agents.MaxParallel < 1 {
        errors = append(errors, ValidationError{
            Field:   "agents.maxParallel",
            Message: "Must be at least 1",
            Default: 3,
        })
    }

    for i, cmd := range config.Verification {
        if !commandExists(cmd) {
            errors = append(errors, ValidationError{
                Field:   fmt.Sprintf("verification[%d]", i),
                Message: fmt.Sprintf("Command not found: %s", cmd),
            })
        }
    }

    return errors
}
```

### Input Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `invalid case format` | Bad case structure | Reject with explanation | Never |
| `circular dependency` | Cases depend on each other | Reject, show cycle | Never |
| `duplicate id` | ID collision | Generate new ID | Never |

---

## Error Response Format

All errors follow a consistent format for Web UI display:

```json
{
  "error": {
    "code": "AGENT_SPAWN_FAILED",
    "message": "Failed to spawn agent echo-003",
    "details": "Process exited with code 1",
    "severity": "high",
    "recoverable": true,
    "suggestions": [
      "Check if Claude CLI is installed",
      "Verify workspace path exists",
      "Try restarting the server"
    ],
    "context": {
      "agentId": "echo-003",
      "taskId": "task-042",
      "attempt": 2
    }
  }
}
```

---

## Severity Levels

| Level | UI Treatment | Auto-Recovery | User Action |
|-------|--------------|---------------|-------------|
| `low` | Log only | Yes | None needed |
| `medium` | Toast warning | Yes, with retry | Optional review |
| `high` | Modal alert | Limited | Review recommended |
| `critical` | Full-screen, pause | No | Required |

---

## Error Hooks

Custom handling via hooks:

```bash
#!/bin/bash
# .axiom/hooks/on-error.sh

# Environment variables:
# AXIOM_ERROR_CODE    - Error code
# AXIOM_ERROR_MESSAGE - Human-readable message
# AXIOM_ERROR_AGENT   - Agent ID (if applicable)
# AXIOM_ERROR_TASK    - Task ID (if applicable)
# AXIOM_ERROR_SEVERITY - low|medium|high|critical

case "$AXIOM_ERROR_CODE" in
  "AGENT_STUCK")
    # Custom notification
    slack-notify "#dev" "Agent $AXIOM_ERROR_AGENT stuck on $AXIOM_ERROR_TASK"
    ;;
  "DISK_FULL")
    # Emergency cleanup
    docker system prune -f
    ;;
esac
```

---

## Logging

All errors are logged to `.axiom/logs/errors.jsonl`:

```json
{"ts":"2026-01-25T10:00:00Z","code":"AGENT_SPAWN_FAILED","severity":"high","agent":"echo-003","task":"task-042","stack":"..."}
{"ts":"2026-01-25T10:01:00Z","code":"MERGE_CONFLICT","severity":"medium","task":"task-042","level":"MEDIUM"}
```

Use for debugging and trend analysis.
