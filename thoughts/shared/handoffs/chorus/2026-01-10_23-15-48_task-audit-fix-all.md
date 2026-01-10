---
date: 2026-01-10T23:15:48+03:00
session_name: chorus
researcher: Claude
git_commit: 7e09e2d
branch: master
repository: chorus
topic: "Comprehensive Task Audit - Fix All TDD Issues"
tags: [task-audit, tdd, beads, acceptance-criteria, dependencies]
status: in_progress
last_updated: 2026-01-10
last_updated_by: Claude
type: task_audit
---

# Handoff: Comprehensive Task Audit - Fix All 60 Tasks

## Task(s)

**Goal:** Review all 95 Beads tasks for TDD readiness and fix issues.

**Status:**
- [x] Review M1: Infrastructure (13 tasks) - COMPLETE
- [x] Review M2: Agent Prep (3 tasks) - COMPLETE
- [x] Review M3: Task Management (4 tasks) - COMPLETE
- [x] Review M4: Orchestration (9 tasks) - COMPLETE
- [x] Review M5: Merge Service (8 tasks) - COMPLETE
- [x] Review M6-M7: Parallelism + Autopilot (3 tasks) - COMPLETE
- [x] Review M8-M11: Memory/Intervention/Rollback/Hooks (23 tasks) - COMPLETE
- [x] Review M12: TUI (32 tasks) - COMPLETE
- [ ] Fix all issues - IN PROGRESS (0/60 fixed)

## Critical References

1. `thoughts/ledgers/CONTINUITY_CLAUDE-chorus.md` - Main continuity ledger
2. `thoughts/shared/plans/2026-01-09-chorus-workflow.md` - Master plan (v2.1)
3. `.claude/rules/beads-task-tracking.md` - Task tracking rules

## Recent Changes

- `7e09e2d` - docs: update master plan to v2.1 (ID format, StatusBar split)
- `7b58ba8` - feat: add deferred task support and status indicator tasks

## Learnings

### TDD Anti-Patterns Found Across Tasks
1. **Vague criteria**: "works correctly", "handles errors gracefully" - not testable
2. **Type compilation != behavior tests**: "AgentType compiles" should be "AgentType rejects invalid"
3. **Missing edge cases**: null, empty, error states not explicit
4. **Test count mismatch**: Claimed tests don't match actual criteria count

### Task Splitting Needed
Some tasks are too big (12+ tests) and should be split:
- ch-cwy (F44) → F44a Agent Stop + F44b Worktree Cleanup
- ch-jxp (F51) → F51a Recovery Detection + F51b Merge Queue Recovery

### Critical Design Decisions Needed
- ch-9sj (F29): Agent spawning untestable - needs HTTP API redesign
- ch-sb7 (F46): "blocked" as label vs status - needs decision
- ch-c8j (F49): "iteration" definition unclear

## Post-Mortem

### What Worked
- **Parallel agent exploration**: Using 3-4 Task agents simultaneously to review milestones
- **Structured report format**: Status/Issues/Suggested Fixes per task made findings actionable
- **Dependency chain verification**: Catching wrong/missing deps early

### What Failed
- **Underestimated scope**: 60 tasks need fixes, not 20-30 as initially thought
- **Context consumption**: Detailed agent reports consumed significant context

### Key Decisions
- **Decision**: Fix ALL issues before implementation (Option C)
  - Alternatives: Start implementing ready tasks, fix as we go
  - Reason: User wants 100% TDD-ready before coding

## Artifacts

All findings are in this handoff - no separate files created during audit.

## Action Items & Next Steps

### PHASE 1: Critical Fixes (16 tasks) - DO FIRST

#### Task Splits (Create New Tasks)
```bash
# F44 → F44a + F44b
bd create "F44b: Worktree Cleanup Helpers" -p 1 -l m9-intervention --deps ch-glq
# Update ch-cwy to be F44a only (4 tests)

# F51 → F51a + F51b
bd create "F51b: Merge Queue Recovery" -p 1 -l m10-rollback --deps ch-8ee
# Update ch-jxp to be F51a only (4 tests)

# F29 Redesign - change from subprocess to HTTP API
bd update ch-9sj --body "..." # New HTTP-based design
```

#### Critical Clarifications
| Task | Fix |
|------|-----|
| ch-0e7 (F15) | Add timeout setup/teardown specs |
| ch-7gx (F17) | Clarify: retry via event, not direct respawn |
| ch-sb7 (F46) | Define: "blocked" = label, not status |
| ch-c8j (F49) | Define: iteration = commits with `[ch-xxx]` marker |

### PHASE 2: M1 Infrastructure Fixes (11 tasks)

