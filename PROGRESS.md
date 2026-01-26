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

### MVP-01: Walking Skeleton
- **Grey:** TBD
- **Goal:** See a web page with header/footer
- **Status:** NOT STARTED

---

## Backlog (Outcome-Focused)

**Approach:** Vertical slices, not horizontal layers. Each milestone = something visible in UI.

| Milestone | Goal (What we SEE) | Infra Needed |
|-----------|-------------------|--------------|
| MVP-01 | Web page with header/footer | Go web server, templates |
| MVP-02 | Hardcoded task list in UI | HTML template |
| MVP-03 | Real tasks from storage | Basic CaseStore |
| MVP-04 | Create task via UI | Form handling |
| MVP-05 | Task status changes | Status enum, update |
| MVP-06 | Planning view | Draft/Operation types |
| ... | ... | ... |

**Note:** This backlog will evolve. We discover what's next after each milestone.

---

## Infrastructure Reference

When we need infrastructure, reference these docs:
- `docs/04-cases.md` - Case types, CaseStore API
- `docs/01-configuration.md` - Config system
- `docs/05-agents.md` - Agent system
- `docs/06-integration.md` - Merge service
- `docs/07-execution.md` - Execution loop
- `docs/10-interface.md` - Web UI

---

## Session Continuity

After `/clear` or new session:
1. `cat PROGRESS.md` - Where are we?
2. `bd ready -n 0` - What's next?
3. Continue from Current Milestone
