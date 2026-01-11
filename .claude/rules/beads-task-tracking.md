# Beads Task Tracking Rules

How to track Chorus Phase 4 features via Beads (`bd` CLI).

## Task Creation

```bash
# Create feature task with dependencies
bd create "F01: Config System" \
  -p 1 \
  -l m1-infrastructure \
  --body "$(cat <<'EOF'
## What
Read/write `.chorus/config.json`

## Acceptance Criteria
- [ ] Can load config from file
- [ ] Returns defaults if file doesn't exist
- [ ] Can save config to file
- [ ] Validates config structure
- [ ] 8 tests pass

## Files
- src/types/config.ts
- src/services/ConfigService.ts
- tests/services/ConfigService.test.ts
EOF
)"
```

## Naming Convention

| Prefix | Meaning |
|--------|---------|
| F## | Feature (from plan) |
| BUG | Bug fix |
| CHORE | Non-feature work |

## Labels

| Label | Meaning |
|-------|---------|
| m0-planning | Milestone 0: Planning Phase (Init, Plan Agent, Validation) |
| m1-infrastructure | Milestone 1: Config, State, Worktree |
| m2-agent-prep | Milestone 2: Prompt, Signal, Linking |
| m3-task-mgmt | Milestone 3: Test, Completion, Claim, Close |
| m4-orchestration | Milestone 4: Orchestrator, Semi-Auto, UI |
| m5-merge | Milestone 5: Merge Service |
| m6-parallelism | Milestone 6: Slot Manager |
| m7-autopilot | Milestone 7: Ralph Loop |
| m8-memory | Milestone 8: Learning/Memory System |
| m9-intervention | Milestone 9: Human Intervention |
| m10-rollback | Milestone 10: Rollback & Recovery |
| m11-hooks | Milestone 11: Hooks System |
| m12-tui | Milestone 12: TUI Visualization |
| bug | Bug fix |
| **deferred** | **Not for MVP - future implementation** |

Note: Keep labels minimal - just milestone. Avoid verbose labels like `feature`, `critical-path`.

## Deferred Tasks

Tasks marked with `deferred` label are excluded from active development:

```bash
# Mark task as deferred
bd label add ch-xxx deferred

# Remove deferred label when ready to implement
bd label remove ch-xxx deferred

# List deferred tasks
bd list -n 0 | grep "deferred"
```

**IMPORTANT:** When getting ready tasks, ALWAYS exclude deferred:

```bash
# WRONG - includes deferred tasks
bd ready -n 0

# CORRECT - excludes deferred tasks
bd ready -n 0 | grep -v "deferred"
```

**Current Deferred Tasks (non-Claude agent support):**
- ch-q1j (F07b) - Non-Claude Context Injection
- ch-jbe (F03c) - Non-Claude CLI Detection
- ch-eyd (F42) - Learning Injector

## Dependencies

```bash
# Add dependency (F04 depends on nothing, F05 depends on F04)
bd create "F05: Worktree Cleanup" --deps ch-xxxx  # where xxxx is F04's ID

# Multiple dependencies
bd create "F15: Orchestrator" --deps ch-xxx,ch-yyy,ch-zzz
```

## TDD Design Requirements

Every task MUST be designed for Test-Driven Development:

### Required in Acceptance Criteria
1. **Explicit test count**: "X tests pass" (not "tests pass")
2. **Testable methods**: Each method/function listed with expected behavior
3. **Edge cases**: Error handling, null returns, empty arrays explicitly stated
4. **No vague criteria**: "Works correctly" → "Returns X when Y"

### Task Structure Checklist
```markdown
## Acceptance Criteria
- [ ] `methodName()` does X           ← Specific behavior
- [ ] `methodName()` returns Y when Z ← Edge case
- [ ] `methodName()` throws on error  ← Error handling
- [ ] N tests pass                    ← Explicit count
```

### Anti-patterns to Avoid
| Bad | Good |
|-----|------|
| "Works correctly" | "`parse()` returns Signal object" |
| "Handles errors" | "`run()` throws on non-zero exit" |
| "Tests pass" | "6 tests pass" |
| "Returns result" | "Returns `null` for invalid ID" |

### Before Creating/Updating Task
Ask yourself:
1. Can I write a failing test for each criterion?
2. Is the expected behavior specific enough?
3. Are edge cases (null, empty, error) covered?
4. Is the test count accurate?

---

## Workflow

1. **Pick task**: `bd ready -n 0 | grep -v "deferred"` shows available tasks (excluding deferred)
2. **Start task**: `bd update <id> --status=in_progress`
3. **TDD**: Write tests → RED → Implement → GREEN → Commit
4. **Complete**: `bd close <id>`
5. **Dependencies auto-unblock**: Dependents become ready

