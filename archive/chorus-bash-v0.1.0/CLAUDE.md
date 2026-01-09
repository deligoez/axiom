# Chorus - Claude Code Instructions

**Project:** Multi-Agent Development Workflow System
**Status:** CLI v0.1.0 Implemented

## Quick Context

Chorus coordinates:
- Multiple AI coding agents (Claude Code, Codex CLI, OpenCode)
- Parallel work via git worktrees
- Task management with Beads
- Shared memory system (.agent/)

## CLI Commands

```bash
chorus init [--all]           # Initialize project
chorus loop "task"            # Ralph Wiggum autonomous loop
chorus squad --agents x,y     # Multi-agent orchestration
chorus status                 # Show current state
```

## Session Start Checklist

1. **Read the Continuity Ledger:**
   ```
   thoughts/ledgers/CONTINUITY_CLAUDE-chorus.md
   ```

2. **Check state:**
   - `[→]` marker shows current task
   - `UNCONFIRMED:` items need verification

3. **Review learnings:**
   ```
   .agent/learnings.md
   ```

## Completion Criteria (Ralph Wiggum Pattern)

Tasks should have **measurable success criteria**, not vague directions:

**Good:**
- "All tests pass (`make test` exits 0)"
- "Linter clean"
- "Function handles edge cases X, Y, Z"

**Bad:**
- "Make it work"
- "Improve performance"

## Key Files

| File | Purpose |
|------|---------|
| `bin/chorus` | CLI entry point |
| `lib/*.sh` | Command implementations |
| `templates/` | Init templates |
| `test/*.bats` | Bats tests (53 total) |
| `WORKFLOW.md` | Full documentation |
| `vps-setup/` | VPS deployment scripts |

## Development

```bash
# Run tests
make test

# Run specific test file
./test/bats/bin/bats test/init.bats

# Install locally
make install
```

## Current State

- [x] Generic workflow documentation
- [x] CLI: `chorus init` (20 tests)
- [x] CLI: `chorus loop` (19 tests)
- [x] CLI: `chorus squad` (14 tests)
- [x] Install scripts
- [ ] Test on real project (Phony Cloud)
- [ ] Gather feedback and iterate

## Remote

```
git@github.com:deligoez/chorus.git
```
