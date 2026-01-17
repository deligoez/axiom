# Chorus Planning Phase (M0)

**Module:** 03-planning-phase.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [02-operating-modes.md](./02-operating-modes.md), [04-task-management.md](./04-task-management.md)

---

## Overview

Planning-first architecture inspired by Ralph pattern. Before implementation begins, Chorus guides users through interactive planning.

```
chorus command
     │
     ▼
┌─────────────────┐
│ Check .chorus/  │
│ directory       │
└────────┬────────┘
         │
    ┌────┴────┐
    │ exists? │
    └────┬────┘
         │
    No   │   Yes
    ┌────┴────────────────┐
    ▼                     ▼
┌─────────┐        ┌─────────────┐
│  INIT   │        │ Check state │
│  MODE   │        └──────┬──────┘
└────┬────┘               │
     │              ┌─────┴─────┐
     ▼              │ has tasks?│
┌─────────────┐     └─────┬─────┘
│  PLANNING   │           │
│    MODE     │◀──No──────┤
└─────────────┘           │Yes
                          ▼
                   ┌─────────────────┐
                   │ IMPLEMENTATION  │
                   │      MODE       │
                   └─────────────────┘
```

---

## Planning Dialogue Model

Planning is not just task generation—it's a structured dialogue between the user and Planner Pat. The process follows 5 distinct phases, each with its own purpose and iteration pattern.

### Why Not Just "Ralph Loop" for Planning?

| Aspect | Implementation (Ralph fits) | Planning (Dialogue fits) |
|--------|----------------------------|--------------------------|
| **Nature** | Mechanical iteration | Conversational exchange |
| **Completion** | Objective (tests pass) | Subjective (user satisfied) |
| **Feedback** | Binary (pass/fail) | Nuanced (modify, clarify) |
| **Iteration** | Same action, retry | Different questions each time |
| **User role** | Observer | Active participant |

Ralph Loop is used **only in Phase 5 (VALIDATE)** where mechanical iteration makes sense.

### The 5 Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLANNING DIALOGUE MODEL                               │
│                                                                              │
│   Phase 1        Phase 2        Phase 3        Phase 4        Phase 5       │
│  UNDERSTAND  →   ANALYZE   →   PROPOSE   →  DECOMPOSE  →   VALIDATE        │
│  (Q&A)          (Explore)     (Approval)    (Generate)     (Ralph Loop)    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | Purpose | Interaction Style | When Complete |
|-------|---------|-------------------|---------------|
| **1. UNDERSTAND** | Clarify user's goal | Q&A dialogue | User answers or says "you decide" |
| **2. ANALYZE** | Explore codebase context | Pat works autonomously | Context gathered |
| **3. PROPOSE** | Present high-level approach | Approval loop | User approves architecture |
| **4. DECOMPOSE** | Generate atomic tasks | One-shot generation | Tasks created |
| **5. VALIDATE** | Check tasks against rules | Ralph Loop iteration | All tasks pass |

---

## Phase 1: UNDERSTAND

Planner Pat asks clarifying questions to fully understand the user's goal before generating anything.

### Why This Phase?

Without clarification:
- Pat might assume wrong tech choices
- Tasks could be too vague or misdirected
- User expectations won't be met

### Flow

```
                         USER INPUT
                    (goal / spec / idea)
                              │
                              ▼
                    ┌─────────────────┐
                    │  Pat analyzes   │
                    │  the request    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │     Ambiguities found?      │
              └──────────────┬──────────────┘
                        Yes  │  No
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐           ┌─────────────────┐
     │ Ask clarifying  │           │ Skip to Phase 2 │
     │ questions       │           │ (ANALYZE)       │
     └────────┬────────┘           └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │ User responds:  │
     │ • Answer        │
     │ • "You decide"  │
     │ • "Skip this"   │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ More questions? │
     └────────┬────────┘
         Yes  │  No
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
  (loop)         Phase 2
```

### Question Categories

| Category | Example Questions |
|----------|-------------------|
| **Tech choices** | "Which database: PostgreSQL, MySQL, or SQLite?" |
| **Scope** | "Should this include admin features or user-only?" |
| **Existing code** | "I see an auth module exists. Extend it or replace?" |
| **Constraints** | "Any performance requirements or scale expectations?" |
| **Dependencies** | "Should this integrate with the existing API or be standalone?" |

### User Response Options

| Response | Effect |
|----------|--------|
| Direct answer | Pat uses the answer for planning |
| "You decide" | Pat makes a reasonable choice and documents it |
| "Skip" | Pat proceeds without this information |
| Ask back | User can ask Pat for recommendations |

---

## Phase 2: ANALYZE

Pat explores the codebase to understand existing patterns, tech stack, and relevant context.

### Why This Phase?

Without analysis:
- Tasks might conflict with existing code
- Pat might reinvent existing utilities
- Naming conventions won't match

### Flow

```
                    ┌─────────────────┐
                    │  Phase 2 Start  │
                    │    ANALYZE      │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     Pat explores codebase:   │
              │                              │
              │  • File structure            │
              │  • Existing patterns         │
              │  • Tech stack detection      │
              │  • Similar past work         │
              │  • Test patterns             │
              │  • Naming conventions        │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   Build context summary:     │
              │                              │
              │  {                           │
              │    techStack: [...],         │
              │    existingPatterns: [...],  │
              │    relevantFiles: [...],     │
              │    conventions: {...}        │
              │  }                           │
              └──────────────┬───────────────┘
                             │
                             ▼
                       Phase 3
```

### Context Gathered

```typescript
interface CodebaseContext {
  techStack: string[];           // ["TypeScript", "React", "Vitest"]
  existingPatterns: {
    name: string;
    file: string;
    description: string;
  }[];
  relevantFiles: string[];       // Files that might be affected
  conventions: {
    naming: string;              // "camelCase functions, PascalCase components"
    testing: string;             // "AAA pattern, co-located test files"
    structure: string;           // "Feature-based folders"
  };
  similarWork: {
    taskId: string;
    title: string;
    relevance: string;
  }[];
}
```

### User Visibility

