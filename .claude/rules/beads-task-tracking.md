# Beads Task Tracking Rules

How to track Chorus Phase 4 features via Beads (`bd` CLI).

## Task Creation

```bash
# Create feature task with dependencies
bd create "F01: Config System" \
  -p 1 \
  -l feature,m1-infrastructure \
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

## Plan
See: thoughts/shared/plans/features/F01-config-system.md
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
| m1-infrastructure | Milestone 1 |
| m2-agent-prep | Milestone 2 |
| m3-task-mgmt | Milestone 3 |
| m4-orchestration | Milestone 4 |
| m5-merge | Milestone 5 |
| m6-parallelism | Milestone 6 |
| m7-autopilot | Milestone 7 |
| feature | Feature implementation |
| bug | Bug fix |
| critical-path | On critical path to autopilot |

## Dependencies

```bash
# Add dependency (F04 depends on nothing, F05 depends on F04)
bd create "F05: Worktree Cleanup" --deps ch-xxxx  # where xxxx is F04's ID

# Multiple dependencies
bd create "F15: Orchestrator" --deps ch-xxx,ch-yyy,ch-zzz
```

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
- F09 depends on F02b (needs agentStore with task linking)
- F10 depends on F01b (only needs to READ config, not save)

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
| F04 Worktree Create | ch-glq | - | ready |
| F05 Worktree Remove | ch-112 | ch-glq | blocked |
| F06 Worktree Query | ch-iel | ch-glq, ch-112 | blocked |

### M2: Agent Preparation

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F07 Prompt Builder | ch-wk8 | - | ready |
| F08 Signal Parser | ch-mpl | - | ready |
| F09 Agent-Task Linking | ch-3y0 | ch-81x | blocked |

### M3: Task Management

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F10 Test Runner | ch-k3d | ch-sro | blocked |
| F11 Completion Checker | ch-uoa | ch-mpl, ch-k3d | blocked |
| F12 Task Claimer | ch-zqi | - | ready |
| F13 Task Closer | ch-dzz | ch-zqi | blocked |

### M4: Core Orchestration

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F14 Dependency Resolver | ch-7ju | ch-zqi | blocked |
| F15 Orchestrator Core | ch-0e7 | ch-iel, ch-wk8, ch-3y0, ch-zqi | blocked |
| F16a Completion Handler Success | ch-7jw | ch-uoa, ch-dzz | blocked |
| F16b Completion Handler Retry | ch-lhm | ch-7jw | blocked |
| F17 Semi-Auto Mode | ch-7gx | ch-0e7, ch-lhm | blocked |
| F18a useTaskSelection Hook | ch-9fq | ch-7gx | blocked |
| F18b TaskPanel Selection UI | ch-e7f | ch-9fq | blocked |
| F19 Orchestration Store | ch-8j3 | - | ready |
| F20 useOrchestration Hook | ch-g6z | ch-0e7, ch-lhm, ch-7gx, ch-8j3 | blocked |
