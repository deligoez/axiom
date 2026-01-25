# Swarm Planning Method

Swarm uses the Swarm Planning Method - an emergent approach where ideas refine into implementable units through iterative cycles.

---

## Core Concept

**The Emergent Todo List**

Traditional todo lists assume all items are known upfront. Swarm operates differently: some todo items produce other todo items.

```
Traditional:              Emergent:
□ Build login             □ Understand auth needs    ← produces 3 items
□ Build dashboard         □ Research auth options    ← produces decision
□ Build settings          □ Build login             ← produces code
□ Deploy                  □ ... (items emerge)
```

You're never blocked because there's always a next action - even if that action is "figure out what to do next."

---

## The Refinement Chain

```
⬛ Black (Raw Need/PRD)
     │
     └── SPLIT → ⬜ Gray (Plan Drafts)
                      │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    🟧 Orange   🟪 Purple    🟦 Blue
    (Research)  (Decision)  (Feature)
         │           │           │
         └─────┬─────┘           │
               │                 │
               └────► ⬜ Gray ───┘
                         │
                         └── SPLIT → 🟦 Blue (Features)
                                          │
                                          └── SPLIT → 🟩 Green (Ideas)
                                                           │
                                                    ┌──────┴──────┐
                                                    │             │
                                                    ▼             ▼
                                            status: done    🟡 Yellow
                                            (White)        (Learning)
```

Yellow ideas are **byproducts** of Green execution via learning signals, not refinement steps.

---

## Color Definitions

### ⬛ Black: Raw Need (The PRD)

The black idea is the single source of truth. Written in JTBD format:

```
"When [situation], I want [motivation], so that [expected outcome]."
```

**Example:**
```
"When I want to share my technical writings,
I want a blog under my control,
so that I can reach readers without depending on Medium."
```

**Pat's behavior:**
1. Writes Black idea in JTBD format
2. Confirms with user
3. Asks initial analysis questions
4. Splits into Gray ideas

**When is Black "realized"?** After each implementation cycle, check: "Is the original need satisfied?"

---

### ⬜ Gray: Plan Draft

Gray ideas are undetailed parts of the plan:
- Features known to be needed but unclear how to implement
- Large blocks not yet broken into smaller pieces
- Areas with undetermined dependencies

**Example:**
```
Gray: Auth system needed
Gray: Blog post management
Gray: Comment system
```

**Pat's behavior:**
1. Reviews Gray ideas in planning spiral
2. Asks clarifying questions
3. When clear enough, splits into Blue ideas
4. If uncertainty exists, transitions to Orange or Purple

---

### 🟧 Orange: Research Needed (Spike)

Orange marks areas requiring investigation. Time-boxed, information-gathering work.

**Examples:**
```
Orange: Which auth library? (NextAuth vs Clerk vs Auth0)
Orange: Markdown parser selection
Orange: WebSocket vs SSE vs Polling?
```

**Pat's behavior:**
- **Simple research:** Pat reads docs, compares, decides → transitions to Blue/Gray
- **Complex research (needs code):** Pat creates mini Gray-Blue-Green cycle as PoC

**Dependency rule:** Orange must be resolved before downstream Blue/Green can start.

---

### 🟪 Purple: Decision Pending (Blocker)

Purple marks points waiting for user response. Blocks progress on that branch.

**Examples:**
```
Purple: Should comments be self-hosted or 3rd party?
Purple: Will there be premium content?
Purple: What will the domain name be?
```

**Pat's behavior:**
1. Presents options and trade-offs to user
2. Branch doesn't progress until user responds
3. When answered → transitions to Gray or Blue

---

### 🟥 Red: Deferred

Red marks ideas moved outside current scope. Not deleted, but not active.

**Examples:**
```
Red: Analytics dashboard [V2]
Red: Multi-language support [Later]
```

**When something becomes Red:**
- During initial scoping
- During planning spiral (too complex)
- During retrospective (deprioritized)

---

### 🟦 Blue: Concrete Feature (Vertical Slice)