Pat shows analysis progress:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 PLANNING                                    Phase 2: ANALYZE   [?] Help  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ 📊 Planner Pat ────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │  Analyzing your codebase...                                          │   │
│  │                                                                       │   │
│  │  ✓ Detected: TypeScript + React + Vitest                            │   │
│  │  ✓ Found: Existing auth utilities in src/utils/auth.ts              │   │
│  │  ✓ Pattern: AAA test pattern used throughout                        │   │
│  │  ● Checking: Similar past implementations...                         │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Analyzing... (usually takes 10-30 seconds)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: PROPOSE

Pat proposes a high-level architecture before generating tasks. User must approve before proceeding.

### Why This Phase?

Without proposal:
- User might disagree with approach after tasks are generated
- Wasted effort regenerating entire task list
- No shared understanding of "what we're building"

### Flow

```
                    ┌─────────────────┐
                    │  Phase 3 Start  │
                    │    PROPOSE      │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   Pat creates proposal:      │
              │                              │
              │  • High-level components     │
              │  • Data flow diagram         │
              │  • Key decisions             │
              │  • Trade-offs considered     │
              │  • Estimated task count      │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   Present to user            │
              └──────────────┬───────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
        User approves              User has feedback
              │                             │
              │                             ▼
              │                  ┌─────────────────┐
              │                  │ Pat revises     │
              │                  │ proposal        │
              │                  └────────┬────────┘
              │                           │
              │                           │
              ◀───────────────────────────┘
              │
              ▼
         Phase 4
```

### Proposal Structure

```markdown
## Architecture Proposal

### Components
1. **User Model** - Database schema with password hashing
2. **JWT Service** - Token generation and validation
3. **Auth Endpoints** - Login, register, refresh, logout
4. **Middleware** - Route protection

### Data Flow
```
User → Login Endpoint → Validate → JWT Service → Response
                                       ↓
                              Refresh Token (httpOnly cookie)
```

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | httpOnly cookie | XSS protection |
| Password hash | bcrypt | Industry standard |
| Token expiry | 15min access, 7d refresh | Balance security/UX |

### Trade-offs
- ✓ Secure defaults (short-lived tokens)
- ✗ More complexity (refresh flow needed)

### Estimated Scope
- ~8 tasks
- ~45 tests
- ~2-3 hours implementation
```

### User Actions

| Action | Effect |
|--------|--------|
| **Approve** | Proceed to DECOMPOSE |
| **Modify** | Pat adjusts specific parts |
| **Reject** | Pat creates new proposal with feedback |
| **Ask question** | Pat explains reasoning |

---

## Phase 4: DECOMPOSE

Pat generates atomic tasks from the approved architecture. This is one-shot generation (not iterative).

### Why This Phase?

With approved architecture:
- Tasks are aligned with agreed design
- Dependencies are clearer
- Less chance of scope creep

### Flow

```
                    ┌─────────────────┐
                    │  Phase 4 Start  │
                    │   DECOMPOSE     │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   From approved proposal:    │
              │                              │
              │   Component 1 → Tasks 1-2    │
              │   Component 2 → Tasks 3-4    │
              │   Component 3 → Tasks 5-6    │
              │   Integration → Tasks 7-8    │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   For each task:             │
              │                              │
              │   • ID and title             │
              │   • Description              │
              │   • Acceptance criteria      │
              │   • Dependencies             │
              │   • Estimated tests          │
              │   • Affected files           │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │   Build dependency graph     │
              └──────────────┬───────────────┘
                             │
                             ▼
                       Phase 5
```

### Task Generation Rules

| Rule | Description |
|------|-------------|
| **Atomic** | One responsibility per task |
| **Testable** | All criteria verifiable |
| **Context-fit** | Fits in agent context window |
| **Clear dependencies** | Explicit blocker relationships |
| **Consistent naming** | F##: Title pattern |

---

## Phase 5: VALIDATE (Ralph Loop)

The ONLY phase where Ralph Loop pattern applies. Mechanical iteration until all tasks pass validation.

### Why Ralph Here?

| Aspect | Why Ralph Works |
|--------|-----------------|
| **Objective criteria** | Rules are binary (pass/fail) |
| **Auto-fixable issues** | Many issues can be fixed automatically |
| **Finite iterations** | Guaranteed to converge |
| **No user judgment** | Rules, not opinions |

### Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VALIDATION RALPH LOOP                                 │
│                        (Phase 5 only)                                        │
└─────────────────────────────────────────────────────────────────────────────┘

              ┌──────────────────────────────┐
              │     VALIDATION LOOP           │
              │                               │
              │    ┌─────────────────┐        │
              │    │ Validate Tasks  │◀───────┼─────────┐
              │    │ Against Rules   │        │         │
              │    └────────┬────────┘        │         │
              │             │                 │         │
              │    ┌────────┴────────┐        │         │
              │    │   Issues?       │        │         │
              │    └────────┬────────┘        │         │
              │        Yes  │  No             │         │
              │             │                 │         │
              │    ┌────────┴────────┐        │    iteration++
              │    │                 │        │         │
              │    ▼                 ▼        │         │
              │  ISSUES           ALL PASS    │         │
              │    │                 │        │         │
              │    ▼                 │        │         │
              │ ┌──────────────┐     │        │         │
              │ │ Auto-fixable?│     │        │         │
              │ └──────┬───────┘     │        │         │
              │    Yes │  No         │        │         │
              │        │   │         │        │         │
              │        ▼   ▼         │        │         │
              │ ┌─────────┐ ┌──────┐ │        │         │
              │ │Auto-fix │ │Manual│ │        │         │
              │ │& Retry  │ │Review│ │        │         │
              │ └────┬────┘ └──┬───┘ │        │         │
              │      │         │     │        │         │
              │      └────┬────┘     │        │         │
              │           │          │        │         │
              │    ┌──────┴──────┐   │        │         │
              │    │ iteration   │   │        │         │
              │    │ < max?      │   │        │         │
              │    └──────┬──────┘   │        │         │
              │       Yes │  No      │        │         │
              │           │   │      │        │         │
              │           └───┼──────┼────────┘         │
              │               │      │                  │
              └───────────────┼──────┼──────────────────┘
                              │      │
                              ▼      ▼
                        ┌──────┐ ┌─────────┐
                        │READY │ │ STUCK   │
                        │      │ │ Alert   │
                        └──┬───┘ └─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Mode Select │
                    │ Semi/Auto   │
                    └─────────────┘
