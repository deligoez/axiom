# AXIOM Planning Method

AXIOM uses the AXIOM Planning Method - an emergent approach where cases refine into implementable units through iterative cycles.

---

## Core Concept

**The Emergent Todo List**

Traditional todo lists assume all items are known upfront. AXIOM operates differently: some todo items produce other todo items.

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
⬛ Directive (Raw Need/PRD)
     │
     └── SPLIT → ⬜ Draft (Plan Drafts)
                      │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    🟧 Research  🟪 Pending   🟦 Operation
    (Spike)     (Decision)   (Feature)
         │           │           │
         └─────┬─────┘           │
               │                 │
               └────► ⬜ Draft ──┘
                         │
                         └── SPLIT → 🟦 Operation (Features)
                                          │
                                          └── SPLIT → 🟩 Task (Atomic)
                                                           │
                                                    ┌──────┴──────┐
                                                    │             │
                                                    ▼             ▼
                                            status: done    🟡 Discovery
                                            (Complete)      (Learning)
```

Discovery cases are **byproducts** of Task execution via discovery signals, not refinement steps.

---

## Case Type Definitions

### ⬛ Directive: Raw Need (The PRD)

The Directive case is the single source of truth. Written in JTBD format:

```
"When [situation], I want [motivation], so that [expected outcome]."
```

**Example:**
```
"When I want to share my technical writings,
I want a blog under my control,
so that I can reach readers without depending on Medium."
```

**Axel's behavior:**
1. Writes Directive case in JTBD format
2. Confirms with user
3. Asks initial analysis questions
4. Splits into Draft cases

**When is Directive "realized"?** After each implementation cycle, check: "Is the original need satisfied?"

---

### ⬜ Draft: Plan Draft

Draft cases are undetailed parts of the plan:
- Features known to be needed but unclear how to implement
- Large blocks not yet broken into smaller pieces
- Areas with undetermined dependencies

**Example:**
```
Draft: Auth system needed
Draft: Blog post management
Draft: Comment system
```

**Axel's behavior:**
1. Reviews Draft cases in planning spiral
2. Asks clarifying questions
3. When clear enough, splits into Operation cases
4. If uncertainty exists, transitions to Research or Pending

---

### 🟧 Research: Investigation Needed (Spike)

Research marks areas requiring investigation. Time-boxed, information-gathering work.

**Examples:**
```
Research: Which auth library? (NextAuth vs Clerk vs Auth0)
Research: Markdown parser selection
Research: WebSocket vs SSE vs Polling?
```

**Axel's behavior:**
- **Simple research:** Axel reads docs, compares, decides → transitions to Operation/Draft
- **Complex research (needs code):** Axel creates mini Draft-Operation-Task cycle as PoC

**Dependency rule:** Research must be resolved before downstream Operation/Task can start.

---

### 🟪 Pending: Decision Pending (Blocker)

Pending marks points waiting for user response. Blocks progress on that branch.

**Examples:**
```
Pending: Should comments be self-hosted or 3rd party?
Pending: Will there be premium content?
Pending: What will the domain name be?
```

**Axel's behavior:**
1. Presents options and trade-offs to user
2. Branch doesn't progress until user responds
3. When answered → transitions to Draft or Operation

---

### 🟥 Deferred: Out of Scope

Deferred marks cases moved outside current scope. Not deleted, but not active.

**Examples:**
```
Deferred: Analytics dashboard [V2]
Deferred: Multi-language support [Later]
```

**When something becomes Deferred:**
- During initial scoping
- During planning spiral (too complex)
- During Debrief (deprioritized)

---

### 🟦 Operation: Concrete Feature (Vertical Slice)

Operation cases are **minimum viable features** that work end-to-end. Each Operation spans all layers (DB, API, UI) for one independent feature.

**Vertical slicing principle:**
```
❌ Horizontal (bad):        ✓ Vertical (good):
   "Design all DB schemas"     "View post" (min DB + API + UI)
   "Write all APIs"            "List posts" (min DB + API + UI)
   "Build all UI"              "Create post" (min DB + API + UI)
