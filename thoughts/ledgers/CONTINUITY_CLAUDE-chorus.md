# Continuity Ledger: Chorus

**Session Date:** 2026-01-09
**Status:** CLI v0.1.0 Complete

---

## Goal

Create a reusable multi-agent development workflow system that can be applied to any project.

**Success Criteria:**
- [x] Generic WORKFLOW.md (no project-specific references)
- [x] AGENTS.md.template for projects to customize
- [x] VPS setup scripts
- [x] README with quick start guide
- [x] Memory system structure (.agent/)
- [x] CLI: `chorus init`
- [x] CLI: `chorus loop`
- [x] CLI: `chorus squad`
- [x] CLI: `chorus status`
- [x] 53 passing tests (Bats)
- [ ] Test on a real project (Phony Cloud)
- [ ] Gather feedback and iterate

---

## Key Decisions

### 1. Project Name: Chorus
- **Reason:** "Many agents, one song" - fits the multi-agent coordination concept

### 2. Distribution: CLI Tool (bash)
- **Reason:** Simple, no dependencies, works everywhere
- **Install:** `curl -fsSL .../install.sh | bash`

### 3. Testing: Bats-core
- **Reason:** Most popular bash testing framework, simple syntax
- **Helpers:** bats-assert, bats-file for assertions

### 4. Ralph Wiggum Pattern
- **Inspiration:** aihero.dev article
- **Implementation:** `chorus loop` with dry-run support
- **Key insight:** Define end state (completion criteria), not steps

### 5. Project Structure
```
chorus/
├── bin/chorus              # Main CLI entry point
├── lib/
│   ├── common.sh           # Shared functions
│   ├── init.sh             # chorus init
│   ├── loop.sh             # chorus loop
│   ├── squad.sh            # chorus squad
│   └── status.sh           # chorus status
├── templates/
│   ├── AGENTS.md.template
│   ├── hooks/
│   └── *.template
├── test/
│   ├── bats/ (submodule)
│   ├── test_helper/
│   └── *.bats
├── vps-setup/
│   └── bootstrap.sh
├── install.sh
└── Makefile
```

---

## State

- Done:
  - [x] Phase 1: Initial repo structure
  - [x] Phase 2: WORKFLOW.md documentation
  - [x] Phase 3: VPS setup scripts
  - [x] Phase 4: CLI implementation with TDD
    - [x] chorus init (20 tests)
    - [x] chorus loop (19 tests)
    - [x] chorus squad (14 tests)
  - [x] Phase 5: Install scripts

- Now: [→] Ready for testing on real project

- Next:
  - [ ] Apply to Phony Cloud project
  - [ ] Test full workflow
  - [ ] Add examples/ with reference configurations
  - [ ] Consider: npm package (`npx chorus`)

---

## Open Questions

- UNCONFIRMED: Is "chorus" available as npm package name?
- UNCONFIRMED: Best distribution method for non-technical users?
- RESOLVED: Use bash for CLI (simple, no deps)
- RESOLVED: Use Bats-core for testing

---

## Working Set

**Key Files:**
- `bin/chorus` - CLI entry point
- `lib/*.sh` - Command implementations
- `test/*.bats` - Test files
- `Makefile` - Build/test runner

**Commands:**
```bash
make test              # Run all tests
./bin/chorus --help    # Show CLI help
./bin/chorus init      # Initialize project
```

**Remote:** git@github.com:deligoez/chorus.git

---

## Origin

This workflow was developed during the Phony Cloud planning sessions (Jan 2026).
The original AGENT_WORKFLOW.md was project-specific; Chorus is the generic extraction.
CLI was implemented on 2026-01-09 with TDD approach using Bats-core.

Source: `/Users/deligoez/Developer/github/phonyland/AGENT_WORKFLOW.md` (v2.3)
