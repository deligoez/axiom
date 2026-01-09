# Continuity Ledger: Chorus

**Session Date:** 2026-01-09
**Status:** Ink Rewrite - Phase 1

---

## Goal

Create a unified TUI for multi-agent development orchestration using Ink (React for CLI).

**Success Criteria:**
- [ ] `npx chorus` opens full TUI dashboard
- [ ] Real-time agent output streaming
- [ ] Multi-agent split pane view (3+ agents)
- [ ] Live Beads task visualization
- [ ] Keyboard-driven workflow
- [ ] < 500ms startup time
- [ ] Cross-platform (macOS, Linux, Windows)

---

## Key Decisions

### 1. Rewrite in Ink (not bash)
- **Reason:** Better TUI capabilities, native split panes, real-time updates
- **Archived:** `archive/chorus-bash-v0.1.0/` (53 passing Bats tests)

### 2. Tech Stack
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 20+ | LTS, widespread |
| Language | TypeScript | Type safety |
| TUI | Ink 5.x | React paradigm, mature |
| State | Zustand | Lightweight |
| Process | execa | Better child_process |
| Testing | Vitest | Fast, TS-native |

### 3. Beads Integration (not rewrite)
- Use existing Beads CLI/MCP
- Watch `.beads/issues.jsonl` for live updates
- Display tasks in Chorus TUI

### 4. TDD Approach
- Write tests first (Vitest)
- Atomic conventional commits
- No permission prompts for commits

---

## State

- Done:
  - [x] Bash CLI v0.1.0 (archived to `archive/chorus-bash-v0.1.0/`)
  - [x] Ink rewrite plan (`thoughts/shared/plans/2026-01-09-chorus-ink-rewrite.md`)

- Now: [→] Phase 1.1 - Project Setup
  - [ ] Remove old bash files + submodules
  - [ ] Initialize npm project with TypeScript
  - [ ] Setup Vitest
  - [ ] Install Ink + dependencies
  - [ ] Create basic CLI entry point

- Remaining:
  - [ ] Phase 1.2 - Basic TUI Shell
  - [ ] Phase 1.3 - Agent Process Management
  - [ ] Phase 2 - Multi-Agent
  - [ ] Phase 3 - Beads Integration
  - [ ] Phase 4 - Polish
  - [ ] Phase 5 - Advanced (Kanban, DAG)

---

## Open Questions

- RESOLVED: Use Ink for TUI (not bash + tmux)
- RESOLVED: Integrate Beads (not rewrite)
- UNCONFIRMED: npm package name "chorus" availability

---

## Working Set

**Plan:** `thoughts/shared/plans/2026-01-09-chorus-ink-rewrite.md`

**New Structure:**
```
src/
├── index.tsx          # Entry point
├── cli.ts             # CLI parsing
├── app.tsx            # Main component
├── components/        # UI components
├── hooks/             # React hooks
├── services/          # Business logic
└── types/             # TypeScript types
```

**Commands:**
```bash
npm test               # Run Vitest
npm run dev            # Dev mode
npm run build          # Build
npx chorus             # Run TUI
```

**Remote:** git@github.com:deligoez/chorus.git

---

## Origin

Bash CLI v0.1.0 completed 2026-01-09 with 53 tests.
Rewrite decision made after tmux integration proved too complex for good UX.
Ink chosen for native TUI capabilities and React paradigm.

Archived: `archive/chorus-bash-v0.1.0/`