**CRITICAL:** Always filter out deferred tasks when picking work. Deferred tasks are for future implementation.

## Progress Check

```bash
bd list -n 0                         # All tasks
bd ready -n 0 | grep -v "deferred"   # Ready to work (active only)
bd list --status=closed              # Completed
bd show <id>               # Task details
```

## Learnings Log

Update this section as you learn:

### 2026-01-11 (v3.6)
- Master Plan v3.6: Incremental Planning & Manual Triggers
- NEW: Implementation-Triggered Task Creation (Just-in-Time planning)
- NEW: Planning Horizon concept with stop conditions
- NEW: Spec Lifecycle (Consumed Backlog Pattern) - collapse tasked, archive complete
- NEW: TUI Manual Triggers (P for planning, Ctrl+L for learning review)
- NEW FEATURES CREATED:
  - F98 Incremental Planning Trigger (ch-yhq)
  - F99 Planning Horizon Manager (ch-wqn)
  - F100 Spec Evolution Tracker (ch-2yp)
  - F100a Spec Section Collapser (ch-iru)
  - F100b Spec Archiver (ch-tr4)
  - F101a TUI Learning Review Trigger (ch-s8u)
  - F101b TUI Planning Trigger (ch-fts)
- Total: 7 new tasks in M8/M12

### 2026-01-11 (v3.0-v3.5)
- M0 Planning Phase tasks created (25 tasks)
- m0-planning label added for Planning Phase milestone
- Existing M1 tasks updated with qualityCommands support
- F01a-c, F03b, F07, F10 updated with new requirements
- F89 App Router, F90 CLI Parser, F91 Implementation Mode added
- Total tasks: 127 (102 existing + 25 new)
- **Master Plan Coverage Audit:**
  - F86 (ch-to7): Added `chosenMode` field to state (9 tests)
  - F85 (ch-a0a): Added state transition + F86 dependency (12 tests)
  - F80 (ch-m9y): Added F03b-1 dependency
  - F03b-1 (ch-mdj): Removed unnecessary F01c dependency
  - Ready tasks: 48

### 2026-01-10
- Initial setup complete
- bd v0.46.0 installed via homebrew
- Flag is `--deps` not `--depends`
- Use `-d` or `--description` for short desc, `--body` for full markdown
- `bd ready` shows tasks with no blockers (dependencies satisfied)
- Tasks blocked by deps don't appear in `bd ready`
- Use `bd dep add <blocked> <blocker>` to add deps after creation
- Use `bd dep remove <blocked> <blocker>` to remove deps
- Use `bd blocked` to see all blocked tasks with their blockers
- **IMPORTANT**: If `bd dep remove` doesn't persist, use `bd --no-daemon dep remove`
- Prefix changed from `bd-` to `ch-` (Chorus)
- **FIXED**: F09 does NOT depend on F02b - they are independent (Agent types vs ChorusState)
- **FIXED**: F10 does NOT depend on F01b - TestRunner receives testCommand as constructor arg, caller provides it
- **CLEANED**: Removed `feature` and `critical-path` labels - keep only milestone labels for cleaner output
- **TIP**: Use `bd --no-daemon label remove <id> <label>` if changes don't persist

## Current Task IDs

### M0: Planning Phase

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F87 Session Logger | ch-73s | - | ready |
| F88 PATTERNS.md Manager | ch-j40 | - | ready |
| F80a Project Detector | ch-06m | - | ready |
| F80b Config Wizard | ch-4ba | ch-06m | blocked |
| F80c Quality Commands Manager | ch-h0s | - | ready |
| F80d Plan Review Config Wizard | ch-uwx | ch-h0s | blocked |
| F80 Init Mode Controller | ch-m9y | ch-06m,ch-4ba,ch-h0s,ch-uwx,ch-73s,ch-mdj | blocked |
| F81a Planning TUI Layout | ch-7h5 | - | ready |
| F81b Chat Input | ch-3i0 | - | ready |
| F81 Planning Mode Controller | ch-o5z | ch-7h5,ch-3i0 | blocked |
| F82a Plan Agent Prompt Builder | ch-rmg | ch-j40 | blocked |
| F82b Conversation Manager | ch-0el | - | ready |
| F82 Plan Agent Controller | ch-z8g | ch-rmg,ch-0el | blocked |
| F83a Spec Chunker | ch-3xt | - | ready |
| F83b Task Generator | ch-8le | ch-3xt,ch-z8g | blocked |
| F83 Auto-Decomposition | ch-r1p | ch-3xt,ch-8le,ch-2hw | blocked |
| F84a Validation Rules Engine | ch-171 | - | ready |
| F84b Dependency Checker | ch-32r | - | ready |
| F84 Task Validator | ch-2hw | ch-171,ch-32r | blocked |
| F85a Review TUI | ch-5bd | ch-2hw | blocked |
| F85b Fix Applier | ch-6oy | ch-2hw | blocked |
| F85 Review Loop | ch-a0a | ch-5bd,ch-6oy,ch-2hw,ch-to7 | blocked |
| F86 Planning State Persistence | ch-to7 | - | ready |
| F89 App Router | ch-eq5 | ch-m9y,ch-o5z,ch-to7 | blocked |
| F90 CLI Parser | ch-nrr | - | ready |
| F91 Implementation Mode | ch-8er | ch-eq5,ch-a0a | blocked |

