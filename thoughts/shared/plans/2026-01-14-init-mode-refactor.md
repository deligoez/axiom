# Init Mode Refactor Plan

**Date:** 2026-01-14
**Status:** DRAFT - Awaiting Review
**Related:** SA04 (Sage Integration with InitMode)

---

## Problem

Current InitMode:
- Ayrı component, ana layout'ta modal değil
- Sage entegrasyonu yok (SageAnalyzer var ama kullanılmıyor)
- Chat/konuşma UI'ı yok
- Wizard sadece form-based, agent personality yok
- `.chorus/` klasörü tam oluşturulmuyor (sadece config.json)
- `agents/` ve `rules/` klasörleri oluşturulmuyor
- Kullanıcıya "ne yapılacak" açıklanmıyor

## Target UX

```
┌──────────────────────────────────────────────────────────────────┐
│ CHORUS                                                   [?] Help │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   SAGE - Project Analyzer                 │    │
│  │                        (80% height)                       │    │
│  │                                                           │    │
│  │  🔮 Analyzing your project...                             │    │
│  │                                                           │    │
│  │  ✓ Detected: Node.js + TypeScript                        │    │
│  │  ✓ Found: Vitest with 47 test files in __tests__         │    │
│  │  ✓ Found: Biome for linting                              │    │
│  │  ✓ Found: package.json scripts                           │    │
│  │                                                           │    │
│  │  Based on my analysis, I recommend:                       │    │
│  │                                                           │    │
│  │  Quality Commands:                                        │    │
│  │    test: npm run test:run                                 │    │
│  │    lint: npm run lint                                     │    │
│  │    typecheck: npm run typecheck                           │    │
│  │                                                           │    │
│  │  Would you like to customize these, or proceed?           │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│ > [Enter to accept] or type your changes...                      │
└──────────────────────────────────────────────────────────────────┘
```

## Architecture

### Mode Routing (IMPORTANT)
```
App starts
    │
    ├─► .chorus/ EXISTS? ──► YES ──► Implementation Mode (no init)
    │
    └─► NO ──► Init Mode (modal in main layout)
                    │
                    └─► After complete ──► Implementation Mode
```

**Key:** Init flow is ONLY for first-time projects. Existing projects skip directly to Implementation.

### Modal in Main Layout (CONFIRMED)
- App.tsx renders main layout always (header, footer visible)
- Init mode shows as modal overlay (80% height)
- Same keyboard routing as other modals
- Chat input at bottom of modal
- Sage guides user through conversational flow

### Init Flow (UPDATED)

```
App starts (no .chorus/)
    │
    ▼
┌─────────────────────────────────────────┐
│  Full screen with Header + Footer       │
│  (Task panel & Agent grid EMPTY)        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     80% Modal (centered)        │    │
│  │                                 │    │
│  │  1. Welcome to Chorus           │    │
│  │     - Brief intro               │    │
│  │     - What we'll do             │    │
│  │     - [M] Meet the Team         │    │
│  │     - [Enter] Skip to Init      │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Step 1: Welcome Screen**
- Brief Chorus introduction
- "What we'll do" summary
- Option: Press M for "Meet the Team"
- Option: Press Enter to skip to Sage Init

**Step 2a: Meet the Team (optional)**
- Shows each persona with info (Sage, Chip, Archie, Patch, Scout, Echo)
- User navigates through personas
- At end: "Now let's start the initialization with Sage"
- Continues to Step 3

**Step 2b: Skip** (if user pressed Enter)
- Goes directly to Step 3

**Step 3: Sage Init Process**
- Sage analyzes project (package.json, test framework, etc.)
- Shows findings step by step
- User can chat with Sage to customize
- Conversational flow, not form-based

**Step 4: Complete**
- Create full `.chorus/` scaffolding (no confirmation needed)
- Transition to Implementation mode

### Scaffolding Structure (Full - All Files Created)

Init creates complete `.chorus/` directory. All files created even if empty.

**Source Documents:**
- Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md`
- Persona Plan: `thoughts/shared/plans/2026-01-13-agent-personas.md`