```

### Validation Issue Types

| Type | Auto-fixable? | Action |
|------|---------------|--------|
| **Too many criteria** | ✓ | Split task into subtasks |
| **Circular dependency** | ✓ | Remove weakest link |
| **Missing dependency** | ✓ | Add inferred dependency |
| **Vague criteria** | ✗ | Prompt user for clarification |
| **Context too large** | ✓ | Split task |
| **Duplicate task** | ✓ | Merge or remove |
| **Invalid format** | ✓ | Reformat |

### Convergence Criteria

The validation loop converges when:

1. **All Pass:** Zero validation issues remain
2. **Max Iterations:** Reached `planReview.maxIterations` (default: 5)
3. **User Override:** User explicitly approves despite issues
4. **Only Manual Issues:** All remaining issues require user decision

---

## Conversation State Tracking

The entire planning dialogue is tracked in `.chorus/planning-state.json`:

```typescript
interface PlanningConversation {
  phase: 'understand' | 'analyze' | 'propose' | 'decompose' | 'validate' | 'ready';

  // Phase 1: UNDERSTAND
  clarifications: {
    question: string;
    answer: string | 'decide_for_me' | 'skip';
    patDecision?: string;  // If user said "decide for me"
  }[];

  // Phase 2: ANALYZE
  codebaseContext: {
    techStack: string[];
    existingPatterns: { name: string; file: string; description: string }[];
    relevantFiles: string[];
    conventions: { naming: string; testing: string; structure: string };
  };

  // Phase 3: PROPOSE
  proposals: {
    version: number;
    content: string;  // Markdown architecture proposal
    userFeedback?: string;
    status: 'pending' | 'approved' | 'modified' | 'rejected';
  }[];
  approvedProposal?: number;  // Version number of approved proposal

  // Phase 4: DECOMPOSE
  tasks: Task[];

  // Phase 5: VALIDATE (Ralph Loop)
  validationIterations: {
    iteration: number;
    issues: ValidationIssue[];
    autoFixed: number;
    manualFixed: number;
  }[];
  currentIssues: ValidationIssue[];

  // Metadata
  startedAt: number;
  completedAt?: number;
  chosenMode?: 'semi-auto' | 'autopilot';
}
```

### Phase Transition Rules

| From | To | Trigger |
|------|-----|---------|
| - | UNDERSTAND | User enters planning mode |
| UNDERSTAND | ANALYZE | All questions answered or skipped |
| ANALYZE | PROPOSE | Context gathered |
| PROPOSE | DECOMPOSE | User approves proposal |
| PROPOSE | PROPOSE | User requests modification |
| DECOMPOSE | VALIDATE | Tasks generated |
| VALIDATE | VALIDATE | Issues found, iteration < max |
| VALIDATE | READY | All tasks pass |
| VALIDATE | STUCK | Max iterations reached |
| Any | UNDERSTAND | User says "start over" |

### Re-entry Points

User can go back to earlier phases:

| Command | Effect |
|---------|--------|
| "Start over" | Return to UNDERSTAND |
| "Change approach" | Return to PROPOSE |
| "Add more tasks" | Return to DECOMPOSE |
| "Re-validate" | Restart VALIDATE |

---

## Plan Review After Learning

When an ARCHITECTURAL or CROSS-CUTTING learning is discovered during implementation:

```
Learning Discovered
       │
       ├── [LOCAL] → No action
       │
       ├── [CROSS-CUTTING] → Trigger Plan Review
       │         │
       │         ▼
       │   ┌───────────────────┐
       │   │ Review all tasks  │
       │   │ for impact        │
       │   └────────┬──────────┘
       │            │
       │            ▼
       │   ┌───────────────────┐
       │   │ Update affected   │
       │   │ task descriptions │
       │   └───────────────────┘
       │
       └── [ARCHITECTURAL] → Alert + Plan Review
                 │
                 ▼
           ┌───────────────────┐
           │ Pause & Alert     │
           │ Human review      │
           └───────────────────┘
```

---

## Incremental Planning (F98, F99, F100)

Rather than planning all tasks upfront, Chorus supports **incremental planning** - creating tasks just-in-time as the implementation progresses.

### Why Incremental Planning?

| Benefit | Description |
|---------|-------------|
| **Reduced waste** | Don't plan tasks for features that may change |
| **Better accuracy** | Plan with knowledge gained from implementation |
| **Natural flow** | Implementation informs the next planning cycle |
| **Manageable scope** | Avoid overwhelming task lists |

### Planning Triggers (F98)

Planning is triggered when:

```
┌───────────────────────────────────────────────────────────────────┐
│                    PLANNING TRIGGER CONDITIONS                      │
└───────────────────────────────────────────────────────────────────┘

                Ready Task Count
                      │
         ┌────────────┴────────────┐
         │ readyCount < threshold? │
         └────────────┬────────────┘
                  Yes │  No
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
   ┌──────────────┐         ┌──────────────┐
   │ TRIGGER      │         │ SKIP         │
   │ Pat creates  │         │ Enough work  │
   │ more tasks   │         │ available    │
   └──────────────┘         └──────────────┘