| Task | Issue | Fix |
|------|-------|-----|
| ch-2n6 | Vague type criteria | Add field-level tests, increase to 5 tests |
| ch-y43 | Missing validation edge cases | Add specific validation tests (7 tests) |
| ch-ah6 | Vague compilation criteria | Add field-level tests (6 tests) |
| ch-81x | Conflicting throw/return | Clarify: load() returns null, get() throws |
| ch-r12 | Low test count, no debounce spec | Add debounce test, increase to 6 tests |
| ch-tpj | Missing edge cases | Add empty queue case, increase to 8 tests |
| ch-0z7 | Incomplete version parsing | Add version storage test (11 tests) |
| ch-mdj | Vague detection, no error handling | Clarify detection rules (23 tests) |
| ch-glq | Template spec incomplete | Specify which files to copy (12 tests) |
| ch-112 | Edge cases missing | Add branch-not-exist case (9 tests) |
| ch-iel | Extremely vague | Rewrite with specific criteria (8 tests) |

### PHASE 3: M2-M4 Fixes (6 tasks)

| Task | Issue | Fix |
|------|-------|-----|
| ch-wk8 (F07) | Vague "complete prompt" | Add section-level tests (9 tests) |
| ch-3y0 (F09) | Criteria too vague | Add specific return value tests (7 tests) |
| ch-zqi (F12) | Filter precedence unclear | Clarify: exclude wins over include |
| ch-lhm (F16b) | Exit decision tree unclear | Add priority order documentation |

### PHASE 4: M5 Merge Service Fixes (5 tasks)

| Task | Issue | Fix |
|------|-------|-----|
| ch-fe5 (F25) | Git mocking unclear | Document git command mocking approach |
| ch-t31 (F27) | Special file strategies vague | Define merge strategies per file type |
| ch-xn6 (F28) | Conflict detection undefined | Document rebase conflict behavior |
| ch-9sj (F29) | **REDESIGN** | Change to HTTP API, not subprocess |
| ch-8ee (F31) | Mocking strategy unclear | Specify DI and mock setup |

### PHASE 5: M8-M11 Fixes (11 tasks)

| Task | Issue | Fix |
|------|-------|-----|
| ch-3pa (F32b) | Vague test criteria | Specify task ordering, events |
| ch-1gi (F39b) | Missing format spec | Add scratchpad path explicitly |
| ch-9yl (F40) | Format ambiguous | Document markdown parsing rules |
| ch-ddk (F45) | Missing deferred check | Add deferred label validation test |
| ch-xe8 (F46b) | `bd edit` scope unclear | Clarify if MVP or deferred |
| ch-di6 (F46c) | Keybinding flow incomplete | Document mode switching |
| ch-n6d (F53) | File discovery vague | Specify naming rules |
| ch-nn6 (F54) | Error handling unclear | Define hook failure behavior |

### PHASE 6: M12 TUI Fixes (26 tasks)

**Systematic fixes needed:**
1. Color specifications: Replace "green" with `chalk.green()` or Ink equivalent
2. Test count verification: Ensure criteria count = test count
3. State management: Document who owns focus/selection state
4. Keyboard tasks: Create useKeyboard hook prereq task

**Individual task fixes:**
- ch-amw, ch-nvo, ch-hhh, ch-70p: Fix test counts
- ch-mnd, ch-3na: Add error boundary tests
- ch-c2p: Add child prop verification tests
- All F63x keyboard tasks: Add handler specificity

## Other Notes

### Commands to Use

```bash
# View task details
bd show <id>

# Update task body
bd update <id> --body "$(cat <<'EOF'
## What
...

## Acceptance Criteria
...

## Tests
...
EOF
)"

# Create new task
bd create "Title" -p 1 -l label --deps dep1,dep2 --body "..."

# Add dependency
bd dep add <blocked> <blocker>
```

### Ready-to-Implement Tasks (35 tasks - no fixes needed)

These can be implemented immediately after critical fixes:
- M1: ch-sro, ch-cg0
- M2: ch-mpl
- M3: ch-k3d, ch-uoa, ch-dzz
- M4: ch-7ju, ch-7jw, ch-8j3, ch-9fq, ch-e7f, ch-g6z
- M5: ch-glf, ch-7pb, ch-26c
- M6-M7: ch-i9i, ch-5tj
- M8: ch-uxk, ch-a6h, ch-g2h
- M9: ch-ahq, ch-fna
- M10: ch-2r5, ch-k9y, ch-ofm
- M11: ch-b5x
- M12: ch-mnd, ch-3na, ch-8vk, ch-aap, ch-if9, ch-0ok

### Estimated Effort

- Phase 1 (Critical): 1-2 hours
- Phase 2-3 (M1-M4): 1-2 hours
- Phase 4-5 (M5-M11): 1-2 hours
- Phase 6 (M12): 1-2 hours
- **Total: 4-6 hours**