```
.chorus/
│
│ ══════════════════════════════════════════════════════════════════
│ ROOT FILES (Master Plan §Directory Structure)
│ ══════════════════════════════════════════════════════════════════
│
├── config.json              # [Master] Main config (Sage analysis result)
├── task-rules.md            # [Master §Configurable Rules] Task validation rules
├── PATTERNS.md              # [Master §Cross-Agent Patterns] Empty initially
├── planning-state.json      # [Master §Planning State Persistence] Initial state
├── pending-patterns.json    # [Master §Later Queue] Empty array: []
├── session-log.jsonl        # [Master §Session Logger] Empty file
├── tasks.jsonl              # [Master §Task Creation] Empty file (TaskStore)
│
│ ══════════════════════════════════════════════════════════════════
│ TEMPLATES (Master Plan §Scratchpad Template)
│ ══════════════════════════════════════════════════════════════════
│
├── templates/
│   └── scratchpad.md        # [Master] Template for .agent/scratchpad.md in worktrees
│
│ ══════════════════════════════════════════════════════════════════
│ SPECS (Master Plan §Spec Lifecycle)
│ ══════════════════════════════════════════════════════════════════
│
├── specs/
│   ├── spec-progress.json   # [Master §Spec Progress] Empty: {}
│   └── archive/             # [Master §Spec Archiving] Empty directory
│
│ ══════════════════════════════════════════════════════════════════
│ HOOKS (Master Plan §Hooks System)
│ ══════════════════════════════════════════════════════════════════
│
├── hooks/                   # [Master] Empty directory for user hooks
│
│ ══════════════════════════════════════════════════════════════════
│ SHARED RULES (Persona Plan §Shared Rules System)
│ ══════════════════════════════════════════════════════════════════
│
├── rules/                   # All agents inherit these
│   ├── signal-types.md      # [Persona §Signal Types] <chorus>TYPE:payload</chorus>
│   ├── learning-format.md   # [Persona §Learning Format] Scope prefixes
│   ├── commit-format.md     # [Persona §Commit Format] With task ID
│   └── completion-protocol.md # [Persona §Completion Protocol] Quality checks
│
│ ══════════════════════════════════════════════════════════════════
│ AGENTS (Persona Plan §Persona File Structure + §Agent Data Storage)
│ ══════════════════════════════════════════════════════════════════
│
└── agents/
    │
    │ ── AI-POWERED PERSONAS (Claude) ─────────────────────────────
    │
    ├── sage/                # [Persona] Project Analyzer
    │   ├── prompt.md        # [Persona §Prompt File Format] System prompt
    │   ├── rules.md         # [Persona §Rules File Format] Behavioral rules
    │   ├── skills/          # [Persona §Skills Directory] Empty initially
    │   ├── logs/            # [Persona §Execution Logs] Empty directory
    │   ├── learnings.md     # [Persona §Agent Learnings] Empty file
    │   └── metrics.json     # [Persona §Performance Metrics] Default: {}
    │
    ├── chip/                # [Persona] Worker (Task Executor)
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    │
    ├── archie/              # [Persona] Planner (Task Decomposition)
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    │
    ├── patch/               # [Persona] Resolver (Merge Conflicts)
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    │
    │ ── HEURISTIC PERSONAS (No LLM) ──────────────────────────────
    │
    ├── scout/               # [Persona] Task Selector
    │   ├── config.json      # [Persona] Heuristic weights (no prompt.md)
    │   ├── rules.md
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    │
    └── echo/                # [Persona] Learning Manager
        ├── config.json      # [Persona] Categorization config (no prompt.md)
        ├── rules.md
        ├── logs/
        ├── learnings.md
        └── metrics.json
```

### File Contents (Init Defaults)

| File | Initial Content |
|------|-----------------|
| `config.json` | Sage analysis result (mode, maxAgents, qualityCommands) |
| `task-rules.md` | Default task validation rules template |
| `PATTERNS.md` | Empty with header: `# Project Patterns` |
| `planning-state.json` | `{ "status": "init_complete" }` |
| `pending-patterns.json` | `[]` |
| `session-log.jsonl` | Empty file |
| `tasks.jsonl` | Empty file |
| `templates/scratchpad.md` | Master plan scratchpad template |
| `specs/spec-progress.json` | `{}` |
| `rules/*.md` | Default shared rules from persona plan |
| `agents/{name}/prompt.md` | Default persona prompt (AI agents only) |
| `agents/{name}/rules.md` | Default persona rules |
| `agents/{name}/config.json` | Default heuristic config (scout, echo only) |
| `agents/{name}/learnings.md` | `# {Name}'s Learnings` header only |
| `agents/{name}/metrics.json` | `{ "persona": "{name}", "tasks": { "completed": 0, "failed": 0 } }` |

### Notes