```

**Default threshold:** 3 ready tasks (configurable)

### Planning Horizon (F99)

Pat plans up to the next **horizon** - a logical stopping point:

| Stop Condition | Example |
|----------------|---------|
| **Milestone boundary** | Complete all M1 tasks before planning M2 |
| **Feature boundary** | Finish "auth" before planning "notifications" |
| **Uncertainty point** | Stop at tasks requiring user decisions |
| **Max batch size** | Default 10 tasks per planning cycle |

### Manual Planning Triggers

| Key | Action | Description |
|-----|--------|-------------|
| `P` | Plan | Trigger incremental planning (only if ready < threshold) |
| `Shift+P` | Force Plan | Force planning even if enough ready tasks exist |

### Configuration

```json
{
  "planning": {
    "incrementalEnabled": true,
    "readyThreshold": 3,
    "maxBatchSize": 10,
    "horizonBoundary": "milestone"
  }
}
```

---

## Spec Lifecycle (F100, F100a, F100b)

Specs are treated as **consumable resources**. As implementation progresses, spec sections are consumed into tasks. Chorus tracks spec sections and manages their lifecycle.

### Spec States

```
┌───────────────────────────────────────────────────────────────────┐
│                     SPEC SECTION LIFECYCLE                          │
│                   (Consumable Resource Model)                        │
└───────────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │    draft     │  ← Being discussed with Pat, not finalized
   └──────┬───────┘
          │ User approves or defers
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌──────────┐  ┌──────────┐
│ deferred │  │ partial  │  ← Clarified but postponed / Some tasks created
└──────────┘  └────┬─────┘
    │              │ More tasks created
    │ User         │
    │ reactivates  ▼
    │         ┌──────────┐
    └────────▶│ consumed │  ← All tasks created from this section
              └────┬─────┘
                   │ All tasks complete (or section no longer needed)
                   ▼
              ┌──────────┐
              │ archived │  ← Moved to specs/archive/
              └──────────┘
```

### State Descriptions

| State | Description | Visibility to Agents |
|-------|-------------|---------------------|
| **draft** | Being discussed with Pat, requirements not yet finalized | Full content visible |
| **deferred** | Requirements clarified but postponed (not for current sprint) | Hidden from agents |
| **partial** | Some tasks created, more content remains to be consumed | Remaining content visible |
| **consumed** | All content converted to tasks (section "used up") | Collapsed reference only |
| **archived** | Section complete or obsolete, moved to archive | Not in context |

### Spec Progress Tracking (F100)

Progress tracked in `.chorus/specs/progress.json`:

```json
{
  "specs": {
    "auth-system.md": {
      "sections": [
        {
          "heading": "## User Model",
          "state": "consumed",
          "tasks": ["ch-001", "ch-002"],
          "consumedAt": "2026-01-13T10:00:00Z"
        },
        {
          "heading": "## JWT Service",
          "state": "partial",
          "tasks": ["ch-003", "ch-004"],
          "consumedAt": null
        },
        {
          "heading": "## OAuth Integration",
          "state": "deferred",
          "tasks": [],
          "consumedAt": null,
          "deferredReason": "Not needed for MVP"
        },
        {
          "heading": "## Rate Limiting",
          "state": "draft",
          "tasks": [],
          "consumedAt": null
        }
      ]
    }
  }
}
```

### Section Collapsing (F100a)

When a spec section becomes `consumed`, it is **collapsed** in the agent context:

```markdown
<!-- BEFORE: Full section visible to agents (draft or partial state) -->
## User Model

The user model should include:
- id: UUID
- email: string, unique
- passwordHash: string
- createdAt: timestamp
- updatedAt: timestamp

Validation rules:
- Email must be valid format
- Password minimum 8 characters
...

<!-- AFTER: Collapsed (consumed state - agents see reference only) -->
## User Model
> 📋 **CONSUMED**: See tasks ch-001, ch-002 for implementation details.
```

**Benefits:**
- Reduces context window usage
- Prevents agents from re-reading fully-tasked sections
- Tasks contain all needed info
- Partial sections still show remaining uncovered content

### Spec Archiving (F100b)

When all sections in a spec are `consumed` (and their tasks complete), the spec can be archived:

```
.chorus/specs/
├── auth-system.md          → Active (has draft/partial/consumed sections)
├── progress.json           → Tracks all specs
└── archive/
    └── auth-system.md      → Archived (fully consumed and tasks done)
