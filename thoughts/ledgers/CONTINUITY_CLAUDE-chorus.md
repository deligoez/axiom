# Continuity Ledger: Chorus

**Session Date:** 2026-01-09
**Status:** Initial Setup Complete

---

## Goal

Create a reusable multi-agent development workflow system that can be applied to any project.

**Success Criteria:**
- [x] Generic WORKFLOW.md (no project-specific references)
- [x] AGENTS.md.template for projects to customize
- [x] VPS setup scripts
- [x] README with quick start guide
- [x] Memory system structure (.agent/)
- [ ] Test on a real project (Phony Cloud)
- [ ] Gather feedback and iterate

---

## Key Decisions

### 1. Project Name: Chorus
- **Reason:** "Many agents, one song" - fits the multi-agent coordination concept
- **Domain:** TBD (could be chorus.dev if available)

### 2. Distribution: Template Repo (not org)
- **Reason:** Simpler to start, can move to org later if needed
- **Pattern:** Users copy files to their project, not fork entire repo

### 3. Project Structure
```
chorus/
├── WORKFLOW.md           # Main documentation
├── AGENTS.md.template    # Template for projects
├── README.md             # Quick start
├── .gitignore            # Standard ignores
├── .agent/               # Memory system
│   └── learnings.md      # Shared knowledge
├── thoughts/ledgers/     # Continuity ledgers
├── vps-setup/            # VPS deployment
└── examples/             # Reference implementations
```

### 4. Memory System Design
- **scratchpad.md** - Per-session, per-agent (gitignored)
- **learnings.md** - Permanent, shared, append-only (tracked)
- **Continuity ledgers** - Human-AI handoffs (tracked)

---

## State

- Done:
  - [x] Initial repo structure
  - [x] WORKFLOW.md (generic, 1400+ lines)
  - [x] VPS setup scripts (bootstrap, test, docs)
  - [x] AGENTS.md.template
  - [x] README.md with quick start
  - [x] .gitignore
  - [x] .agent/learnings.md (empty template)

- Now: [→] Published to GitHub

- Next:
  - [ ] Apply to Phony Cloud project
  - [ ] Test full workflow
  - [ ] Add examples/ with reference configurations
  - [ ] Consider: CLI tool for setup (`npx create-chorus`?)

---

## Open Questions

- UNCONFIRMED: Is "Chorus" available as npm package name?
- UNCONFIRMED: Best distribution method (copy files vs npm init)
- UNCONFIRMED: Should include Claude Code hooks in template?

---

## Working Set

**Key Files:**
- `/Users/deligoez/Developer/github/chorus/WORKFLOW.md`
- `/Users/deligoez/Developer/github/chorus/AGENTS.md.template`
- `/Users/deligoez/Developer/github/chorus/README.md`
- `/Users/deligoez/Developer/github/chorus/vps-setup/`

**Remote:** git@github.com:deligoez/chorus.git

---

## Origin

This workflow was developed during the Phony Cloud planning sessions (Jan 2026).
The original AGENT_WORKFLOW.md was project-specific; Chorus is the generic extraction.

Source: `/Users/deligoez/Developer/github/phonyland/AGENT_WORKFLOW.md` (v2.3)