```

**Example Operation with children:**
```
Operation: View post
├── Task: Create post DB schema
├── Task: GET /posts/[id] API endpoint
└── Task: PostDetail component
```

**Axel's behavior:**
1. Splits Draft into vertical slices (Operation)
2. Ensures each Operation can work independently
3. Applies INVEST criteria
4. Defines acceptance criteria

---

### 🟩 Task: Atomic Unit

Task cases are the smallest implementable units. One Operation splits into multiple Tasks.

**INVEST Criteria:**
- **I**ndependent: Can be done without waiting
- **N**egotiable: Details flexible
- **V**aluable: Produces value alone
- **E**stimable: Size can be estimated
- **S**mall: One session
- **T**estable: Has acceptance criteria

**Example:**
```
Task: Create post DB schema
  Acceptance: posts table exists with id, title, content, createdAt
  Test: Migration runs successfully
```

Task with `status: done` = Completed. Completed is a status, not a separate type.

---

### 🟡 Discovery: Learning/Finding

Discovery cases capture learnings discovered during Task execution. They are created by Curator Cleo when agents emit discovery signals.

**Scope Types:**
| Scope | Created From | Injected Into |
|-------|--------------|---------------|
| `local` | `DISCOVERY_LOCAL` signal | Same agent's prompts |
| `global` | `DISCOVERY_GLOBAL` signal | All agents' prompts |

**Example:**
```
Discovery: rehype requires explicit config for GFM
  Parent: Task task-020 (Setup rehype)
  Scope: global
  Impact: high
```

Discovery cases are always children of the Task that produced them.

---

## Two Types of State Changes

### Transition (same item, type changes)

```
Draft "Auth system"
  │
  └── TRANSITION → Research "Research auth options"
                      │
                      └── TRANSITION → Operation "Clerk integration"
```

### Split (new children created)

```
Operation "Login flow"
  │
  └── SPLIT → Task "Clerk setup"
              Task "Login UI"
              Task "Session handling"
```

| Change Type | When | Example |
|-------------|------|---------|
| Transition | Case refines but stays conceptually one thing | Draft → Research → Operation |
| Split | Case breaks into multiple distinct things | Operation → [Task, Task, Task] |

Note: Discovery creation is neither transition nor split - it's a **byproduct** of Task execution via discovery signals.

---

## Planning Dialogue Model

Planning is not just case generation—it's a structured dialogue between the user and Architect Axel. The process follows 5 distinct phases.

### Why Not Execution Loop for Planning?

| Aspect | Implementation (Execution Loop fits) | Planning (Dialogue fits) |
|--------|--------------------------------------|--------------------------|
| **Nature** | Mechanical iteration | Conversational exchange |
| **Completion** | Objective (tests pass) | Subjective (user satisfied) |
| **Feedback** | Binary (pass/fail) | Nuanced (modify, clarify) |
| **Iteration** | Same action, retry | Different questions each time |
| **User role** | Observer | Active participant |

The Execution Loop is used **only in Phase 5 (VALIDATE)** where mechanical iteration makes sense.

### The 5 Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLANNING DIALOGUE MODEL                               │
│                                                                              │
│   Phase 1        Phase 2        Phase 3        Phase 4        Phase 5       │
│  UNDERSTAND  →   ANALYZE   →   PROPOSE   →  DECOMPOSE  →   VALIDATE        │
│  (Q&A)          (Explore)     (Approval)    (Generate)  (Execution Loop)   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | Purpose | Interaction Style | When Complete |
|-------|---------|-------------------|---------------|
| **1. UNDERSTAND** | Clarify user's goal | Q&A dialogue | User answers or says "you decide" |
| **2. ANALYZE** | Explore codebase context | Axel works autonomously | Context gathered |
| **3. PROPOSE** | Present high-level approach | Approval loop | User approves architecture |
| **4. DECOMPOSE** | Generate atomic Tasks | One-shot generation | Tasks created |
| **5. VALIDATE** | Check Tasks against rules | Execution Loop iteration | All Tasks pass |

---

## Phase 1: UNDERSTAND

Axel asks clarifying questions to fully understand the user's goal before generating anything.

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
| Direct answer | Axel uses the answer for planning |
| "You decide" | Axel makes a reasonable choice and documents it |
| "Skip" | Axel proceeds without this information |
| Ask back | User can ask Axel for recommendations |

---

## Phase 2: ANALYZE

Axel explores the codebase to understand existing patterns, tech stack, and relevant context.

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

Axel proposes a high-level architecture before generating Tasks. User must approve before proceeding.

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
- ~8 Tasks
- ~45 tests
```