Blue ideas are **minimum viable features** that work end-to-end. Each Blue spans all layers (DB, API, UI) for one independent feature.

**Vertical slicing principle:**
```
❌ Horizontal (bad):        ✓ Vertical (good):
   "Design all DB schemas"     "View post" (min DB + API + UI)
   "Write all APIs"            "List posts" (min DB + API + UI)
   "Build all UI"              "Create post" (min DB + API + UI)
```

**Example Blue with children:**
```
Blue: View post
├── Green: Create post DB schema
├── Green: GET /posts/[id] API endpoint
└── Green: PostDetail component
```

**Pat's behavior:**
1. Splits Gray into vertical slices (Blue)
2. Ensures each Blue can work independently
3. Applies INVEST criteria
4. Defines acceptance criteria

---

### 🟩 Green: Atomic Idea

Green ideas are the smallest implementable units. One Blue splits into multiple Greens.

**INVEST Criteria:**
- **I**ndependent: Can be done without waiting
- **N**egotiable: Details flexible
- **V**aluable: Produces value alone
- **E**stimable: Size can be estimated
- **S**mall: One session
- **T**estable: Has acceptance criteria

**Example:**
```
Green: Create post DB schema
  Acceptance: posts table exists with id, title, content, createdAt
  Test: Migration runs successfully
```

Green with `status: done` = White (completed). White is a status, not a separate color.

---

### 🟡 Yellow: Learning/Discovery

Yellow ideas capture learnings discovered during Green execution. They are created by Logger Lou when agents emit learning signals.

**Scope Types:**
| Scope | Created From | Injected Into |
|-------|--------------|---------------|
| `local` | `LEARNING_LOCAL` signal | Same agent's prompts |
| `global` | `LEARNING_GLOBAL` signal | All agents' prompts |

**Example:**
```
Yellow: rehype requires explicit config for GFM
  Parent: Green idea-020 (Setup rehype)
  Scope: global
  Impact: high
```

Yellow ideas are always children of the Green that produced them.

---

## Two Types of State Changes

### Transition (same item, color changes)

```
Gray "Auth system"
  │
  └── TRANSITION → Orange "Research auth options"
                      │
                      └── TRANSITION → Blue "Clerk integration"
```

### Split (new children created)

```
Blue "Login flow"
  │
  └── SPLIT → Green "Clerk setup"
              Green "Login UI"
              Green "Session handling"
```

| Change Type | When | Example |
|-------------|------|---------|
| Transition | Idea refines but stays conceptually one thing | Gray → Orange → Blue |
| Split | Idea breaks into multiple distinct things | Blue → [Green, Green, Green] |

Note: Yellow creation is neither transition nor split - it's a **byproduct** of Green execution via learning signals.

---

## Planning Dialogue Model

Planning is not just idea generation—it's a structured dialogue between the user and Planner Pat. The process follows 5 distinct phases.

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
| **4. DECOMPOSE** | Generate atomic ideas | One-shot generation | Ideas created |
| **5. VALIDATE** | Check ideas against rules | Ralph Loop iteration | All ideas pass |

---

## Phase 1: UNDERSTAND

Pat asks clarifying questions to fully understand the user's goal before generating anything.

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

### Context Gathered

```go
type CodebaseContext struct {
    TechStack        []string         `json:"techStack"`        // ["TypeScript", "React", "Vitest"]
    ExistingPatterns []PatternInfo    `json:"existingPatterns"`
    RelevantFiles    []string         `json:"relevantFiles"`    // Files that might be affected
    Conventions      ConventionInfo   `json:"conventions"`
}

type PatternInfo struct {
    Name        string `json:"name"`
    File        string `json:"file"`
    Description string `json:"description"`
}

type ConventionInfo struct {
    Naming    string `json:"naming"`    // "camelCase functions, PascalCase components"
    Testing   string `json:"testing"`   // "AAA pattern, co-located test files"
    Structure string `json:"structure"` // "Feature-based folders"
}
```

---

## Phase 3: PROPOSE

Pat proposes a high-level architecture before generating ideas. User must approve before proceeding.

### Proposal Structure

