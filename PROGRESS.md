# AXIOM Development Progress

## How to Use
- Check this file at session start
- Update after completing each milestone (Grey task)
- `bd ready -n 0` for immediate next task

---

## Completed Milestones

### m0-bootstrap: Project Setup ✓
- **Grey:** ax-od8 (PLAN: Project Bootstrap)
- **Blue:** ax-od8.1 (F00: Go Project Ready)
- **Status:** DONE
- **Commits:** 02a9554..274f958

---

## Current Milestone

### m1-core: Core Infrastructure
- **Grey:** TBD
- **Scope:** CaseStore, Config, Types
- **Status:** NOT STARTED
- **Docs:**
  - docs/04-cases.md (CaseStore, Types)
  - docs/01-configuration.md (Config)

---

## Backlog

| Milestone | Scope | Depends On |
|-----------|-------|------------|
| m2-workspace | Git worktree management | m1-core |
| m3-agent | Agent spawning, signals | m1-core, m2-workspace |
| m4-integration | Merge service | m2-workspace, m3-agent |
| m5-execution | Execution loop, slot manager | m1-core, m3-agent |
| m6-ui | Web interface (htmx) | m1-core, m5-execution |
| m7-planning | 5-Phase dialogue | m1-core, m3-agent |
| m8-discovery | Learning system | m1-core, m3-agent |
| m9-review | Human review, debrief | m6-ui, m5-execution |
| m10-intervention | Pause, rollback | m5-execution |

---

## Session Continuity

After `/clear` or new session:
1. `cat PROGRESS.md` - Where are we?
2. `bd ready -n 0` - What's next?
3. Continue from Current Milestone
