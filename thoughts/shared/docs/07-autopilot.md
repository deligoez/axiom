# Autopilot Mode (Ralph Loop)

Autopilot implements the "Ralph Wiggum" pattern for autonomous Green idea execution.

---

## Ralph Loop Concept

Named after the Ralph Wiggum pattern, the loop continuously:
1. Pick a ready Green idea
2. Execute until complete
3. Repeat until no ready Greens

---

## Loop Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      RALPH LOOP                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Start Autopilot                                             │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────┐                                            │
│  │ Ready Greens?│◄────────────────────────────────┐          │
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
│    │    │  │ Select next Green│                   │          │
│    │    │  │ (from ready pool)│                   │          │
│    │    │  └────────┬─────────┘                   │          │
│    │    │           │                             │          │
│    │    │           ▼                             │          │
│    │    │  ┌──────────────────┐                   │          │
│    │    │  │ Spawn Ed agent   │                   │          │
│    │    │  │ in worktree      │                   │          │
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
│    │    │  │ - Mark Green done│                   │          │
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

Each Ed agent runs in a loop until completion or limit:

```
Agent Iteration Loop:
  while iteration < maxIterations:
    iteration++

    runAgentCLI(prompt, worktree)

    signal = parseOutput()

    if signal == COMPLETE:
      runQualityCommands()
      if allPass:
        return SUCCESS
      else:
        continue  // Agent will fix

    if signal == BLOCKED:
      return BLOCKED

    if signal == NEEDS_HUMAN:
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

Completion requires BOTH signal AND required quality commands passing:

```
┌──────────────────┬─────────────────┬─────────────────────────────────┐
│ Signal           │ Quality Commands│ Result                          │
├──────────────────┼─────────────────┼─────────────────────────────────┤
│ COMPLETE         │ All Pass        │ ✓ Idea done, queue merge        │
│ COMPLETE         │ Any Fail        │ Continue iterations             │
│ BLOCKED          │ (any)           │ Idea → blocked, agent stops     │
│ NEEDS_HUMAN       │ (any)           │ Alert user, agent pauses        │
│ No Signal        │ All Pass        │ Continue (agent must signal)    │
│ No Signal        │ Any Fail        │ Continue iterations             │
│ Max Iterations   │ (any)           │ Idea → timeout, agent stops     │
│ Timeout          │ (any)           │ Idea → timeout, agent stops     │
└──────────────────┴─────────────────┴─────────────────────────────────┘
```

### Mode-Specific Behavior

**BLOCKED Signal:**
- Semi-auto: Agent stops, user decides next action
- Autopilot: Agent freed, idea stays blocked, picks next ready idea

**TIMEOUT State:**
- Idea marked as timeout (distinct from failed)
- Worktree preserved for debugging
- User can: (r) retry, (e) edit idea, (R) rollback
- Autopilot: Skips idea, picks next ready idea, alerts user

---

## Quality Gate

After COMPLETE signal, run all quality commands:

```
runQualityGate():
  for command in config.qualityCommands:
    result = run(command, cwd=worktree)
    if result.exitCode != 0:
      return { pass: false, command, output: result.stderr }

  return { pass: true }
```

If quality fails, agent continues iterating to fix issues.

---

## Idea Selection Algorithm

When autopilot needs to select the next Green idea, it uses a scoring system:

```
selectNextReady(excludeIds):
  readyIdeas = ideaStore.ready('green')
    .filter(idea => !excludeIds.includes(idea.id))

  if readyIdeas.isEmpty():
    return null

  // Score each idea
  for idea in readyIdeas:
    idea.score = calculateScore(idea)

  // Return highest scoring
  return readyIdeas.sortByDescending(i => i.score).first()

calculateScore(idea):
  score = 0

  // Unblocked dependencies: ideas waiting on this one
  score += idea.unblocks.length * 10

  // Priority tag boost
  if idea.hasTag('critical'): score += 50
  if idea.hasTag('quick-win'): score += 30

  // Parent Blue completion progress
  parentBlue = idea.parent
  completedSiblings = parentBlue.children.count(c => c.status == 'done')
  totalSiblings = parentBlue.children.count()
  if completedSiblings > totalSiblings / 2:
    score += 20  // Prefer finishing near-complete features

  // Retry penalty (avoid repeatedly failing ideas)
  score -= idea.retryCount * 15

  return score