```markdown
## Architecture Proposal

### Components
1. **User Model** - Database schema with password hashing
2. **JWT Service** - Token generation and validation
3. **Auth Endpoints** - Login, register, refresh, logout

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | httpOnly cookie | XSS protection |
| Password hash | bcrypt | Industry standard |

### Estimated Scope
- ~8 ideas
- ~45 tests
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

Pat generates atomic ideas from the approved architecture. This is one-shot generation.

### Idea Generation Rules

| Rule | Description |
|------|-------------|
| **Atomic** | One responsibility per idea |
| **Testable** | All criteria verifiable |
| **Context-fit** | Fits in agent context window |
| **Clear dependencies** | Explicit blocker relationships |

---

## Phase 5: VALIDATE (Ralph Loop)

The ONLY phase where Ralph Loop pattern applies. Mechanical iteration until all ideas pass validation.

### Validation Issue Types

| Type | Auto-fixable? | Action |
|------|---------------|--------|
| **Too many criteria** | ✓ | Split idea into sub-ideas |
| **Circular dependency** | ✓ | Remove weakest link |
| **Missing dependency** | ✓ | Add inferred dependency |
| **Vague criteria** | ✗ | Prompt user for clarification |
| **Context too large** | ✓ | Split idea |
| **Duplicate idea** | ✓ | Merge or remove |

### Convergence Criteria

The validation loop converges when:
1. **All Pass:** Zero validation issues remain
2. **Max Iterations:** Reached max iterations (default: 5)
3. **User Override:** User explicitly approves despite issues
4. **Only Manual Issues:** All remaining issues require user decision

---

## The Planning Spiral

Pat runs a repeated cycle for clarifying Gray ideas:

```
1. Read Black idea and Gray ideas
     ↓
2. Consistency check
   • Any contradictions?
   • Missing connections?
     ↓
3. For each Gray idea:
   • Clear enough? → Blue
   • Research needed? → Orange
   • Decision needed? → Purple
   • Can split into Blues?
     ↓
4. Ask necessary questions to user
     ↓
5. Update Gray ideas and dependency tree
     ↓
6. Are first Blue ideas ready?
   • Yes → Move to implementation
   • No → Return to step 1
```

**Why "spiral" not "loop"?** Each pass produces more refined ideas. You're never in the same place twice.

---

## The Implementation Loop

For each Blue idea:

```
1. Pat splits Blue into Green ideas
     ↓
2. For each Green:
   • INVEST check
   • Write acceptance criteria
   • User can add criteria
     ↓
3. Ed implements Green
     ↓
4. During execution:
   • Learning signals → Lou creates Yellow ideas
     ↓
5. Quality check
   • Pass → Green status: done, Yellow children: archived
   • Fail → Ed continues iterating
     ↓
6. All Greens done?
   • Yes → Retrospective
   • No → Continue to next Green
```

---

## Retrospective

After each Blue feature completes (all its Greens done and merged):

```
Pat runs Retrospective:
  1. Query Yellow ideas from this Blue's Greens
  2. Check: Black idea impact?
  3. Revise Gray ideas based on learnings
  4. Update dependency tree
  5. Check: Is Black satisfied?
     • Yes → Project complete 🎉
     • Partially → Continue to next Blue
     • No → Add new Grays if needed
```

Retrospective is automatic, triggered by Blue completion. Pat queries Yellow ideas created during the Blue's Green executions.

---

## PoC as Mini-Cycle

When Orange research needs working code:

```
Orange: Which auth library?
│
│  [Needs code comparison]
│
└── Gray: Compare auth libraries (sub-project)
    │
    ├── Blue: Clerk PoC
    │   └── Green: Basic Clerk login → Ed implements
    │
    ├── Blue: NextAuth PoC
    │   └── Green: Basic NextAuth login → Ed implements
    │
    └── [Results compared, Orange resolved]
