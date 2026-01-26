# Autopilot Mode (Execution Loop)

Autopilot implements the **Execution Loop** pattern for autonomous Task execution.

---

## Execution Loop Concept

The Execution Loop continuously:
1. Pick a ready Task
2. Execute until complete
3. Repeat until no ready Tasks

---

## Loop Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTION LOOP                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Start Autopilot                                             │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────┐                                            │
│  │ Ready Tasks? │◄────────────────────────────────┐          │
│  └──────┬───────┘                                 │          │
│         │                                         │          │
│    No   │   Yes                                   │          │
│    │    │                                         │          │
│    │    ▼                                         │          │
│    │  ┌─────────────┐                             │          │
│    │  │ Agent slots │                             │          │
│    │  │ available?  │                             │          │
│    │  └──────┬──────┘                             │          │
│    │         │                                    │          │
│    │    No   │   Yes                              │          │
│    │    │    │                                    │          │
│    │    │    ▼                                    │          │
│    │    │  ┌──────────────────┐                   │          │
│    │    │  │ Select next Task │                   │          │
│    │    │  │ (from ready pool)│                   │          │
│    │    │  └────────┬─────────┘                   │          │
│    │    │           │                             │          │
│    │    │           ▼                             │          │
│    │    │  ┌──────────────────┐                   │          │
│    │    │  │ Spawn Echo agent │                   │          │
│    │    │  │ in workspace     │                   │          │
│    │    │  └────────┬─────────┘                   │          │
│    │    │           │                             │          │
│    │    │           ▼                             │          │
│    │    │  ┌──────────────────┐                   │          │
│    │    │  │ Agent executes   │                   │          │
│    │    │  │ (iteration loop) │                   │          │
│    │    │  └────────┬─────────┘                   │          │
│    │    │           │                             │          │
│    │    │           ▼                             │          │
│    │    │  ┌──────────────────┐                   │          │
│    │    │  │ On completion:   │                   │          │
│    │    │  │ - Mark Task done │                   │          │
│    │    │  │ - Queue merge    │                   │          │
│    │    │  │ - Free slot      │                   │          │
│    │    │  └────────┬─────────┘                   │          │
│    │    │           │                             │          │
│    │    └───────────┴─────────────────────────────┘          │
│    │                                                         │
│    ▼                                                         │
│  Exit (all done or paused)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Iteration

Each Echo agent runs in a loop until completion or limit:

```
Agent Iteration Loop:
  while iteration < maxIterations:
    iteration++

    runAgentCLI(prompt, workspace)

    signal = parseOutput()

    if signal == COMPLETE:
      runVerification()
      if allPass:
        return SUCCESS
      else:
        continue  // Agent will fix

    if signal == BLOCKED:
      return BLOCKED

    if signal == PENDING:
      pauseAgent()
      waitForHuman()
      continue

    if stuckCheck(iterations, commits):
      warnUser()

  return TIMEOUT
```

---

## Iteration Control

| Config | Default | Description |
|--------|---------|-------------|
| `maxIterations` | 50 | Max iterations before timeout |
| `stuckThreshold` | 5 | Iterations without commit = warning |
| `timeoutMinutes` | 30 | Wall-clock timeout |

### Stuck Detection

If agent runs N iterations without a commit:
1. Warning in Web UI
2. Continue running (may be thinking)
3. User can intervene via Intervention Panel

---

## Completion Check

Completion requires BOTH signal AND required verification commands passing:

```
┌──────────────────┬─────────────────┬─────────────────────────────────┐
│ Signal           │ Verification    │ Result                          │
├──────────────────┼─────────────────┼─────────────────────────────────┤
│ COMPLETE         │ All Pass        │ ✓ Case done, queue merge        │
│ COMPLETE         │ Any Fail        │ Continue iterations             │
│ BLOCKED          │ (any)           │ Case → blocked, agent stops     │
│ PENDING          │ (any)           │ Alert user, agent pauses        │
│ No Signal        │ All Pass        │ Continue (agent must signal)    │
│ No Signal        │ Any Fail        │ Continue iterations             │
│ Max Iterations   │ (any)           │ Case → timeout, agent stops     │
│ Timeout          │ (any)           │ Case → timeout, agent stops     │
└──────────────────┴─────────────────┴─────────────────────────────────┘
```

### Mode-Specific Behavior

**BLOCKED Signal:**
- Semi-auto: Agent stops, user decides next action
- Autopilot: Agent freed, case stays blocked, picks next ready Task

**TIMEOUT State:**
- Case marked as timeout (distinct from failed)
- Workspace preserved for debugging
- User can: (r) retry, (e) edit case, (R) rollback
- Autopilot: Skips case, picks next ready Task, alerts user