```

### Selection Criteria Priority

| Priority | Criteria | Score Impact |
|----------|----------|--------------|
| 1 | Unblocks other ideas | +10 per blocked idea |
| 2 | Critical tag | +50 |
| 3 | Quick-win tag | +30 |
| 4 | Near-complete parent Blue | +20 |
| 5 | Retry penalty | -15 per retry |

---

## Slot Management

Autopilot maintains `maxParallel` agent slots. When a slot becomes available and ready Green ideas exist, a new agent spawns automatically to fill the slot.

---

## Signal Handling (Autopilot)

| Signal | Action |
|--------|--------|
| COMPLETE | Mark Green done, queue merge, pick next |
| BLOCKED | Mark blocked, free slot, pick next |
| NEEDS_HUMAN | Pause agent, alert user, continue others |
| PROGRESS | Update UI |
| TIMEOUT | Mark timeout, free slot, pick next |

---

## Pause/Resume

Pausing autopilot:

1. Stop spawning new agents
2. Wait for running agents to reach safe boundary (iteration end)
3. Display pause status
4. Resume when ready

Agents pause at iteration end, not mid-iteration, ensuring clean state, no partial commits, and consistent worktree state.

---

## Error Handling

### Consecutive Errors

If N consecutive Green ideas fail:
1. Pause autopilot
2. Alert user
3. Require manual intervention

Default threshold: 3 consecutive errors.

### Recovery Actions

| Error Type | Auto-Recovery | Manual Option |
|------------|---------------|---------------|
| Quality fail | Retry iteration | Skip idea |
| Timeout | Mark timeout | Increase limit |
| Blocked | Pick different | Unblock manually |
| Crash | Reset to pending | Debug worktree |

---

## Agent Exit Handling

```
┌──────────────────┬────────────────┬────────────────────────────────┐
│ Exit Condition   │ Idea Status    │ Action                         │
├──────────────────┼────────────────┼────────────────────────────────┤
│ 0 + COMPLETE     │ done           │ Queue merge, cleanup           │
│ 0 + COMPLETE     │ (tests fail)   │ Continue iterations            │
│ 0 + no signal    │ active         │ Increment iteration            │
│ 0 + BLOCKED      │ blocked        │ Log reason, alert user         │
│ != 0             │ failed         │ Keep worktree, alert           │
│ SIGTERM (user)   │ pending        │ Stash changes, release idea    │
│ SIGKILL (crash)  │ pending        │ Keep worktree for recovery     │
└──────────────────┴────────────────┴────────────────────────────────┘
```

---

## Idea Recovery

### FAILED Recovery

- Press `r` on failed idea → Idea returns to pending, worktree preserved
- Press `e` to edit idea description → Then retry
- Press `R` to rollback → Reverts commits, idea → pending
- Press `X` (Shift+x) to cleanup worktree → Removes worktree, idea stays failed

### TIMEOUT Recovery

- Press `r` on timed-out idea → Fresh iteration counter, retry
- Press `e` to simplify idea → Break into smaller ideas
- Press `+` to increase maxIterations for this idea
- Distinct from FAILED: No error occurred, agent just couldn't finish in time

---

## State Machine Integration

The Ralph loop is implemented in the orchestration service as a state machine:

```
orchestration:
├── idle
│   on: START_AUTOPILOT → running
│       START_SEMI_AUTO → waiting_user
│
├── running
│   invoke: ralphLoop goroutine
│   on: PAUSE → paused
│       AGENT_COMPLETED → handleCompletion
│       AGENT_BLOCKED → handleBlocked
│       NO_MORE_IDEAS → completed
│
├── paused
│   on: RESUME → running
│
├── waiting_user
│   on: ASSIGN_IDEA → spawnAgent
│       TOGGLE_AUTOPILOT → running
│
└── completed (final)
```

---

## Parallel Agent Coordination

When multiple agents work simultaneously in autopilot:

```go
func (o *Orchestrator) RunRalphLoop(ctx context.Context) error {
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
                excludeIDs = append(excludeIDs, a.IdeaID)
            }

            idea := o.ideaStore.SelectNextReady(excludeIDs)
            if idea == nil {
                break
            }

            if err := o.spawnAgent(ctx, idea); err != nil {
                log.Error("Failed to spawn agent", "error", err)
            }
        }

        // Wait for any agent to complete
        result := o.waitForCompletion(ctx)
        o.handleResult(result)

        // Check if done
        readyCount := o.ideaStore.ReadyCount("green")
        if readyCount == 0 && len(o.agents) == 0 {
            return nil
        }
    }
}
```

---

## Autopilot Statistics

Counter Carl tracks session statistics: runtime, Green ideas completed/failed/remaining, iteration counts (total, average, fastest, slowest), and merge results (successful, conflicts resolved, pending).
