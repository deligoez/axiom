# Chorus

Multi-agent TUI orchestrator using Ink (React for CLI) with XState v5 actor model.

## Session Startup

```bash
# See ready tasks (excluding deferred)
bd ready -n 0 | grep -v deferred

# Start working on a task
bd update <task-id> --status=in_progress

# View task details
bd show <task-id>
```

## Session End

```bash
# 1. Quality gates (if code changed)
npm run quality

# 2. Update task status
bd close <id>  # or update status

# 3. Push to remote
git pull --rebase && bd sync && git push
```

## Quality Pipeline

```bash
npm run quality   # Runs all checks:
# 1. npm run test:run   - Vitest
# 2. npm run typecheck  - TypeScript strict
# 3. npm run lint       - Biome
# 4. npm run knip       - Dead code detection
```

**TDD Pattern:** `RED → GREEN → npm run quality → COMMIT`

## Beads Commands

| Command | Purpose |
|---------|---------|
| `bd ready -n 0 \| grep -v deferred` | List available tasks |
| `bd update <id> --status=in_progress` | Start task |
| `bd close <id>` | Complete task (unblocks dependents) |
| `bd list -l <label> -n 0` | List by milestone |
| `bd blocked` | See blocked tasks |
| `bd show <id>` | Task details |

## Milestones

| Label | Milestone |
|-------|-----------|
| **m-1-xstate** | XState Foundation (BLOCKS ALL) |
| m0-planning | Planning Phase |
| m1-infrastructure | Config, State, Worktree |
| m2-agent-prep | Prompt, Signal, Linking |
| m3-task-mgmt | Test, Completion, Claim |
| m4-orchestration | Orchestrator, Semi-Auto |
| m5-merge | Merge Service |
| m6-parallelism | Slot Manager |
| m7-autopilot | Ralph Loop |
| m8-memory | Learning/Memory |
| m9-intervention | Human Intervention |
| m10-rollback | Rollback & Recovery |
| m11-hooks | Hooks System |
| m12-tui | TUI Visualization |

## Key Files

| File | Purpose |
|------|---------|
| `thoughts/shared/plans/2026-01-09-chorus-workflow.md` | Master Plan |
| `thoughts/shared/plans/2026-01-11-xstate-migration.md` | XState Migration Plan |
| `.claude/rules/beads-task-tracking.md` | Task tracking rules |
| `.claude/rules/auto-commit.md` | TDD commit rules |

## Architecture (XState v5)

```
┌─────────────────────────────────────────────────────────┐
│                   CHORUS ROOT MACHINE                    │
│                     type: 'parallel'                     │
├─────────────────────────────────────────────────────────┤
│  orchestration │ mergeQueue │ monitoring │    TUI       │
├─────────────────────────────────────────────────────────┤
│              SPAWNED CHILD ACTORS: AgentMachine × n     │
└─────────────────────────────────────────────────────────┘
```

## Key Decisions

1. **State Management:** XState v5 actor model
2. **Crash Recovery:** Snapshot + event sourcing fallback
3. **Agent Model:** Spawned child actors
4. **Test Pattern:** AAA (Arrange-Act-Assert) mandatory
5. **MVP Scope:** Claude-only