---

## Verification Gate

After COMPLETE signal, run all verification commands:

```
runVerificationGate():
  for cmd in config.verification.commands:
    timeout = cmd.timeout ?? config.verification.defaultTimeout ?? 300

    result = runWithTimeout(cmd.command, timeout, cwd=workspace)

    if result.timedOut:
      if cmd.required:
        return { pass: false, error: "VERIFICATION_TIMEOUT", command: cmd }
      else:
        log.warn("Optional verification timed out", cmd.name)
        continue

    if result.exitCode != 0:
      if cmd.required:
        return { pass: false, error: "VERIFICATION_FAILED", command: cmd }
      else:
        log.warn("Optional verification failed", cmd.name)
        continue

  return { pass: true }
```

If verification fails, agent continues iterating to fix issues.

### Verification Timeout Behavior

| Scenario | `required: true` | `required: false` |
|----------|------------------|-------------------|
| Command succeeds | Continue | Continue |
| Command fails | Verification fails, retry | Log warning, continue |
| Command times out | Verification fails, retry | Log warning, continue |

### Timeout Configuration

```json
{
  "verification": {
    "defaultTimeout": 300,
    "commands": [
      { "command": "npm test", "timeout": 600 },
      { "command": "npm run lint", "timeout": 60, "required": false }
    ]
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `defaultTimeout` | 300s (5 min) | Applied to commands without explicit timeout |
| Per-command `timeout` | Inherits default | Override for slow commands |
| `required` | true | If false, timeout/failure doesn't block |

### Empty Verification Array

When `config.verification` is empty (`[]`) or not defined:

```
Agent emits COMPLETE signal
     │
     ▼
No verification commands configured
     │
     ▼
Task auto-passes (immediate completion)
     │
     ▼
Warning logged: "VERIFICATION_EMPTY"
```

**Behavior:**
- COMPLETE signal → Task marked done (no verification)
- Warning logged for audit
- Web UI shows "No verification configured" indicator

**Warning:**
```
Warning: No verification commands configured

Tasks will complete on COMPLETE signal without validation.
Consider adding verification commands to ensure code quality.

Suggestion: Add to config.json:
  "verification": ["npm test", "npm run typecheck"]
```

**Config validation:**
| Config State | Behavior | Init Warning |
|--------------|----------|--------------|
| `verification: []` | Auto-pass | Yes |
| `verification: undefined` | Auto-pass | Yes (during init) |
| `verification: [...]` | Normal | No |

**Use cases for empty verification:**
- Prototyping/spike Tasks
- Documentation-only changes
- Config-only changes

**Recommended minimum:**
```json
{
  "verification": [
    { "command": "npm test", "required": true }
  ]
}
```

At least one required verification command is recommended for production use.

### Timeout Handling

```go
func runWithTimeout(cmd string, timeoutSecs int, cwd string) *Result {
    ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSecs)*time.Second)
    defer cancel()

    proc := exec.CommandContext(ctx, "sh", "-c", cmd)
    proc.Dir = cwd

    output, err := proc.CombinedOutput()

    if ctx.Err() == context.DeadlineExceeded {
        return &Result{
            TimedOut: true,
            Error:    fmt.Sprintf("Command timed out after %ds", timeoutSecs),
        }
    }

    return &Result{
        ExitCode: proc.ProcessState.ExitCode(),
        Output:   string(output),
        Error:    err,
    }
}
```

### Verification in Web UI

The Agent Card shows verification progress:

```
┌─────────────────────────────────────────────────────────┐
│  VERIFICATION                                           │
│  ─────────────────────────────────────────────────────  │
│  ✓ Unit Tests         passed     (42s / 600s)          │
│  ● TypeScript         running... (15s / 120s)          │
│  ○ Linting           waiting                           │
└─────────────────────────────────────────────────────────┘
```

On timeout:
```
│  ✗ Unit Tests         TIMEOUT    (600s / 600s)         │
```

---

## Task Selection Algorithm

When autopilot needs to select the next Task, it uses a scoring system:

```
selectNextReady(excludeIds):
  readyCases = caseStore.ready('task')
    .filter(c => !excludeIds.includes(c.id))

  if readyCases.isEmpty():
    return null

  // Score each case
  for c in readyCases:
    c.score = calculateScore(c)

  // Return highest scoring
  return readyCases.sortByDescending(c => c.score).first()