```

The Orange spawns its own mini planning cycle. PoCs are real Greens that Ed implements.

---

## Dependency Tree

Dependencies form a tree structure:

```
⬛ Black: "I want a technical blog..."
│
├── ⬜ Gray: Blog post system
│   │
│   ├── 🟧 Orange: Markdown parser selection
│   │   └── [Resolved] → 🟦 Blue: rehype rendering
│   │
│   ├── 🟦 Blue: View post
│   │   ├── 🟩 Green: Post DB schema [done]
│   │   │   └── 🟡 Yellow: "Drizzle ORM requires explicit type imports" [local]
│   │   ├── 🟩 Green: GET /posts/[id] API [done]
│   │   │   └── 🟡 Yellow: "Use zod for API validation" [global]
│   │   └── 🟩 Green: PostDetail component
│   │
│   └── ⬜ Gray: Comment system
│       └── 🟪 Purple: [BLOCKER] Self-host or 3rd party?
│
└── 🟥 Red: Analytics dashboard [V2 - deferred]
```

Yellow ideas are always children of the Green that produced them via learning signals.

**Dependency Rules:**
1. Orange unresolved → downstream Blue/Green cannot start
2. Purple unresolved → that branch cannot progress
3. Gray not split into Blue → Green cannot be created
4. Independent branches → can progress in parallel

---

## Init Mode

Before planning, Analyzer Ace examines the project:

| Target | Extracted Info |
|--------|----------------|
| Codebase structure | src/, tests/, lib/ patterns |
| package.json | Scripts, dependencies |
| Test files | Framework, patterns |
| Linter config | Code style rules |

**Init Output:**
- Creates `.swarm/` directory
- Writes `config.json` with detected settings
- Transitions to Planning Mode

---

## JTBD for Existing Projects

For existing projects, Pat adapts:

```
User: "Add wishlist feature to my e-commerce app"
     ↓
Pat: "I'll frame this as a goal:

     When browsing products in your e-commerce app,
     I want to save items to a wishlist,
     so that I can purchase them later without searching again.

     Does this capture your intent?"
     ↓
User: Confirms
     ↓
Pat: Creates Black with project context
```

**Black with context:**
```
Black {
  jtbd: "When..., I want..., so that...",
  projectContext: {
    stack: "Next.js, Prisma, Clerk",
    existingModels: ["User", "Product", "Order"]
  }
}
```

---

## Incremental Planning

Rather than planning all ideas upfront, Swarm supports **incremental planning** - creating ideas just-in-time as implementation progresses.

### Why Incremental Planning?

| Benefit | Description |
|---------|-------------|
| **Reduced waste** | Don't plan ideas for features that may change |
| **Better accuracy** | Plan with knowledge gained from implementation |
| **Natural flow** | Implementation informs the next planning cycle |
| **Manageable scope** | Avoid overwhelming idea lists |

### Planning Triggers

Planning is triggered when ready idea count drops below threshold (default: 3).

```
         Ready Idea Count
               │
  ┌────────────┴────────────┐
  │ readyCount < threshold? │
  └────────────┬────────────┘
           Yes │  No
               │
  ┌────────────┴────────────┐
  │                         │
  ▼                         ▼
┌──────────────┐      ┌──────────────┐
│ TRIGGER      │      │ SKIP         │
│ Pat creates  │      │ Enough work  │
│ more ideas   │      │ available    │
└──────────────┘      └──────────────┘
```

### Planning Horizon

Pat plans up to the next **horizon** - a logical stopping point:

| Stop Condition | Example |
|----------------|---------|
| **Milestone boundary** | Complete all M1 ideas before planning M2 |
| **Feature boundary** | Finish "auth" before planning "notifications" |
| **Uncertainty point** | Stop at ideas requiring user decisions |
| **Max batch size** | Default 10 ideas per planning cycle |

### Manual Triggers

| Key | Action | Description |
|-----|--------|-------------|
| `P` | Plan | Trigger incremental planning (only if ready < threshold) |
| `Shift+P` | Force Plan | Force planning even if enough ready ideas exist |
| `Ctrl+L` | Learning Review | Review learnings and their impact |

---

## Spec Lifecycle

Specs are treated as **consumable resources**. As implementation progresses, spec sections are consumed into ideas.

### Spec States

```
   ┌──────────────┐
   │    draft     │  ← Being discussed with Pat, not finalized
   └──────┬───────┘
          │ User approves or defers
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌──────────┐  ┌──────────┐
│ deferred │  │ partial  │  ← Clarified but postponed / Some ideas created
└──────────┘  └────┬─────┘
    │              │ More ideas created
    │ User         │
    │ reactivates  ▼
    │         ┌──────────┐
    └────────▶│ consumed │  ← All ideas created from this section
              └────┬─────┘
                   │ All ideas complete (or section no longer needed)
                   ▼
              ┌──────────┐
              │ archived │  ← Moved to specs/archive/
              └──────────┘