```

**Archive triggers:**
- All sections consumed + all tasks complete + manual `a` key on spec
- All sections consumed + all tasks complete + auto-archive enabled
- Section no longer relevant (manual archive)

**Archived specs:**
- Removed from agent context injection
- Available for reference (human can read)
- Searchable for learnings extraction

### Events

| Event | Data | When |
|-------|------|------|
| `spec_created` | `{file, method}` | New spec imported/created |
| `spec_section_tasked` | `{file, section, tasks}` | Tasks created from section |
| `spec_archived` | `{file, reason}` | Spec moved to archive |

---

# UI Design: Planning Phase

This section defines all UI screens for the Planning Phase (Init → Planning → Review → Mode Selection).

## UI Design Standards

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WIDTH: 85 characters (fits 90+ terminals)                                       │
│  PANELS: Left (30%) + Right (70%) for detail views                              │
│  HEADER: 1 line, shows mode + context + timer                                    │
│  FOOTER: 1 line, shows shortcuts + stats                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Init Mode UI

### Screen 1/5: Prerequisites Check

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 1/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🔍 Checking prerequisites...                                                    │
│                                                                                  │
│  ✓ Git repository initialized                                                   │
│  ✓ Node.js v22.0.0 (>= 20 required)                                             │
│  ✓ Claude Code CLI v1.0.0                                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ All prerequisites met! Ready to configure your project.                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > Press Enter to continue, or type a question...                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Continue   [q] Quit   [?] Help                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Prerequisites Failed State:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 1/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🔍 Checking prerequisites...                                                    │
│                                                                                  │
│  ✓ Git repository initialized                                                   │
│  ✗ Node.js not found (>= 20 required)                                           │
│  ✓ Claude Code CLI v1.0.0                                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ ⚠ Missing prerequisites! Please install:                                │    │
│  │                                                                          │    │
│  │   brew install node@22                                                   │    │
│  │   # or: nvm install 22                                                   │    │
│  │                                                                          │    │
│  │ Then run `chorus init` again.                                            │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [q] Quit                                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 2/5: Project Detection

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 2/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🔍 Analyzing project structure...                                               │
│                                                                                  │
│  Detected files:                                                                 │
│  ├── package.json      → Node.js project                                        │
│  ├── tsconfig.json     → TypeScript enabled                                     │
│  ├── vitest.config.ts  → Vitest test framework                                  │
│  └── biome.json        → Biome linter                                           │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ Project Configuration                                                    │    │
│  │ ───────────────────────────────────────────────────────────────────────│    │
│  │ Name:          chorus                    (from package.json)            │    │
│  │ Type:          node-typescript                                           │    │
│  │ Task prefix:   ch-                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > Edit values or press Enter to confirm...                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Confirm   [Tab] Edit field   [q] Quit                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 3/5: Quality Commands

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 3/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ⚙️ Quality Commands                                                             │
│  These commands run before marking any task as complete.                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ #   Required   Name        Command                                       │    │
│  │ ─────────────────────────────────────────────────────────────────────── │    │
│  │ 1   [*]        test        npm run test:run                              │    │
│  │ 2   [*]        typecheck   npm run typecheck                             │    │
│  │ 3   [ ]        lint        npm run lint                                  │    │
│  │ 4   [ ]        knip        npm run knip                                  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  [*] = required (must pass)   [ ] = optional (warning only)                     │
│                                                                                  │
│  Commands:                                                                       │
│  • add <name> <command>     Add new command                                     │
│  • remove <#>               Remove command                                      │
│  • toggle <#>               Toggle required/optional                            │
│  • reorder <#> <#>          Change execution order                              │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > add build npm run build                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Done   [↑↓] Navigate   [q] Quit                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 4/5: Task Validation Rules

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 4/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📋 Task Validation Rules                                                        │
│                                                                                  │
│  ═══ Built-in Rules (Always Enforced) ═══                                       │
│  ✓ Tasks must be atomic (single responsibility)                                 │
│  ✓ All acceptance criteria must be testable                                     │
│  ✓ No circular dependencies allowed                                             │
│  ✓ Each task must fit within agent context window                               │
│                                                                                  │
│  ═══ Configurable Limits ═══                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ Max acceptance criteria per task:    [10]                                │    │
│  │ Max description length (chars):      [500]                               │    │
│  │ Max dependencies per task:           [5]                                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ═══ Optional Rules ═══                                                         │
│  [ ] Require test file reference                                                │
│  [x] Enforce naming pattern: F##: Title                                         │
│  [ ] Forbid vague words: simple, easy, just                                     │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > Type field name to edit, or press Enter to continue...                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Continue   [Tab] Next field   [q] Quit                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen 5/5: Setup Complete

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS INIT                                                        Step 5/5 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ✓ Setup Complete!                                                              │
│                                                                                  │
│  Created:                                                                        │
│  ├── .chorus/config.json           Configuration                                │
│  ├── .chorus/task-rules.md         Validation rules                             │
│  ├── .chorus/rules/                Shared agent rules                           │
│  └── .chorus/agents/               Agent personas (9 agents)                    │
│                                                                                  │
│  Updated:                                                                        │
│  └── .gitignore                    Added .worktrees/, .chorus/state/            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ What's next?                                                             │    │
│  │ ───────────────────────────────────────────────────────────────────────│    │
│  │ 1. Run `chorus` to start planning                                        │    │
│  │ 2. Describe your project goals to 📊 Planner Pat                    │    │
│  │ 3. Review generated tasks                                                │    │
│  │ 4. Choose Semi-Auto or Autopilot mode                                    │    │
│  │ 5. Watch ⚙️ Engineer Ed build your project!                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Start Planning   [q] Exit (run `chorus` later)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Planning Mode UI

Chat interface with 📊 Planner Pat for task decomposition.

### Initial State (No Tasks)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📊 PLANNING                                               0 tasks   [?] Help   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─ 📊 Planner Pat ─────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  Welcome! I'm Pat, your planning assistant.                              │   │
│  │                                                                           │   │
│  │  I'll help you break down your project into atomic, testable tasks.      │   │
│  │                                                                           │   │
│  │  You can:                                                                 │   │
│  │  • Describe what you want to build (I'll create tasks)                   │   │
│  │  • Paste an existing task list (I'll validate it)                        │   │
│  │  • Reference a spec file: `@spec path/to/spec.md`                        │   │
│  │                                                                           │   │
│  │  What would you like to build?                                           │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > I want to build a REST API for user authentication with JWT tokens            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Send   [Ctrl+V] Paste   [@] Reference file   [Esc] Cancel               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Planning In Progress

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📊 PLANNING                                               8 tasks   [?] Help   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─ You ────────────────────────────────────────────────────────────────────┐   │
│  │ I want to build a REST API for user authentication with JWT tokens       │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ 📊 Planner Pat ─────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  I've analyzed your request. Here's my proposed breakdown:               │   │
│  │                                                                           │   │
│  │  ┌─ Generated Tasks (8) ──────────────────────────────────────────────┐  │   │
│  │  │ → ch-001  F01: User model with password hashing                    │  │   │
│  │  │ → ch-002  F02: JWT token generation service                        │  │   │
│  │  │ → ch-003  F03: Login endpoint POST /auth/login                     │  │   │
│  │  │ → ch-004  F04: Register endpoint POST /auth/register               │  │   │
│  │  │ → ch-005  F05: JWT validation middleware                           │  │   │
│  │  │ → ch-006  F06: Refresh token endpoint POST /auth/refresh           │  │   │
│  │  │ → ch-007  F07: Logout endpoint POST /auth/logout                   │  │   │
│  │  │ → ch-008  F08: Protected route example GET /auth/me                │  │   │
│  │  └────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                           │   │
│  │  Dependencies: ch-001 → ch-002 → ch-003,ch-004                           │   │
│  │                                                                           │   │
│  │  Should I proceed to validation, or would you like to adjust?            │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ > yes, looks good                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Enter] Send   [v] View task details   [e] Edit task   [r] Review now           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Task Detail Panel (Split View)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📊 PLANNING                                               8 tasks   [?] Help   │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ Tasks (8)                    │ ch-003: F03: Login endpoint                      │
│ ─────────────────────────────│──────────────────────────────────────────────────│
│ → ch-001 F01: User model...  │ ID: ch-003         Status: pending               │
│ → ch-002 F02: JWT token...   │ Deps: ch-001, ch-002                             │
│ ▸ ch-003 F03: Login endp...  │ ─────────────────────────────────────────────────│
│ → ch-004 F04: Register...    │                                                  │
│ → ch-005 F05: JWT valid...   │ ## Description                                   │
│ → ch-006 F06: Refresh...     │ Create POST /auth/login endpoint that validates  │
│ → ch-007 F07: Logout...      │ credentials and returns JWT tokens.              │
│ → ch-008 F08: Protected...   │                                                  │
│                              │ ## Acceptance Criteria                           │
│                              │ - [ ] Accepts email + password in request body   │
│                              │ - [ ] Validates against User model               │
│                              │ - [ ] Returns 401 for invalid credentials        │
│                              │ - [ ] Returns access + refresh tokens on success │
│                              │ - [ ] Sets httpOnly cookie for refresh token     │
│                              │ - [ ] 6 tests pass                               │
│                              │                                                  │
│                              │ ## Files                                         │
│                              │ - src/routes/auth.ts                             │
│                              │ - src/routes/auth.test.ts                        │
│                              │                                                  │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ [j/k] Navigate   [Enter] Select   [e] Edit   [d] Delete   [r] Review all        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Review Mode UI

Task validation before implementation.

### Validation In Progress

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📋 TASK REVIEW                                          Iteration 1/3          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Validating 8 tasks against project rules...                                    │
│                                                                                  │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  5/8 tasks checked                    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Checking ch-006: F06: Refresh token endpoint...                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Validation Results (Issues Found)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📋 TASK REVIEW                                          Iteration 1/3          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Validation complete: 3 issues found                                            │
│                                                                                  │
│  ┌─ Issues ─────────────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  ✗ ch-004: Too many acceptance criteria (12, max: 10)                    │   │
│  │    → Auto-fix: Split into ch-004a, ch-004b                               │   │
│  │                                                                           │   │
│  │  ✗ ch-006 → ch-003 → ch-006: Circular dependency detected                │   │
│  │    → Auto-fix: Remove ch-006 → ch-003 dependency                         │   │
│  │                                                                           │   │
│  │  ⚠ ch-008: Vague criterion "works correctly"                             │   │
│  │    → Needs manual clarification                                          │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─ Summary ────────────────────────────────────────────────────────────────┐   │
│  │  ✓ 5 tasks passed       ✗ 2 auto-fixable       ⚠ 1 needs attention       │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [a] Apply auto-fixes   [e] Edit ch-008   [r] Re-validate   [b] Back to planning │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### All Tasks Valid

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📋 TASK REVIEW                                                ✓ All Valid      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │                         ✓ All 9 tasks validated!                        │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─ Task Summary ───────────────────────────────────────────────────────────┐   │
│  │                                                                           │   │
│  │  Total tasks:        9                                                   │   │
│  │  Dependencies:       12 links                                            │   │
│  │  Estimated tests:    ~45 tests                                           │   │
│  │                                                                           │   │
│  │  Priority breakdown:                                                     │   │
│  │  ├── P0 (Critical):  2 tasks                                             │   │
│  │  ├── P1 (High):      4 tasks                                             │   │
│  │  └── P2 (Normal):    3 tasks                                             │   │
│  │                                                                           │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Ready to begin implementation!                                                  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [s] Semi-Auto mode   [a] Autopilot mode   [b] Back to review   [?] Help         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mode Selection UI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 😎 CHORUS                                                   Choose Mode        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ✓ 9 tasks ready for implementation                                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   [S]  SEMI-AUTO                                    ← Recommended       │    │
│  │        ─────────────────────────────────────────────────────────────    │    │
│  │        • You select which task to work on                               │    │
│  │        • ⚙️ Engineer Ed completes one task, then waits            │    │
│  │        • Full control over task order and timing                        │    │
│  │        • Best for: First runs, learning the workflow                    │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                                                                          │    │
│  │   [A]  AUTOPILOT                                                        │    │
│  │        ─────────────────────────────────────────────────────────────    │    │
│  │        • 🎯 Spotter Sam auto-selects optimal tasks                │    │
│  │        • Multiple ⚙️ Engineers work in parallel                         │    │
│  │        • Runs until all tasks complete or you pause                     │    │
│  │        • Best for: Established workflows, overnight runs                │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [S] Semi-Auto   [A] Autopilot   [B] Back to review   [?] Help                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Plan Agent Capabilities

Plan Agent helps with:

1. **Free-form Planning:** User describes goal, agent creates task breakdown
2. **Task List Review:** User pastes tasks, agent validates and suggests improvements
3. **Spec/PRD Parsing:** User provides spec file, agent parses and decomposes into tasks

Agent prompt is constructed from:
- Shared rules (from `.chorus/rules/`)
- Project-specific task rules (from `.chorus/task-rules.md`)
- Shared learnings (from `.chorus/learnings.md`)
- Agent-specific prompt (from `.chorus/agents/pat/prompt.md`)
- Agent-specific learnings (from `.chorus/agents/pat/learnings.md`)

### Auto-Decomposition

For large specs, chunked processing:

```typescript
// Process large specs in chunks
async function parseSpecInChunks(specPath: string, chunkSize: number = 500) {
  const content = await readFile(specPath);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    // Process chunk, generate tasks
    yield processChunk(chunk);
  }
}
```

---

## Task Validation Rules

All tasks are validated before implementation begins.

### Built-in Rules (Always Enforced)

| Rule | Description |
|------|-------------|
| **Atomic** | Each task must have a single responsibility |
| **Testable** | All acceptance criteria must be verifiable |
| **Acyclic** | No circular dependencies allowed |
| **Context-fit** | Task must fit within one agent context window |

### Configurable Rules (`.chorus/task-rules.md`)

```markdown
# Task Rules