calculateScore(c):
  score = 0

  // Unblocked dependencies: cases waiting on this one
  score += c.unblocks.length * 10

  // Priority tag boost
  if c.hasTag('critical'): score += 50
  if c.hasTag('quick-win'): score += 30

  // Parent Operation completion progress
  parentOp = c.parent
  completedSiblings = parentOp.children.count(s => s.status == 'done')
  totalSiblings = parentOp.children.count()
  if completedSiblings > totalSiblings / 2:
    score += 20  // Prefer finishing near-complete features

  // Retry penalty (avoid repeatedly failing cases)
  score -= c.retryCount * 15

  return score
```

### Selection Criteria Priority

| Priority | Criteria | Score Impact |
|----------|----------|--------------|
| 1 | Unblocks other cases | +10 per blocked case |
| 2 | Critical tag | +50 |
| 3 | Quick-win tag | +30 |
| 4 | Near-complete parent Operation | +20 |
| 5 | Retry penalty | -15 per retry |

---

## Slot Management

Autopilot maintains `maxParallel` agent slots. When a slot becomes available and ready Tasks exist, a new agent spawns automatically to fill the slot.

---

## Signal Handling (Autopilot)

| Signal | Action |
|--------|--------|
| COMPLETE | Mark Task done, queue merge, pick next |
| BLOCKED | Mark blocked, free slot, pick next |
| PENDING | Pause agent, alert user, continue others |
| PROGRESS | Update UI |
| TIMEOUT | Mark timeout, free slot, pick next |

---

## Pause/Resume

Pausing autopilot:

1. Stop spawning new agents
2. Wait for running agents to reach checkpoint (iteration end)
3. Display pause status
4. Resume when ready

Agents pause at iteration end, not mid-iteration, ensuring clean state, no partial commits, and consistent workspace state.

---

## Error Handling

### Consecutive Errors

If N consecutive Tasks fail:
1. Pause autopilot
2. Alert user
3. Require manual intervention

Default threshold: 3 consecutive errors.

### Recovery Actions

| Error Type | Auto-Recovery | Manual Option |
|------------|---------------|---------------|
| Verification fail | Retry iteration | Skip case |
| Timeout | Mark timeout | Increase limit |
| Blocked | Pick different | Unblock manually |
| Crash | Reset to pending | Debug workspace |

---

## Agent Exit Handling

```
┌──────────────────┬────────────────┬────────────────────────────────┐
│ Exit Condition   │ Case Status    │ Action                         │
├──────────────────┼────────────────┼────────────────────────────────┤
│ 0 + COMPLETE     │ done           │ Queue merge, cleanup           │
│ 0 + COMPLETE     │ (tests fail)   │ Continue iterations            │
│ 0 + no signal    │ active         │ Increment iteration            │
│ 0 + BLOCKED      │ blocked        │ Log reason, alert user         │
│ != 0             │ failed         │ Keep workspace, alert          │
│ SIGTERM (user)   │ pending        │ Stash changes, release case    │
│ SIGKILL (crash)  │ pending        │ Keep workspace for recovery    │
└──────────────────┴────────────────┴────────────────────────────────┘
```

---

## Case Recovery

### FAILED Recovery

- Press `r` on failed case → Case returns to pending, workspace preserved
- Press `e` to edit case description → Then retry
- Press `R` to rollback → Reverts commits, case → pending
- Press `X` (Shift+x) to cleanup workspace → Removes workspace, case stays failed

### TIMEOUT Recovery

- Press `r` on timed-out case → Fresh iteration counter, retry
- Press `e` to simplify case → Break into smaller cases
- Press `+` to increase maxIterations for this case
- Distinct from FAILED: No error occurred, agent just couldn't finish in time

---

## State Machine Integration

The Execution Loop is implemented in the orchestration service as a state machine:

```
orchestration:
├── idle
│   on: START_AUTOPILOT → running
│       START_SEMI_AUTO → waiting_user
│
├── running
│   invoke: executionLoop goroutine
│   on: PAUSE → paused
│       AGENT_COMPLETED → handleCompletion
│       AGENT_BLOCKED → handleBlocked
│       NO_MORE_CASES → completed
│
├── paused
│   on: RESUME → running
│
├── waiting_user
│   on: ASSIGN_CASE → spawnAgent
│       TOGGLE_AUTOPILOT → running
│
└── completed (final)
```

---

## Parallel Agent Coordination

When multiple agents work simultaneously in autopilot:

```go
func (o *Orchestrator) RunExecutionLoop(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }

        // Fill available slots with agents
        for len(o.agents) < o.maxAgents {
            excludeIDs := make([]string, 0, len(o.agents))
            for _, a := range o.agents {
                excludeIDs = append(excludeIDs, a.CaseID)
            }

            task := o.caseStore.SelectNextReady(excludeIDs)
            if task == nil {
                break
            }

            if err := o.spawnAgent(ctx, task); err != nil {
                log.Error("Failed to spawn agent", "error", err)
            }
        }

        // Wait for any agent to complete
        result := o.waitForCompletion(ctx)
        o.handleResult(result)

        // Check if done
        readyCount := o.caseStore.ReadyCount("task")
        if readyCount == 0 && len(o.agents) == 0 {
            return nil
        }
    }
}
```

---

## Autopilot Statistics

Auditor Ash tracks session statistics: runtime, Tasks completed/failed/remaining, iteration counts (total, average, fastest, slowest), and merge results (successful, conflicts resolved, pending).

---

## Sprint Planning

Configuration wrapper for batch execution. Sprint planning provides a Web UI panel to configure target and settings before starting autopilot.

### Sprint Targets

| Target | Description |
|--------|-------------|
| `count` | Run N Tasks then stop |
| `duration` | Run for N hours then stop |
| `until_time` | Run until specific time |
| `no_ready` | Run until no ready Tasks |

---

## Sprint Configuration

```json
{
  "sprint": {
    "target": {
      "type": "count",
      "value": 10
    },
    "filters": {
      "includeOperations": ["case-015"],
      "excludeTags": ["later"]
    },
    "options": {
      "checkpointBefore": true,
      "pauseOnError": false,
      "batchReview": true
    }
  }
}
```

### Sprint Settings

| Setting | Config Key | Default | Description |
|---------|------------|---------|-------------|
| Max iterations | `completion.maxIterations` | 50 | Max iterations per Task |
| Task timeout | `agents.timeoutMinutes` | 30 min | Timeout per Task |
| Stuck detection | - | 5 iterations | Alert if no git commits |
| Error threshold | - | 3 consecutive | Pause if 3 errors in a row |

---

## Sprint Statistics

Sprint data stored in `.axiom/sprints.jsonl`:

```go
type SprintStats struct {
    ID        string       `json:"id"`
    StartedAt int64        `json:"startedAt"`
    EndedAt   *int64       `json:"endedAt"` // nil if still running
    Target    SprintTarget `json:"target"`

    // Task counts
    TotalTasks     int `json:"totalTasks"`
    CompletedTasks int `json:"completedTasks"`
    FailedTasks    int `json:"failedTasks"`
    ReviewingTasks int `json:"reviewingTasks"`

    // Per-task stats (for analytics)
    TaskStats []TaskStat `json:"taskStats"`

    // Settings used
    Settings SprintSettings `json:"settings"`
}