```

### State Descriptions

| State | Description | Visibility to Agents |
|-------|-------------|---------------------|
| **draft** | Being discussed with Pat | Full content visible |
| **deferred** | Postponed (not for current sprint) | Hidden from agents |
| **partial** | Some ideas created, more content remains | Remaining content visible |
| **consumed** | All content converted to ideas | Collapsed reference only |
| **archived** | Complete or obsolete | Not in context |

### Section Collapsing

When a spec section becomes `consumed`, it is **collapsed** in the agent context:

```markdown
<!-- BEFORE: Full section visible (draft or partial) -->
## User Model

The user model should include:
- id: UUID
- email: string, unique
- passwordHash: string
...

<!-- AFTER: Collapsed (consumed state) -->
## User Model
> 📋 **CONSUMED**: See ideas idea-001, idea-002 for details.
```

**Benefits:**
- Reduces context window usage
- Prevents agents from re-reading fully-covered sections
- Partial sections still show remaining uncovered content

### Spec Progress Tracking

Progress tracked in `.swarm/specs/progress.json`:

```json
{
  "specs": {
    "auth-system.md": {
      "sections": [
        {
          "heading": "## User Model",
          "state": "consumed",
          "ideas": ["idea-001", "idea-002"]
        },
        {
          "heading": "## JWT Service",
          "state": "partial",
          "ideas": ["idea-003"]
        },
        {
          "heading": "## OAuth",
          "state": "deferred",
          "deferredReason": "Not needed for MVP"
        }
      ]
    }
  }
}
```

---

## Idea Validation Rules

All ideas are validated before implementation begins.

### Built-in Rules (Always Enforced)

| Rule | Description |
|------|-------------|
| **Atomic** | Each idea must have a single responsibility |
| **Testable** | All acceptance criteria must be verifiable |
| **Acyclic** | No circular dependencies allowed |
| **Context-fit** | Idea must fit within one agent context window |

### Configurable Rules (`.swarm/idea-rules.md`)

```markdown
# Idea Rules

## Configurable Limits

| Setting | Value | Description |
|---------|-------|-------------|
| max_acceptance_criteria | 10 | Maximum criteria per idea |
| max_description_length | 500 | Maximum chars for description |

## Optional Rules

- [ ] require_test_file: Require explicit test file reference
- [x] enforce_naming: Pattern `^F\d+[a-z]?: .+`
- [ ] forbidden_words: simple, easy, just, obviously
```

---

## Planning State

Stored in `.swarm/planning-state.json`:

```json
{
  "status": "implementation",
  "chosenMode": "semi-auto",
  "phase": "ready",
  "blackIdea": {
    "id": "idea-001",
    "jtbd": "When I want to share...",
    "satisfied": false
  },
  "clarifications": [],
  "codebaseContext": {},
  "proposals": [],
  "validationIterations": []
}
```

| Status | Meaning |
|--------|---------|
| `init` | Running Init Mode |
| `planning` | Pat running spiral |
| `implementation` | Ed executing Greens |

| Phase | Meaning |
|-------|---------|
| `understand` | Phase 1: Q&A with user |
| `analyze` | Phase 2: Codebase exploration |
| `propose` | Phase 3: Architecture approval |
| `decompose` | Phase 4: Idea generation |
| `validate` | Phase 5: Ralph Loop validation |
| `ready` | All ideas valid, ready for implementation |