## Configurable Limits

| Setting | Value | Description |
|---------|-------|-------------|
| max_acceptance_criteria | 10 | Maximum criteria per task |
| max_description_length | 500 | Maximum chars for description |

## Optional Rules

- [ ] require_test_file: Require explicit test file reference
- [x] enforce_naming: Pattern `^F\d+[a-z]?: .+`
- [ ] forbidden_words: simple, easy, just, obviously
```

---

## Planning State Persistence

Planning progress saved to `.chorus/planning-state.json`:

```json
{
  "status": "reviewing",
  "chosenMode": null,
  "planSummary": {
    "userGoal": "Build e-commerce API",
    "estimatedTasks": 15
  },
  "reviewIterations": [
    { "iteration": 1, "issues": 3, "fixed": 2 }
  ]
}
```

**Status Values:**
- `planning` - User describing goals, Plan Agent creating tasks
- `reviewing` - Validating tasks against rules
- `ready` - All tasks valid, waiting for mode selection
- `implementation` - User chose mode, implementation started

**chosenMode Values:** `null` (not yet chosen), `"semi-auto"`, `"autopilot"`

---

## Mode Routing (App Router)

The App Router (F89) determines which mode to enter based on project state:

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODE ROUTING LOGIC                          │
└─────────────────────────────────────────────────────────────────┘

CLI Input (F90)
     │
     ├── chorus --help          → Show help, exit
     ├── chorus --version       → Show version, exit
     └── chorus                  → Auto-detect mode based on project state
                │
                ▼
        ┌───────────────┐
        │  App Router   │  (F89)
        └───────┬───────┘
                │
     ┌──────────┴──────────┐
     │ .chorus/ exists?    │
     └──────────┬──────────┘
           No   │   Yes
           │    │
           ▼    ▼
     ┌─────────┐ ┌─────────────────┐
     │  INIT   │ │ Check state     │
     │  MODE   │ │ planning-state  │
     └─────────┘ └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              │ planning-state.json │
              │ status?             │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    "planning"      "reviewing"    "ready" or
                                   "implementation"
         │               │               │
         ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌────────────────┐
   │ PLANNING  │   │  REVIEW   │   │ Check tasks    │
   │   MODE    │   │   MODE    │   └───────┬────────┘
   └───────────┘   └───────────┘           │
                                    ┌──────┴──────┐
                                    │ Has tasks?  │
                                    └──────┬──────┘
                                      Yes  │  No
                                      │    │
                                      ▼    ▼
                              ┌──────────┐ ┌──────────┐
                              │IMPLEMENT │ │ PLANNING │
                              │  MODE    │ │   MODE   │
                              └──────────┘ └──────────┘
```