type TaskStat struct {
    TaskID         string `json:"taskId"`
    StartedAt      int64  `json:"startedAt"`
    CompletedAt    int64  `json:"completedAt"`
    Iterations     int    `json:"iterations"`
    VerificationPassed bool `json:"verificationPassed"`
    ReviewDecision string `json:"reviewDecision,omitempty"` // "approved", "redo", "rejected"
}

type SprintSettings struct {
    MaxIterations int  `json:"maxIterations"`
    TaskTimeout   int  `json:"taskTimeout"`
    PauseOnStuck  bool `json:"pauseOnStuck"`
    PauseOnErrors bool `json:"pauseOnErrors"`
}
```

---

## State Machine Sprint Region

```
sprint:
├── idle
│   on: OPEN_SPRINT_PANEL → configuring
│
├── configuring
│   on: START_SPRINT → running (if hasValidTarget)
│       actions: createCheckpoint, initializeSprintStats
│       CANCEL → idle
│
├── running
│   entry: notifySprintStarted
│   on: TASK_COMPLETED → updateSprintStats
│       TASK_FAILED → updateSprintStats
│       TARGET_REACHED → completing
│       PAUSE_SPRINT → paused
│       CANCEL_SPRINT → idle (saveSprintStats)
│   always: → completing (if isTargetReached)
│
├── paused
│   on: RESUME_SPRINT → running
│       CANCEL_SPRINT → idle (saveSprintStats)
│
└── completing
    entry: saveSprintStats, notifySprintCompleted
    always: → idle
```

---

## Sprint Lifecycle

```
Sprint Start
     │
     ▼
Create checkpoint (if enabled)
     │
     ▼
Switch to autopilot
     │
     ▼
Run until target met
     │
     ├── Target met ──► Stop
     │
     ├── Error (if pauseOnError) ──► Pause
     │
     └── No ready Tasks ──► Stop
          │
          ▼
Batch review (if enabled)
     │
     ▼
Sprint complete
```
