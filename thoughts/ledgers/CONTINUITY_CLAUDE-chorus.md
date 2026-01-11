# Continuity Ledger: Chorus

**Date:** 2026-01-11
**Updated:** 2026-01-11T23:30:00Z
**Status:** Planning Complete, Ready for TDD Implementation

---

## Goal

Multi-agent TUI orchestrator using Ink (React for CLI).

**Architecture:** Planning-first (Ralph-inspired) → Implementation

---

## Current State

```
Done: [x] Master plan v3.7 complete (Consistency Review)
      [x] 140 tasks in Beads (26 M0 + 102 existing + 5 v3.5 + 7 v3.6)
      [x] All task dependencies verified
      [x] All acceptance criteria TDD-ready
      [x] v3.5: Learning-Triggered Plan Review (adaptive task refinement)
      [x] v3.6: Spec Lifecycle + Incremental Planning + TUI Triggers
      [x] v3.7: Consistency review (14 fixes, no feature conflicts)
Now:  [→] Begin TDD implementation
Next: Pick ready task, write tests, implement
```

**Ready Tasks:** 48 (use `bd ready -n 0 | grep -v deferred`)
**Master Plan:** `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v3.7)

---

## Recent Session (2026-01-11)

### Master Plan v3.7 - Comprehensive Consistency Review

Addresses all identified contradictions, gaps, and inconsistencies:

| Category | Fix |
|----------|-----|
| **Clarification** | PATTERNS.md injected for ALL agents (including Claude) |
| **Conflict Resolution** | Scope Guard exception for cross-cutting tasks |
| **Conflict Resolution** | Plan Review accesses collapsed sections via spec-progress.json |
| **Ordering** | Plan Review MUST complete before Task Creation (no race) |
| **Gap: Spec Creation** | Added import, interactive, template methods |
| **Gap: PATTERNS.md Flow** | Added update/review/approve flow with TUI dialog |
| **Gap: Learning Pipeline** | Added F40 → F41 → learnings.md diagram |
| **Gap: Hook Fields** | Added table showing which fields per event |
| **Gap: Session Events** | Added learning, plan_review, incremental_planning events |
| **Inconsistency** | Added P3 (+10) and P4 (+0) priority boost values |
| **Inconsistency** | TIMEOUT/FAILED mapped to Beads custom fields |
| **Inconsistency** | Config version 3.1 with versioning note |
| **Clarification** | Scratchpad template in .chorus/templates/, copied to worktree |
| **Clarification** | Archived spec learnings tied to task IDs (preserved forever) |

### Master Plan v3.6 - Incremental Planning & Manual Triggers

Addresses over-planning problem by creating tasks just-in-time:

| Component | Task ID | Description |
|-----------|---------|-------------|
| F98 | ch-yhq | Incremental Planning Trigger (monitors ready count) |
| F99 | ch-wqn | Planning Horizon Manager (tracks planning state) |
| F100 | ch-2yp | Spec Evolution Tracker (living spec documents) |
| F100a | ch-iru | Spec Section Collapser (collapse tasked sections) |
| F100b | ch-tr4 | Spec Archiver (archive completed specs) |
| F101a | ch-s8u | TUI Learning Review Trigger (Ctrl+L) |
| F101b | ch-fts | TUI Planning Trigger (P key) |

**Spec Lifecycle (Consumed Backlog Pattern):**
- Specs are consumed as tasks are created
- Tasked sections collapse with `<details>` tags
- Completed specs move to `.chorus/specs/archive/`
- Archived specs never in agent context

**Key insight:** Plan only what you know, implement what you planned, learn from implementation, plan more. Stops when:
- `unknownDependency`: Need to see implementation first
- `decisionPoint`: Choice depends on benchmarks/reality
- `taskCountReached`: Initial task limit hit

**Two mechanisms working together:**
1. **Learning-Triggered Plan Review** → Updates EXISTING tasks
2. **Implementation-Triggered Task Creation** → Creates NEW tasks

**TUI Manual Triggers:**
| Shortcut | Action | Condition |
|----------|--------|-----------|
| `P` | Plan more tasks | If spec has untasked sections |
| `Shift+P` | Force planning | Plan even if above threshold |
| `Ctrl+L` | Review learnings | If unreviewed learnings exist |
| `Shift+L` | Force review | Review even if no new learnings |

### Master Plan v3.5 - Learning-Triggered Plan Review

New feature added to address "waterfall problem" from Twitter discussion:

| Component | Task ID | Description |
|-----------|---------|-------------|
| F80d | ch-uwx | Plan Review Config Wizard (Init Step 5/5) |
| F93 | ch-sm8 | Learning Categorizer (LOCAL/CROSS_CUTTING/ARCHITECTURAL) |
| F94 | ch-cjf | Plan Review Trigger |
| F95 | ch-bmx | Plan Review Loop (iterates until no changes) |
| F96 | ch-dka | Task Updater (applies changes to Beads) |
| F97 | ch-c3q | Plan Review Integration (hooks into post-task-complete) |

**Key insight:** When agent discovers cross-cutting pattern, automatically review and update pending tasks. Stops early if no changes (converged).

### Master Plan v3.4 Review - 6 Fixes Applied

| Category | Fix |
|----------|-----|
| Diagram | TIMEOUT state added to Task States diagram (distinct from FAILED) |
| Config | Checkpoints section added to config.json example |
| Clarification | taskIdPrefix purpose clarified (display/filtering only) |
| Template | Quality commands numbered list format in agent prompt |
| Missing | Hook Registration section (auto-discovery + explicit config) |
| Template | Scratchpad template content in Agent Spawn Sequence |

### Master Plan v3.3 Review - 15 Fixes Applied

| Category | Fix |
|----------|-----|
| Contradiction | Worktree path format consistency (`{agent}` not `{agent-type}`) |
| Missing | Max iteration/timeout → TIMEOUT state (distinct from FAILED) |
| Missing | Merge queue dependency wait behavior documented |
| Clarification | Decision #1 vs #10 (config supports all, MVP implements Claude) |
| Missing | F03c (CLI Detection) description in deferred features |
| Missing | F91 Implementation Mode exit conditions table |
| Missing | qualityCommands.order execution explanation |
| Missing | Mode Selection UI screen |
| Missing | Session Logger event reference table (all modes) |
| Missing | P0 priority level (Blocker) |
| Clarification | NEEDS_HELP signal description |
| Clarification | Agent prompt template - quality commands explicit |
| Redundancy | TUI Layout section consolidated |
| Redundancy | Checkpointing config simplified |

**Previous (v3.2):** 12 fixes (contradictions, gaps, redundancies)

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
| 14 | Context strategy | MVP: Claude compact; Post-MVP: custom ledger |
| 15 | Planning strategy | Incremental (just-in-time) with manual triggers |
| 16 | Post-task ordering | Plan Review → Task Creation (no race condition) |

---

## .chorus Directory Structure

```
.chorus/
├── config.json              # qualityCommands[], taskIdPrefix, checkpoints, incrementalPlanning
├── task-rules.md            # Validation rules (agent-readable)
├── PATTERNS.md              # Cross-agent patterns (F07 injects for ALL agents)
├── planning-state.json      # Planning progress + chosenMode
├── session-log.jsonl        # Append-only event log (v3.7: new event types)
├── state.json               # Runtime state (gitignored)
├── templates/               # v3.7: Template files
│   └── scratchpad.md        # Copied to worktree on agent spawn
├── specs/                   # Living spec documents (v3.6)
│   ├── feature-spec.md      # Main spec/PRD (only 📋 DRAFT visible)
│   ├── spec-progress.json   # Tracks which sections have tasks
│   └── archive/             # Completed specs (never in context)
├── hooks/                   # Auto-discovered hooks (v3.4)
│   ├── pre-agent-start.sh
│   └── post-task-complete.sh
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

- **v3.7:** Comprehensive Consistency Review (14 fixes - contradictions, gaps, race conditions, clarifications)
- **v3.6:** Incremental Planning & Manual Triggers (7 new tasks - F98-F101b, spec lifecycle, just-in-time planning)
- **v3.5:** Learning-Triggered Plan Review (6 new tasks - F80d, F93-F97, anti-waterfall feature)
- **v3.4:** Diagram & config completeness (6 fixes - TIMEOUT state, checkpoints, hooks registration, templates)
- **v3.3:** Comprehensive audit (15 fixes - gaps, clarifications, consistency)
- **v3.2:** Consistency review (12 fixes - contradictions, gaps, redundancies)
- **v3.1:** Master plan comprehensive review (42 issues fixed)
- **v3.0:** M0 Planning Phase tasks created (25 tasks)
- **Prev:** 102 tasks audited, 4 deferred

---

## Key Files

- Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v3.7)
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
