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

Note: Keep labels minimal - just milestone. Avoid verbose labels like `feature`, `critical-path`.

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

1. **Pick task**: `bd ready` shows available tasks
2. **Start task**: `bd update <id> --status=in_progress`
3. **TDD**: Write tests → RED → Implement → GREEN → Commit
4. **Complete**: `bd close <id>`
5. **Dependencies auto-unblock**: Dependents become ready

## Progress Check

```bash
bd list                    # All tasks
bd ready                   # Ready to work
bd list --status=closed    # Completed
bd show <id>               # Task details
```

## Learnings Log

Update this section as you learn:

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
| F03b Init Scaffold | ch-mdj | ch-0z7, ch-y43 | blocked |
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