### CLI Parser (F90)

```typescript
interface CLIArgs {
  help?: boolean;
  version?: boolean;
}

// Examples:
// chorus                    → Auto-detect mode based on project state
// chorus --help             → Show help, exit
// chorus --version          → Show version, exit
```

> **Note:** Mode selection is handled via TUI (`m` key) and `planning-state.json`, not CLI flags.

### Implementation Mode (F91)

When entering Implementation Mode:
1. Load `planning-state.json` to get `chosenMode`
2. Initialize Orchestrator with mode
3. Load tasks from TaskStore
4. Render TUI with appropriate layout (TaskPanel + AgentGrid)
5. Start event loop based on mode (semi-auto waits, autopilot auto-assigns)

**Exit Conditions for Implementation Mode:**

| Condition | Behavior |
|-----------|----------|
| All tasks closed | Show summary, prompt to exit or add tasks |
| User quits (q) | Confirm if agents running, then exit |
| User pauses | Stay in mode, wait for resume |
| No ready tasks | Autopilot: wait for blocked tasks to clear; Semi-auto: show "No tasks available" |
| Critical error | Pause, show error, allow recovery |
| Switch to planning | User presses 'P' to return to planning |

---

## Directory Structure: `.chorus/`

```
.chorus/
├── config.json              # Main configuration
├── tasks.jsonl              # Task database (TaskStore format)
├── task-rules.md            # Task validation rules (agent-readable)
├── learnings.md             # Shared project learnings (agent-readable)
├── planning-state.json      # Current planning state
├── sprints.jsonl            # Sprint history (append-only)
├── state/                   # XState persistence (gitignored)
│   ├── snapshot.json        # XState machine snapshot
│   └── events.jsonl         # XState event log for recovery
├── specs/                   # Living spec documents
│   ├── *.md                 # Active specs (only draft sections visible)
│   ├── progress.json        # Tracks spec sections and their states
│   └── archive/             # Completed specs (never in agent context)
├── feedback/                # Review feedback per task
│   └── {task-id}.json       # Feedback history for each task
├── checkpoints/             # Checkpoint storage (rollback support)
│   └── {timestamp}/         # Checkpoint data per timestamp
├── rules/                   # Shared rules (all agents read)
│   ├── signal-types.md      # Signal format and valid types
│   ├── learning-format.md   # Learning scope prefixes
│   ├── commit-format.md     # Commit message format
│   ├── completion-protocol.md # Quality checks and completion
│   └── project.md           # Project-specific conventions
├── metrics/                 # Carl's output directory (event-driven)
│   ├── counters.json        # Agent spawn counters (lifetime, persists)
│   ├── session.json         # Current session stats
│   ├── history.jsonl        # Historical data for trends
│   └── agents/              # Per-agent performance
│       └── {agentId}.json
└── agents/                  # Per-agent data (all 9 agents)
    ├── ace/                 # 🔍 Analyzer Ace - Project Analyzer
    │   ├── prompt.md        # System prompt
    │   ├── rules.md         # Persona-specific rules
    │   ├── skills/          # Claude Code skills
    │   ├── logs/            # Execution logs per task
    │   ├── learnings.md     # Agent-specific learnings
    │   └── metrics.json     # Performance metrics
    ├── ed/                  # ⚙️ Engineer Ed - Worker (N instances)
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    ├── pat/                 # 📊 Planner Pat - Task Planner
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    ├── finn/                # 🔧 Fixer Finn - Conflict Resolver
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    ├── sam/                 # 🎯 Spotter Sam - Task Selector
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    ├── lou/                 # 💡 Logger Lou - Learning Extractor
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/
    │   ├── learnings.md
    │   └── metrics.json
    ├── dan/                 # 😎 Director Dan - Orchestrator
    │   ├── prompt.md
    │   ├── rules.md
    │   ├── skills/
    │   ├── logs/            # User interaction logs
    │   ├── learnings.md
    │   └── metrics.json
    ├── will/                # 👁️ Watcher Will - Health Monitor (no worktree)
    │   ├── prompt.md
    │   ├── rules.md
    │   └── logs/            # Health check logs
    └── carl/                # 📈 Counter Carl - Statistician (no worktree)
        ├── prompt.md
        ├── rules.md
        └── logs/            # Metrics collection logs
```

