# Beads Task Tracking Rules

How to track AXIOM features via Beads (`bd` CLI).

## Task Creation

```bash
bd create "F01: CaseStore" \
  -p 1 \
  -l m1-core \
  --body "$(cat <<'EOF'
## What
JSONL-based case storage

## Acceptance Criteria
- [ ] Can create case
- [ ] Can read case by ID
- [ ] Can update case
- [ ] Can list cases by type/status
- [ ] 8 tests pass

## Files
- internal/case/store.go
- internal/case/store_test.go
EOF
)"
```

## Naming Convention

| Prefix | Meaning |
|--------|---------|
| F## | Feature |
| BUG | Bug fix |
| CHORE | Non-feature work |

## Labels (Milestones)

| Label | Meaning |
|-------|---------|
| m1-core | Core: CaseStore, Config, Types |
| m2-workspace | Workspace: Git worktree management |
| m3-agent | Agent: Spawning, Signals, Prompts |
| m4-integration | Integration: Merge service |
| m5-execution | Execution: Loop, Slot manager |
| m6-ui | UI: Web interface (htmx) |
| m7-planning | Planning: 5-Phase Dialogue |
| m8-discovery | Discovery: Learning system |
| m9-review | Review: Human review, Debrief |
| m10-intervention | Intervention: Pause, Rollback |
| bug | Bug fix |

## Task Workflow

```bash
# 1. List available tasks
bd ready -n 0

# 2. Start working
bd update ax-xxx --status=in_progress

# 3. Work (TDD)
# Write test → RED → Implement → GREEN → Commit

# 4. Complete
bd close ax-xxx
```

## Deferred Tasks

```bash
# Mark as deferred (excluded from bd ready)
bd update ax-xxx --status=deferred

# Reactivate
bd update ax-xxx --status=open

# List deferred
bd list -s deferred -n 0
```

## Dependencies

```bash
# Create with dependency
bd create "F05: Workspace Cleanup" --deps ax-001

# Multiple dependencies
bd create "F15: Orchestrator" --deps ax-001,ax-002,ax-003

# Add dependency after creation
bd dep add ax-blocked ax-blocker
```

## TDD Requirements

Every task MUST be designed for Test-Driven Development:

### Required in Acceptance Criteria
1. **Explicit test count**: "X tests pass" (not "tests pass")
2. **Testable methods**: Each method listed with expected behavior
3. **Edge cases**: Error handling, nil returns explicitly stated

### Task Template
```markdown
## What
Brief description

## Acceptance Criteria
- [ ] `MethodName()` does X
- [ ] `MethodName()` returns Y when Z
- [ ] `MethodName()` returns error on invalid input
- [ ] N tests pass

## Files
- internal/package/file.go
- internal/package/file_test.go
```

## Progress Check

```bash
bd status              # Quick overview
bd ready -n 0          # Available tasks
bd list -s in_progress # In progress
bd blocked             # Blocked tasks
bd list -l m1-core     # Filter by milestone
```