### User Actions

| Action | Effect |
|--------|--------|
| **Approve** | Proceed to DECOMPOSE |
| **Modify** | Axel adjusts specific parts |
| **Reject** | Axel creates new proposal with feedback |
| **Ask question** | Axel explains reasoning |

---

## Phase 4: DECOMPOSE

Axel generates atomic Tasks from the approved architecture. This is one-shot generation.

### Task Generation Rules

| Rule | Description |
|------|-------------|
| **Atomic** | One responsibility per Task |
| **Testable** | All criteria verifiable |
| **Context-fit** | Fits in agent context window |
| **Clear dependencies** | Explicit blocker relationships |

---

## Phase 5: VALIDATE (Execution Loop)

The ONLY phase where the Execution Loop pattern applies. Mechanical iteration until all Tasks pass validation.

### Validation Issue Types

| Type | Auto-fixable? | Action |
|------|---------------|--------|
| **Too many criteria** | ✓ | Split Task into sub-Tasks |
| **Circular dependency** | ✓ | Remove weakest link |
| **Missing dependency** | ✓ | Add inferred dependency |
| **Vague criteria** | ✗ | Prompt user for clarification |
| **Context too large** | ✓ | Split Task |
| **Duplicate Task** | ✓ | Merge or remove |

### Convergence Criteria

The validation loop converges when:
1. **All Pass:** Zero validation issues remain
2. **Max Iterations:** Reached max iterations (default: 5)
3. **User Override:** User explicitly approves despite issues
4. **Only Manual Issues:** All remaining issues require user decision

---

## The Planning Spiral

Axel runs a repeated cycle for clarifying Draft cases:

```
1. Read Directive case and Draft cases
     ↓
2. Consistency check
   • Any contradictions?
   • Missing connections?
     ↓
3. For each Draft case:
   • Clear enough? → Operation
   • Research needed? → Research
   • Decision needed? → Pending
   • Can split into Operations?
     ↓
4. Ask necessary questions to user
     ↓
5. Update Draft cases and dependency tree
     ↓
6. Are first Operation cases ready?
   • Yes → Move to implementation
   • No → Return to step 1
```

**Why "spiral" not "loop"?** Each pass produces more refined cases. You're never in the same place twice.

---

## The Implementation Loop

For each Operation case:

```
1. Axel splits Operation into Tasks
     ↓
2. For each Task:
   • INVEST check
   • Write acceptance criteria
   • User can add criteria
     ↓
3. Echo implements Task
     ↓
4. During execution:
   • Discovery signals → Cleo creates Discovery cases
     ↓
5. Verification
   • Pass → Task status: done, Discovery children: archived
   • Fail → Echo continues iterating
     ↓
6. All Tasks done?
   • Yes → Debrief
   • No → Continue to next Task
```

---

## Debrief

After each Operation feature completes (all its Tasks done and merged):

```
Axel runs Debrief:
  1. Query Discovery cases from this Operation's Tasks
  2. Check: Directive case impact?
  3. Revise Draft cases based on discoveries
  4. Update dependency tree
  5. Check: Is Directive satisfied?
     • Yes → Project complete 🎉
     • Partially → Continue to next Operation
     • No → Add new Drafts if needed
```