### M1: Infrastructure

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F01a Config Types | ch-2n6 | - | ready |
| F01b Config Load | ch-sro | ch-2n6 | blocked |
| F01c Config Save | ch-y43 | ch-sro | blocked |
| F02a State Types | ch-ah6 | - | ready |
| F02b State Init | ch-81x | ch-ah6 | blocked |
| F02c State Agent | ch-cg0 | ch-ah6, ch-81x | blocked |
| F02d State Persist | ch-r12 | ch-ah6, ch-81x | blocked |
| F02e State Merge Queue | ch-tpj | ch-ah6, ch-81x | blocked |
| F03a Init Prerequisites | ch-0z7 | - | ready |
| F03b Init Scaffold | ch-mdj | ch-0z7 | blocked |
| F04 Worktree Create | ch-glq | - | ready |
| F05 Worktree Remove | ch-112 | ch-glq | blocked |
| F06 Worktree Query | ch-iel | ch-112 | blocked |

### M2: Agent Preparation

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F07 Prompt Builder | ch-wk8 | ch-2n6 | blocked |
| F08 Signal Parser | ch-mpl | - | ready |
| F09 Agent-Task Linking | ch-3y0 | - | ready |

### M3: Task Management

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F10 Test Runner | ch-k3d | - | ready |
| F11 Completion Checker | ch-uoa | ch-mpl, ch-k3d | blocked |
| F12 Task Claimer | ch-zqi | - | ready |
| F13 Task Closer | ch-dzz | ch-zqi | blocked |

### M4: Core Orchestration

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F14 Dependency Resolver | ch-7ju | ch-zqi | blocked |
| F15 Orchestrator Core | ch-0e7 | ch-iel, ch-wk8, ch-3y0, ch-zqi | blocked |
| F16a Completion Handler Success | ch-7jw | ch-uoa, ch-dzz, ch-1gi, ch-a6h | blocked |
| F16b Completion Handler Retry | ch-lhm | ch-7jw | blocked |
| F17 Semi-Auto Mode | ch-7gx | ch-0e7, ch-lhm, ch-i9i | blocked |
| F18a useTaskSelection Hook | ch-9fq | ch-7gx | blocked |
| F18b TaskPanel Selection UI | ch-e7f | ch-9fq | blocked |
| F19 Orchestration Store | ch-8j3 | - | ready |
| F20 useOrchestration Hook | ch-g6z | ch-0e7, ch-lhm, ch-7gx, ch-8j3 | blocked |

### M5: Merge Service

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F24 Merge Queue | ch-glf | - | ready |
| F25 Merge Worker | ch-fe5 | ch-glf | blocked |
| F26 Conflict Classifier | ch-7pb | ch-fe5 | blocked |
| F27 Auto-Resolver | ch-t31 | ch-7pb | blocked |
| F28 Rebase-Retry | ch-xn6 | ch-7pb | blocked |
| F29 Resolver Agent | ch-9sj | ch-xn6 | blocked |
| F30 Human Escalation | ch-26c | ch-9sj | blocked |
| F31 Merge Service | ch-8ee | ch-112, ch-glf, ch-fe5, ch-7pb, ch-t31, ch-xn6, ch-9sj, ch-26c | blocked |

### M6: Parallelism

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F22 Slot Manager | ch-i9i | - | ready |

### M7: Autopilot

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F32a RalphLoop Control | ch-5tj | ch-0e7, ch-lhm, ch-i9i, ch-8ee | blocked |
| F32b RalphLoop Processing | ch-3pa | ch-5tj | blocked |

