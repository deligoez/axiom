# Error Handling Matrix

Comprehensive error handling, recovery strategies, and escalation paths.

---

## Error Categories

| Category | Source | Severity Range |
|----------|--------|----------------|
| Prerequisite Errors | Init Mode checks | Critical |
| Agent Errors | Claude CLI, output parsing | Low - Critical |
| Git Errors | Workspace, merge operations | Medium - Critical |
| System Errors | Disk, memory, network | Medium - Critical |
| State Errors | Persistence, recovery | Low - High |
| User Errors | Invalid input, config | Low - Medium |

---

## Prerequisite Errors

These errors occur during Init Mode before AXIOM can start. All are critical and require user action.

### Error Codes

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| `PREREQ_NO_GIT` | Not a git repository | Directory lacks `.git/` | Run `git init` |
| `PREREQ_NO_CLAUDE` | Claude CLI not found | `claude` not in PATH | Install Claude CLI |
| `PREREQ_DISK_LOW` | Insufficient disk space | Less than 500MB free | Free up disk space |
| `PREREQ_NO_WRITE` | Directory not writable | Permission denied | Check directory permissions |

### PREREQ_NO_GIT

**Severity:** Critical
**Recoverable:** No (user action required)

```
Error: Not a git repository

AXIOM requires a git repository for workspace isolation.
Initialize one with: git init
```

**Why git is required:**
- Agent workspaces use `git worktree` for isolation
- Branch-per-task workflow needs git branching
- Integration queue relies on git merge
- Checkpoint/rollback uses git refs

**Resolution:**
```bash
git init
git add .
git commit -m "Initial commit"
```

### PREREQ_NO_CLAUDE

**Severity:** Critical
**Recoverable:** No (user action required)

```
Error: Claude CLI not found

AXIOM requires Claude CLI to spawn agents.
Install with: brew install claude
         or: npm install -g @anthropic/claude-cli
```

**Detection:**
```go
func checkClaudeCLI() error {
    _, err := exec.LookPath("claude")
    if err != nil {
        return &PrereqError{
            Code:    "PREREQ_NO_CLAUDE",
            Message: "Claude CLI not found",
            Suggestions: []string{
                "brew install claude",
                "npm install -g @anthropic/claude-cli",
            },
        }
    }
    return nil
}
```

**Resolution:**
```bash
# macOS (Homebrew)
brew install claude

# npm (cross-platform)
npm install -g @anthropic/claude-cli

# Verify installation
claude --version
```

### PREREQ_DISK_LOW

**Severity:** Critical (at <500MB) / High (at 90-95%)
**Recoverable:** Partially (auto-cleanup may help)

```
Error: Insufficient disk space

AXIOM requires at least 500MB free disk space.
Current free: 234MB

Suggestions:
- Clean git objects: git gc --prune=now
- Remove old workspaces: rm -rf .workspaces/*
- Check large files: du -sh * | sort -h
```

**Thresholds:**

| Free Space | Action |
|------------|--------|
| > 1GB | Normal operation |
| 500MB - 1GB | Warning logged |
| < 500MB | Error, refuse to start |
| < 100MB | Critical, stop all agents |

**Detection:**
```go
func checkDiskSpace(path string) error {
    var stat syscall.Statfs_t
    syscall.Statfs(path, &stat)

    freeBytes := stat.Bavail * uint64(stat.Bsize)
    freeMB := freeBytes / 1024 / 1024

    if freeMB < 500 {
        return &PrereqError{
            Code:    "PREREQ_DISK_LOW",
            Message: fmt.Sprintf("Insufficient disk space: %dMB free", freeMB),
            Suggestions: []string{
                "git gc --prune=now",
                "rm -rf .workspaces/*",
            },
        }
    }
    return nil
}
```

### PREREQ_NO_WRITE

**Severity:** Critical
**Recoverable:** No (user action required)

```
Error: Directory not writable

AXIOM cannot create .axiom/ directory.
Current permissions: dr-xr-xr-x

Resolution: chmod u+w .
```

**Detection:**
```go
func checkWritePermission(path string) error {
    testFile := filepath.Join(path, ".axiom-write-test")

    f, err := os.Create(testFile)
    if err != nil {
        return &PrereqError{
            Code:    "PREREQ_NO_WRITE",
            Message: "Directory not writable",
            Suggestions: []string{
                "chmod u+w .",
                "Check if filesystem is read-only",
            },
        }
    }

    f.Close()
    os.Remove(testFile)
    return nil
}
```

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

### Signal Validation Errors

Invalid signals are logged but never block agent execution.

| Code | Cause | Example | Recovery |
|------|-------|---------|----------|
| `SIGNAL_MALFORMED` | Doesn't match `<axiom>TYPE</axiom>` format | `[AXIOM:COMPLETE]` | Ignore, log warning |
| `SIGNAL_UNKNOWN_TYPE` | Type not in valid list | `<axiom>COMPLET</axiom>` | Ignore, log warning |
| `SIGNAL_MISSING_PAYLOAD` | Required payload absent | `<axiom>BLOCKED</axiom>` | Ignore, log warning |
| `SIGNAL_INVALID_PAYLOAD` | Payload fails validation | `<axiom>PROGRESS:abc</axiom>` | Ignore, log warning |

