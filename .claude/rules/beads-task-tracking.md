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
bd create "F05: Worktree Cleanup" --deps bd-xxxx  # where xxxx is F04's ID

# Multiple dependencies
bd create "F15: Orchestrator" --deps bd-xxx,bd-yyy,bd-zzz
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

## Current Task IDs

### M1: Infrastructure

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F01a Config Types | bd-2n6 | - | ready |
| F01b Config Load | bd-sro | bd-2n6 | blocked |
| F01c Config Save | bd-y43 | bd-sro | blocked |
| F02a State Types | bd-ah6 | - | ready |
| F02b State Init | bd-81x | bd-ah6 | blocked |
| F02c State Agent | bd-cg0 | bd-ah6, bd-81x | blocked |
| F02d State Persist | bd-r12 | bd-ah6, bd-81x | blocked |
| F04 Worktree Create | bd-glq | - | ready |
| F05 Worktree Remove | bd-112 | bd-glq | blocked |
| F06 Worktree Query | bd-iel | bd-112 | blocked |

### M2: Agent Preparation

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F07 Prompt Builder | bd-wk8 | - | ready |
| F08 Signal Parser | bd-mpl | - | ready |
| F09 Agent-Task Linking | bd-3y0 | - | ready |

### M3: Task Management

| Feature | ID | Dependencies | Status |
|---------|-----|--------------|--------|
| F10 Test Runner | bd-k3d | bd-y43 | blocked |
| F11 Completion Checker | bd-uoa | bd-mpl, bd-k3d | blocked |
| F12 Task Claimer | bd-zqi | - | ready |
| F13 Task Closer | bd-dzz | bd-zqi | blocked |