- **No `prompts/` folder** - Each agent has their own `prompt.md` in their directory
- **All files created** - Even empty files, so directory structure is complete
- **Shared learnings** → `.claude/rules/learnings.md` (Claude reads natively)
- **Per-agent learnings** → `.chorus/agents/{name}/learnings.md`

## Tasks

**Note:** Current `InitMode.tsx` will be completely replaced.

### Phase 1: Layout & Structure (P0)

#### T1: Init Modal Container
Create 80% height modal that renders inside main layout.

**Files:**
- `src/components/InitModal.tsx`
- `src/components/InitModal.test.tsx`

**Acceptance Criteria:**
- [ ] Modal takes 80% of screen height
- [ ] Centered in main layout
- [ ] Header/Footer visible around modal
- [ ] Accepts children for content
- [ ] 4 tests pass

---

#### T2: App Layout for Init Mode
Update App.tsx to render main layout with empty panels + InitModal.

**Files:**
- `src/App.tsx`
- `src/App.test.tsx`

**Acceptance Criteria:**
- [ ] Init mode renders HeaderBar + FooterBar
- [ ] Task panel and Agent grid are empty/hidden
- [ ] InitModal renders in center
- [ ] Proper keyboard routing
- [ ] 4 tests pass

---

### Phase 2: Welcome Flow (P0)

#### T3: Welcome Screen Component
First screen user sees - brief intro + options.

**Files:**
- `src/components/init/WelcomeScreen.tsx`
- `src/components/init/WelcomeScreen.test.tsx`

**Acceptance Criteria:**
- [ ] Shows "Welcome to Chorus" header
- [ ] Brief description of what Chorus does
- [ ] "What we'll do" summary (analyze, configure, setup)
- [ ] [M] key → Meet the Team
- [ ] [Enter] key → Skip to Sage Init
- [ ] 5 tests pass

---

#### T4: Meet the Team Flow
Show each persona with description (optional step).

**Files:**
- `src/components/init/MeetTheTeam.tsx`
- `src/components/init/MeetTheTeam.test.tsx`

**Acceptance Criteria:**
- [ ] Shows each persona: Sage, Chip, Archie, Patch, Scout, Echo
- [ ] Persona info: name, role, color, description
- [ ] Navigation between personas (arrow keys or Enter)
- [ ] At end: "Now let's start initialization with Sage"
- [ ] Continues to Sage Init step
- [ ] 5 tests pass

---

### Phase 3: Sage Init (P0)

#### T5: Sage Init Panel
Conversational UI for Sage analysis.

**Files:**
- `src/components/init/SageInitPanel.tsx`
- `src/components/init/SageInitPanel.test.tsx`

**Acceptance Criteria:**
- [ ] Shows Sage persona header (magenta, crystal-ball)
- [ ] Shows analysis progress step by step
- [ ] Shows detected: project type, test framework, tools
- [ ] Shows recommendations for quality commands
- [ ] User can respond/customize via chat input
- [ ] 6 tests pass

---

#### T6: Sage Analyzer Integration
Wire SageAnalyzer service to SageInitPanel.

**Files:**
- `src/components/init/SageInitPanel.tsx` (update)
- `src/services/SageAnalyzer.ts` (verify/update)

**Acceptance Criteria:**
- [ ] SageAnalyzer runs on panel mount
- [ ] Results stream to UI (not all at once)
- [ ] User responses update configuration
- [ ] Fallback if analysis fails
- [ ] 4 tests pass

---

#### T7: Init Chat Input
Text input for user to respond to Sage.

**Files:**
- `src/components/init/InitChatInput.tsx`
- `src/components/init/InitChatInput.test.tsx`

**Acceptance Criteria:**
- [ ] Text input at bottom of SageInitPanel
- [ ] Enter submits response
- [ ] Context-aware placeholder
- [ ] Handles empty input gracefully
- [ ] 4 tests pass

---

### Phase 4: Completion (P1)

#### T8: Chorus Scaffolder Service
Create full `.chorus/` directory at init completion (per master plan + persona plan).

**Files:**
- `src/services/ChorusScaffolder.ts`
- `src/services/ChorusScaffolder.test.ts`

**Acceptance Criteria:**

**Root Files (Master Plan):**
- [ ] `scaffold(config)` creates `.chorus/` directory
- [ ] Creates `config.json` with Sage analysis result
- [ ] Creates `task-rules.md` with default template
- [ ] Creates `PATTERNS.md` with header only
- [ ] Creates `planning-state.json` with initial state
- [ ] Creates `pending-patterns.json` as empty array
- [ ] Creates `session-log.jsonl` (empty)
- [ ] Creates `tasks.jsonl` (empty)