**Validation Code:**
```go
func validateSignal(raw string) (*Signal, error) {
    // Regex: <axiom>TYPE</axiom> or <axiom>TYPE:payload</axiom>
    matches := signalRegex.FindStringSubmatch(raw)
    if matches == nil {
        return nil, &SignalError{Code: "SIGNAL_MALFORMED", Raw: raw}
    }

    signalType := matches[1]
    payload := matches[2]

    // Validate type is known
    validTypes := []string{
        "COMPLETE", "BLOCKED", "PENDING", "PROGRESS",
        "RESOLVED", "DISCOVERY_LOCAL", "DISCOVERY_GLOBAL",
    }
    if !slices.Contains(validTypes, signalType) {
        return nil, &SignalError{Code: "SIGNAL_UNKNOWN_TYPE", Type: signalType}
    }

    // Validate required payloads
    requiresPayload := []string{"BLOCKED", "PENDING", "DISCOVERY_LOCAL", "DISCOVERY_GLOBAL"}
    if slices.Contains(requiresPayload, signalType) && payload == "" {
        return nil, &SignalError{Code: "SIGNAL_MISSING_PAYLOAD", Type: signalType}
    }

    // Validate PROGRESS is 0-100
    if signalType == "PROGRESS" {
        pct, err := strconv.Atoi(payload)
        if err != nil || pct < 0 || pct > 100 {
            return nil, &SignalError{Code: "SIGNAL_INVALID_PAYLOAD", Type: signalType}
        }
    }

    return &Signal{Type: signalType, Payload: payload}, nil
}
```

**Logging:**
```json
{"ts":"...","level":"warn","code":"SIGNAL_UNKNOWN_TYPE","agent":"echo-001","task":"task-042","raw":"<axiom>COMPLET</axiom>"}
```

**Key Principle:** Invalid signals are never fatal. Log and continue.

### Agent Behavior Errors

| Error | Cause | Recovery | Escalation |
|-------|-------|----------|------------|
| `stuck_iterations` | No progress | Send nudge prompt | After stuckThreshold |
| `infinite_loop` | Same output repeated | Force stop, human review | Immediately |
| `invalid_commits` | Broken git state | Reset workspace | After 2 occurrences |
| `verification_failures` | Tests/lint failing | Retry with feedback | After maxIterations |

### Verification Errors

| Code | Cause | Recovery | Escalation |
|------|-------|----------|------------|
| `VERIFICATION_TIMEOUT` | Command exceeded timeout | Retry iteration | After maxIterations |
| `VERIFICATION_FAILED` | Command returned non-zero | Retry iteration | After maxIterations |
| `VERIFICATION_SKIPPED` | Optional command failed/timeout | Continue (warning only) | Never |

#### VERIFICATION_TIMEOUT

**Severity:** Medium (required) / Low (optional)
**Recoverable:** Yes (agent retries)

```
Error: Verification command timed out

Command: npm test
Timeout: 600 seconds
Status: Required command - verification failed

Agent will retry with fixes.
```

**Common causes:**
- Test suite too slow
- Infinite loop in tests
- Network-dependent tests hanging
- Database connection timeout

**Resolution options:**
1. Increase timeout in config: `{ "command": "npm test", "timeout": 900 }`
2. Mark as optional: `{ "command": "npm test", "required": false }`
3. Optimize slow tests
4. Add test timeout in test framework

**Detection:**
```go
func runVerificationCommand(cmd VerificationCommand, cwd string) *VerificationResult {
    timeout := cmd.Timeout
    if timeout == 0 {
        timeout = 300 // default 5 minutes
    }

    ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
    defer cancel()

    proc := exec.CommandContext(ctx, "sh", "-c", cmd.Command)
    proc.Dir = cwd

    output, err := proc.CombinedOutput()

    if ctx.Err() == context.DeadlineExceeded {
        return &VerificationResult{
            Command:  cmd.Command,
            TimedOut: true,
            Error: &VerificationError{
                Code:    "VERIFICATION_TIMEOUT",
                Message: fmt.Sprintf("Command timed out after %ds", timeout),
            },
        }
    }

    if err != nil {
        return &VerificationResult{
            Command:  cmd.Command,
            ExitCode: proc.ProcessState.ExitCode(),
            Output:   string(output),
            Error: &VerificationError{
                Code:    "VERIFICATION_FAILED",
                Message: fmt.Sprintf("Command failed with exit code %d", proc.ProcessState.ExitCode()),
            },
        }
    }

    return &VerificationResult{Command: cmd.Command, Success: true}
}
```

**Logging:**
```json
{"ts":"...","level":"error","code":"VERIFICATION_TIMEOUT","agent":"echo-001","task":"task-042","command":"npm test","timeout":600}
{"ts":"...","level":"warn","code":"VERIFICATION_SKIPPED","agent":"echo-001","task":"task-042","command":"npm run lint","reason":"timeout","required":false}
```

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