**File Formats:**
- **JSON:** config.json, planning-state.json, specs/progress.json, metrics.json, feedback/*.json (structured data)
- **JSONL:** tasks.jsonl, sprints.jsonl, state/events.jsonl, logs/*.jsonl, audit/*.jsonl (append-only logs)
- **Markdown:** task-rules.md, learnings.md, rules/*.md, agents/*/prompt.md, specs/*.md, templates/*.md (agent-readable)
- **Directory:** checkpoints/{timestamp}/ contains snapshot data for rollback

---

## Event Logging

All events logged to `.chorus/state/events.jsonl` (XState event log):

```jsonl
{"ts":"2026-01-11T14:00:00Z","type":"INIT_STARTED","details":{}}
{"ts":"2026-01-11T14:05:00Z","type":"CONFIG_SAVED","details":{"qualityCommands":["npm test"]}}
{"ts":"2026-01-11T14:10:00Z","type":"PLAN_AGENT_STARTED","details":{}}
{"ts":"2026-01-11T14:15:00Z","type":"TASKS_GENERATED","details":{"count":15}}
{"ts":"2026-01-11T14:20:00Z","type":"REVIEW_ITERATION","details":{"iteration":1,"issues":3}}
{"ts":"2026-01-11T14:25:00Z","type":"SPAWN_AGENT","details":{"agentId":"ed-001","taskId":"ch-abc"}}
```

### Event Reference by Mode

| Mode | Event | Details |
|------|-------|---------|
| **init** | `started` | Init mode began |
| | `prerequisites_checked` | `{missing: string[]}` |
| | `project_detected` | `{type, name, prefix}` |
| | `config_saved` | `{qualityCommands}` |
| | `completed` | Init finished |
| **planning** | `agent_started` | Plan Agent spawned |
| | `user_input` | `{input: string}` |
| | `tasks_generated` | `{count, source}` |
| | `spec_parsed` | `{file, chunks}` |
| | `spec_created` | `{file, method: import\|interactive\|template}` |
| | `spec_section_tasked` | `{file, section, tasks: string[]}` |
| | `spec_archived` | `{file, reason}` |
| **review** | `validation_started` | `{taskCount}` |
| | `issues_found` | `{issues: Issue[]}` |
| | `fix_applied` | `{taskId, fixType}` |
| | `iteration_complete` | `{iteration, issues, fixed}` |
| | `all_valid` | All tasks passed |
| **implementation** | `mode_selected` | `{mode: semi-auto\|autopilot}` |
| | `agent_assigned` | `{agentId, taskId}` |
| | `agent_iteration` | `{agentId, iteration}` |
| | `agent_signal` | `{agentId, signal, payload}` |
| | `task_completed` | `{taskId, duration}` |
| | `task_failed` | `{taskId, reason}` |
| | `task_timeout` | `{taskId, iterations}` |
| | `merge_queued` | `{taskId, branch}` |
| | `merge_completed` | `{taskId}` |
| | `merge_conflict` | `{taskId, files}` |
| | `session_paused` | User paused |
| | `session_resumed` | User resumed |
| | `session_completed` | All tasks done |
| **learning** | `learning_extracted` | `{taskId, agentType, category, count}` |
| | `learning_categorized` | `{learningId, category}` |
| | `pattern_suggested` | `{content, source, category}` |
| | `pattern_approved` | `{content, approvedBy}` |
| | `pattern_rejected` | `{content, reason}` |
| | `pattern_expired` | `{content, source, age_days}` |
| **plan_review** | `review_triggered` | `{trigger, learningCategory}` |
| | `review_iteration` | `{iteration, tasksUpdated, tasksMarkedRedundant}` |
| | `review_converged` | `{iterations, totalChanges}` |
| | `task_updated` | `{taskId, changeType, oldValue, newValue}` |
| | `task_marked_redundant` | `{taskId, reason}` |
| **incremental_planning** | `planning_triggered` | `{readyCount, threshold}` |
| | `horizon_started` | `{horizonNumber, specSections}` |
| | `horizon_completed` | `{horizonNumber, tasksCreated}` |
| | `stop_condition_hit` | `{condition}` |

---

## Config File: `.chorus/config.json`

> **Note:** Config `version` tracks the config schema version, not the plan version.
> Use semantic versioning: bump major for breaking changes, minor for new fields.

```json
{
  "version": "3.1",

  "project": {
    "name": "my-awesome-app",
    "type": "node",
    "taskIdPrefix": "ch-"
  },

  "qualityCommands": [
    { "name": "typecheck", "command": "npm run typecheck", "required": true, "order": 1 },
    { "name": "lint", "command": "npm run lint", "required": false, "order": 2 },
    { "name": "test", "command": "npm test", "required": true, "order": 3 }
  ],

  "mode": "semi-auto",

  "agents": {
    "default": "claude",
    "maxParallel": 3,
    "timeoutMinutes": 30
  },

  "completion": {
    "signal": "<chorus>COMPLETE</chorus>",
    "maxIterations": 50
  },

  "merge": {
    "autoResolve": true,
    "agentResolve": true,
    "requireApproval": false
  },

  "tui": {
    "agentGrid": "auto"
  },

  "checkpoints": {
    "beforeAutopilot": true,
    "beforeMerge": true,
    "periodic": 5
  },

  "planReview": {
    "enabled": true,
    "maxIterations": 5,
    "triggerOn": ["cross_cutting", "architectural"],
    "autoApply": "minor",
    "requireApproval": ["redundant", "dependency_change"]
  },

  "createdAt": "2026-01-11T14:00:00Z",
  "updatedAt": "2026-01-11T14:00:00Z"
}
```

---

## References

- [04-task-management.md](./04-task-management.md) - TaskStore and task validation
- [05-agent-personas.md](./05-agent-personas.md) - Plan Agent persona
- [08-memory-system.md](./08-memory-system.md) - Pattern learning from planning

---

**End of Planning Phase Module**
