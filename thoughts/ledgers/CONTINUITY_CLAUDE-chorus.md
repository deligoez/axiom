# Continuity Ledger: Chorus

**Date:** 2026-01-11
**Status:** Planning Complete, Ready for TDD Implementation

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**Architecture:** Planning-first (Ralph-inspired) → Implementation

---

## Current State

```
Done: [x] Master plan v3.1 complete (all reviews done)
      [x] 127 tasks in Beads (25 M0 + 102 existing)
      [x] All task dependencies verified
      [x] All acceptance criteria TDD-ready
Now:  [→] Begin TDD implementation
Next: Pick ready task, write tests, implement
```

**Ready Tasks:** 48 (use `bd ready -n 0 | grep -v deferred`)
**Master Plan:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v3.1)

---

## Suggested Starting Points

Foundation tasks with no dependencies:

| Task | Description | Tests |
|------|-------------|-------|
| **ch-73s** | F87: Session Logger | 10 |
| **ch-j40** | F88: PATTERNS.md Manager | 8 |
| **ch-06m** | F80a: Project Detector | 10 |
| **ch-171** | F84a: Validation Rules Engine | 15 |
| **ch-32r** | F84b: Dependency Checker | 12 |
| **ch-nrr** | F90: CLI Parser | 10 |
| **ch-2n6** | F01a: Config Types | 8 |

---

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 10 | MVP Scope | Claude-only (codex/opencode deferred) |
| 11 | Architecture | Planning-first (Ralph-inspired) |
| 12 | Config format | JSON (config) + Markdown (rules, patterns) |
| 13 | Quality gates | Flexible qualityCommands[] |
| 14 | Context strategy | MVP: Claude compact |

---

## .chorus Directory Structure

```
.chorus/
├── config.json              # qualityCommands[], taskIdPrefix
├── task-rules.md            # Validation rules (agent-readable)
├── PATTERNS.md              # Cross-agent patterns
├── planning-state.json      # Planning progress
├── session-log.jsonl        # Append-only event log
├── state.json               # Runtime state (gitignored)
└── prompts/
    └── plan-agent.md        # Plan agent system prompt
```

---

## Milestones

| # | Milestone | Tasks | Status |
|---|-----------|-------|--------|
| M0 | Planning Phase | 25 | Ready |
| M1 | Infrastructure | 13 | Partially ready |
| M2-M12 | Rest | 89 | Blocked on M0/M1 |

---

## Commands

```bash
bd ready -n 0 | grep -v deferred     # Ready tasks (48)
bd show <id>                          # Full task spec
bd update <id> --status=in_progress   # Start task
bd close <id>                         # Complete task
npm test                              # Run tests
```

---

## Audit History

- **v3.1:** Master plan comprehensive review (42 issues fixed)
- **v3.0:** M0 Planning Phase tasks created (25 tasks)
- **Prev:** 102 tasks audited, 4 deferred

---

## Key Files

- Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md`
- Task Rules: `.claude/rules/beads-task-tracking.md`
- This Ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-chorus.md`

---

## TDD Workflow Reminder

```
1. bd ready -n 0 | grep -v deferred   # Pick task
2. bd show <id>                        # Read acceptance criteria
3. Write failing tests first           # RED
4. Implement minimum code              # GREEN
5. Commit (auto-commit rule)           # No permission needed
6. bd close <id>                       # Complete
```