Debrief is automatic, triggered by Operation completion. Axel queries Discovery cases created during the Operation's Task executions.

---

## PoC as Mini-Cycle

When Research needs working code:

```
Research: Which auth library?
│
│  [Needs code comparison]
│
└── Draft: Compare auth libraries (sub-project)
    │
    ├── Operation: Clerk PoC
    │   └── Task: Basic Clerk login → Echo implements
    │
    ├── Operation: NextAuth PoC
    │   └── Task: Basic NextAuth login → Echo implements
    │
    └── [Results compared, Research resolved]
```

The Research spawns its own mini planning cycle. PoCs are real Tasks that Echo implements.

---

## Dependency Tree

Dependencies form a tree structure:

```
⬛ Directive: "I want a technical blog..."
│
├── ⬜ Draft: Blog post system
│   │
│   ├── 🟧 Research: Markdown parser selection
│   │   └── [Resolved] → 🟦 Operation: rehype rendering
│   │
│   ├── 🟦 Operation: View post
│   │   ├── 🟩 Task: Post DB schema [done]
│   │   │   └── 🟡 Discovery: "Drizzle ORM requires explicit type imports" [local]
│   │   ├── 🟩 Task: GET /posts/[id] API [done]
│   │   │   └── 🟡 Discovery: "Use zod for API validation" [global]
│   │   └── 🟩 Task: PostDetail component
│   │
│   └── ⬜ Draft: Comment system
│       └── 🟪 Pending: [BLOCKER] Self-host or 3rd party?
│
└── 🟥 Deferred: Analytics dashboard [V2 - deferred]
```

Discovery cases are always children of the Task that produced them via discovery signals.

**Dependency Rules:**
1. Research unresolved → downstream Operation/Task cannot start
2. Pending unresolved → that branch cannot progress
3. Draft not split into Operation → Task cannot be created
4. Independent branches → can progress in parallel

---

## Init Mode

Before planning, Analyst Ava examines the project:

| Target | Extracted Info |
|--------|----------------|
| Codebase structure | src/, tests/, lib/ patterns |
| package.json | Scripts, dependencies |
| Test files | Framework, patterns |
| Linter config | Code style rules |

**Init Output:**
- Creates `.axiom/` directory
- Writes `config.json` with detected settings
- Transitions to Planning Mode

---

## JTBD for Existing Projects

For existing projects, Axel adapts:

```
User: "Add wishlist feature to my e-commerce app"
     ↓
Axel: "I'll frame this as a goal:

     When browsing products in your e-commerce app,
     I want to save items to a wishlist,
     so that I can purchase them later without searching again.

     Does this capture your intent?"
     ↓
User: Confirms
     ↓
Axel: Creates Directive with project context
```

**Directive with context:**
```
Directive {
  jtbd: "When..., I want..., so that...",
  projectContext: {
    stack: "Next.js, Prisma, Clerk",
    existingModels: ["User", "Product", "Order"]
  }
}
```

---

## Incremental Planning

Rather than planning all Tasks upfront, AXIOM supports **incremental planning** - creating Tasks just-in-time as implementation progresses.

### Why Incremental Planning?

| Benefit | Description |
|---------|-------------|
| **Reduced waste** | Don't plan Tasks for features that may change |
| **Better accuracy** | Plan with knowledge gained from implementation |
| **Natural flow** | Implementation informs the next planning cycle |
| **Manageable scope** | Avoid overwhelming Task lists |

### Planning Triggers

Planning is triggered when ready Task count drops below threshold (default: 3).

```
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
┌──────────────┐      ┌──────────────┐
│ TRIGGER      │      │ SKIP         │
│ Axel creates │      │ Enough work  │
│ more Tasks   │      │ available    │
└──────────────┘      └──────────────┘
```

### Planning Horizon

Axel plans up to the next **horizon** - a logical stopping point:

| Stop Condition | Example |
|----------------|---------|
| **Milestone boundary** | Complete all M1 Tasks before planning M2 |
| **Feature boundary** | Finish "auth" before planning "notifications" |
| **Uncertainty point** | Stop at Tasks requiring user decisions |
| **Max batch size** | Default 10 Tasks per planning cycle |

### Manual Triggers

| Key | Action | Description |
|-----|--------|-------------|
| `P` | Plan | Trigger incremental planning (only if ready < threshold) |
| `Shift+P` | Force Plan | Force planning even if enough ready Tasks exist |
| `Ctrl+L` | Discovery Review | Review discoveries and their impact |

---

## Spec Lifecycle

Specs are treated as **consumable resources**. As implementation progresses, spec sections are consumed into Tasks.

### Spec States

```
   ┌──────────────┐
   │    draft     │  ← Being discussed with Axel, not finalized
   └──────┬───────┘
          │ User approves or defers
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌──────────┐  ┌──────────┐
│ deferred │  │ partial  │  ← Clarified but postponed / Some Tasks created
└──────────┘  └────┬─────┘
    │              │ More Tasks created
    │ User         │
    │ reactivates  ▼
    │         ┌──────────┐
    └────────▶│ consumed │  ← All Tasks created from this section
              └────┬─────┘
                   │ All Tasks complete (or section no longer needed)
                   ▼
              ┌──────────┐
              │ archived │  ← Moved to specs/archive/
              └──────────┘
```

### State Descriptions

| State | Description | Visibility to Agents |
|-------|-------------|---------------------|
| **draft** | Being discussed with Axel | Full content visible |
| **deferred** | Postponed (not for current sprint) | Hidden from agents |
| **partial** | Some Tasks created, more content remains | Remaining content visible |
| **consumed** | All content converted to Tasks | Collapsed reference only |
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
> 📋 **CONSUMED**: See Tasks task-001, task-002 for details.
```

**Benefits:**
- Reduces context window usage
- Prevents agents from re-reading fully-covered sections
- Partial sections still show remaining uncovered content

### Spec Progress Tracking

Progress tracked in `.axiom/specs/progress.json`:

```json
{
  "specs": {
    "auth-system.md": {
      "sections": [
        {
          "heading": "## User Model",
          "state": "consumed",
          "tasks": ["task-001", "task-002"]
        },
        {
          "heading": "## JWT Service",
          "state": "partial",
          "tasks": ["task-003"]
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

## Case Validation Rules

All cases are validated before implementation begins.

### Built-in Rules (Always Enforced)

| Rule | Description |
|------|-------------|
| **Atomic** | Each Task must have a single responsibility |
| **Testable** | All acceptance criteria must be verifiable |
| **Acyclic** | No circular dependencies allowed |
| **Context-fit** | Task must fit within one agent context window |

### Configurable Rules (`.axiom/case-rules.md`)

```markdown
# Case Rules

## Configurable Limits

| Setting | Value | Description |
|---------|-------|-------------|
| max_acceptance_criteria | 10 | Maximum criteria per Task |
| max_description_length | 500 | Maximum chars for description |

## Optional Rules

- [ ] require_test_file: Require explicit test file reference
- [x] enforce_naming: Pattern `^F\d+[a-z]?: .+`
- [ ] forbidden_words: simple, easy, just, obviously
```

---

## Planning State

Stored in `.axiom/planning-state.json`:

```json
{
  "status": "implementation",
  "chosenMode": "semi-auto",
  "phase": "ready",
  "directiveCase": {
    "id": "case-001",
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
| `planning` | Axel running spiral |
| `implementation` | Echo executing Tasks |

| Phase | Meaning |
|-------|---------|
| `understand` | Phase 1: Q&A with user |
| `analyze` | Phase 2: Codebase exploration |
| `propose` | Phase 3: Architecture approval |
| `decompose` | Phase 4: Task generation |
| `validate` | Phase 5: Execution Loop validation |
| `ready` | All Tasks valid, ready for implementation |