**Directories (Master Plan):**
- [ ] Creates `templates/scratchpad.md`
- [ ] Creates `specs/spec-progress.json` (empty object)
- [ ] Creates `specs/archive/` directory
- [ ] Creates `hooks/` directory

**Shared Rules (Persona Plan):**
- [ ] Creates `rules/signal-types.md` with signal protocol
- [ ] Creates `rules/learning-format.md` with scope prefixes
- [ ] Creates `rules/commit-format.md` with commit format
- [ ] Creates `rules/completion-protocol.md` with quality checks

**AI Personas - sage, chip, archie, patch (Persona Plan):**
- [ ] Creates `agents/{name}/prompt.md` with default persona prompt
- [ ] Creates `agents/{name}/rules.md` with default rules
- [ ] Creates `agents/{name}/skills/` directory
- [ ] Creates `agents/{name}/logs/` directory
- [ ] Creates `agents/{name}/learnings.md` with header
- [ ] Creates `agents/{name}/metrics.json` with default metrics

**Heuristic Personas - scout, echo (Persona Plan):**
- [ ] Creates `agents/{name}/config.json` with default config
- [ ] Creates `agents/{name}/rules.md` with default rules
- [ ] Creates `agents/{name}/logs/` directory
- [ ] Creates `agents/{name}/learnings.md` with header
- [ ] Creates `agents/{name}/metrics.json` with default metrics

**General:**
- [ ] Returns success/error status
- [ ] Handles existing directory gracefully (error or skip)
- [ ] **18 tests pass**

---

#### T9: Init Flow State Machine
XState machine to manage init flow steps.

**Files:**
- `src/machines/initFlow.machine.ts`
- `src/machines/initFlow.machine.test.ts`

**Acceptance Criteria:**
- [ ] States: welcome → meetTeam? → sageInit → complete
- [ ] Events: MEET_TEAM, SKIP_TO_INIT, NEXT_PERSONA, SAGE_COMPLETE
- [ ] Context holds collected config
- [ ] Triggers scaffolding on complete
- [ ] 5 tests pass

---

#### T10: Remove Old InitMode
Delete old InitMode and related components.

**Files:**
- `src/modes/InitMode.tsx` (DELETE)
- `src/modes/InitMode.test.tsx` (DELETE)
- `src/components/ConfigWizard.tsx` (DELETE if unused)
- `src/components/init/PlanReviewConfigStep.tsx` (DELETE if unused)

**Acceptance Criteria:**
- [ ] Old files removed
- [ ] No broken imports
- [ ] All tests pass
- [ ] 0 new tests (deletion task)

---

## Test Summary

| Task | Tests | Priority |
|------|-------|----------|
| T1: Init Modal Container | 4 | P0 |
| T2: App Layout for Init | 4 | P0 |
| T3: Welcome Screen | 5 | P0 |
| T4: Meet the Team | 5 | P0 |
| T5: Sage Init Panel | 6 | P0 |
| T6: Sage Analyzer Integration | 4 | P0 |
| T7: Init Chat Input | 4 | P0 |
| T8: Chorus Scaffolder | 18 | P1 |
| T9: Init Flow Machine | 5 | P1 |
| T10: Remove Old InitMode | 0 | P1 |
| **Total** | **55** | |

## Dependencies

```
T1 (Init Modal Container)
  └─► T2 (App Layout for Init)
        └─► T3 (Welcome Screen)
              ├─► T4 (Meet the Team)
              │     └─┐
              └─► T5 (Sage Init Panel) ◄─┘
                    ├─► T6 (Sage Analyzer Integration)
                    └─► T7 (Init Chat Input)
                          └─► T8 (Chorus Scaffolder)
                                └─► T9 (Init Flow Machine)
                                      └─► T10 (Remove Old InitMode)
```

## Resolved Questions

1. **Modal vs Separate:** ✅ Modal (80%) in main layout with Header/Footer visible

2. **Welcome Screen:** ✅ Yes - before Sage, with "Meet the Team" option

3. **Meet the Team:** ✅ Optional (press M), shows all 6 personas, then continues to Sage

4. **Chat depth:** User can chat with Sage to customize settings

5. **Scaffolding confirmation:** ✅ No confirmation needed - create at end automatically

6. **Old InitMode:** ✅ Completely replaced (deleted)