### M8: Memory System

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F39a Learning Types | ch-uxk | - | ready |
| F39b Scratchpad Manager | ch-1gi | ch-uxk | blocked |
| F40 Learning Extractor | ch-9yl | ch-uxk | blocked |
| F41 Learning Store | ch-a6h | ch-9yl | blocked |
| F42 Learning Injector | ch-eyd | ch-a6h | blocked |
| F42b Learnings Panel | ch-g2h | ch-a6h | blocked |
| F93 Learning Categorizer | ch-sm8 | ch-9yl | blocked |
| F94 Plan Review Trigger | ch-cjf | ch-sm8,ch-sro | blocked |
| F95 Plan Review Loop | ch-bmx | ch-cjf,ch-z8g | blocked |
| F96 Task Updater | ch-dka | ch-bmx | blocked |
| F97 Plan Review Integration | ch-c3q | ch-dka,ch-nn6 | blocked |
| F98 Incremental Planning Trigger | ch-yhq | ch-wqn,ch-2yp,ch-z8g | blocked |
| F99 Planning Horizon Manager | ch-wqn | ch-to7,ch-sro | blocked |
| F100 Spec Evolution Tracker | ch-2yp | ch-j40 | blocked |
| F100a Spec Section Collapser | ch-iru | ch-2yp | blocked |
| F100b Spec Archiver | ch-tr4 | ch-2yp | blocked |
| F101a TUI Learning Review Trigger | ch-s8u | ch-c3q | blocked |
| F101b TUI Planning Trigger | ch-fts | ch-yhq | blocked |

### M9: Human Intervention

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F43a Intervention Types | ch-ahq | - | ready |
| F43b Pause Handler | ch-fna | ch-0e7, ch-ahq | blocked |
| F44 Agent Stop | ch-cwy | ch-ahq, ch-i9i, ch-zqi | blocked |
| F45 Agent Redirect | ch-ddk | ch-0e7, ch-cwy, ch-zqi | blocked |
| F46 Task Block | ch-sb7 | ch-ahq, ch-cwy, ch-zqi | blocked |
| F46b Task Editor | ch-xe8 | ch-0e7, ch-cwy | blocked |
| F46c Intervention Panel | ch-di6 | ch-8j3, ch-ahq, ch-fna, ch-cwy, ch-ddk, ch-sb7, ch-xe8 | blocked |

### M10: Rollback & Recovery

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F47 Rollback Types | ch-2r5 | - | ready |
| F48 Checkpointer | ch-k9y | ch-2r5 | blocked |
| F49 Iteration Rollback | ch-c8j | ch-2r5 | blocked |
| F50 Task Rollback | ch-ofm | ch-2r5, ch-zqi | blocked |
| F51 Session Recovery | ch-jxp | ch-2r5, ch-81x, ch-112, ch-8ee | blocked |

### M11: Hooks

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F52 Hook Types | ch-b5x | - | ready |
| F53 Hook Registry | ch-n6d | ch-b5x | blocked |
| F54 Hook Runner | ch-nn6 | ch-n6d | blocked |

### M12: TUI Visualization

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F55a ModeIndicator | ch-mnd | - | ready |
| F55b AgentSlotsCounter | ch-3na | - | ready |
| F56a ProgressBar | ch-8vk | - | ready |
| F56b DurationDisplay | ch-aap | - | ready |
| F57a HeaderBar | ch-amw | ch-mnd, ch-3na | blocked |
| F57b FooterBar | ch-nvo | ch-8w5, ch-105 | blocked |
| F58a TaskSummaryStats | ch-8w5 | - | ready |
| F58b MergeQueueIndicator | ch-105 | - | ready |
| F59a EmptySlot | ch-if9 | - | ready |
| F59b AgentTileHeader | ch-j0z | - | ready |
| F59c AgentTileProgress | ch-7ki | ch-8vk, ch-aap | blocked |
| F59d AgentTileOutput | ch-49w | - | ready |
| F59e AgentTile | ch-c2p | ch-j0z, ch-7ki, ch-49w | blocked |
| F60a AgentGrid | ch-hhh | ch-c2p, ch-if9, ch-70p | blocked |
| F60b useAgentGrid | ch-70p | - | ready |
| F61a TwoColumnLayout | ch-73t | - | ready |
| F61b ShortcutCategory | ch-0ok | - | ready |
| F61c HelpPanel Enhanced | ch-2po | ch-0ok | blocked |
| F62a BlockedTaskInfo | ch-sl9 | - | ready |
| F62b TaskIterationDisplay | ch-gk7 | - | ready |
| F63j Task Failed Status | ch-dff | - | ready |
| F63k Agent Paused Status | ch-tdt | - | ready |
| F63l Priority Badge Colors | ch-96v | - | ready |
