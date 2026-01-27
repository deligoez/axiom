# Workflow Rules

Additional workflow rules for working on AXIOM.

---

## AXIOM-Style Development (Dogfooding)

We build AXIOM using AXIOM's own methodology - manually playing the roles until the system exists.

### Core Philosophy (MANDATORY)

**"Take small steps, learn from each one, update the plan."**

### Meta-Rule: When in Doubt, Act Like AXIOM

When unsure how to proceed, ask: "What would AXIOM do?"
- Small steps over big plans
- Learn and adapt over predict and commit
- Working software over comprehensive documentation
- Vertical slices over horizontal layers

### MVP / Vertical Slice Approach (MANDATORY)

**NEVER do Big Design Up Front.** Always:

1. **Start from UI** - What do we want to SEE?
2. **Minimum infrastructure** - Only build what's needed for that UI
3. **Iterate** - See it working, then decide next slice

**Wrong (Horizontal Layers):**
```
Types → CaseStore → Config → Workspace → Agent → ... → UI
                                                      ↑
                                        (months later, finally see something)
```

**Right (Vertical Slices):**
```
"I want to see X in UI"
       ↓
What's the minimum to show X?
       ↓
Build only that (UI → Backend → Persistence)
       ↓
See it working
       ↓
"Now I want to see Y" → repeat
```

### Grey Task Naming for MVP

Instead of infrastructure-focused Grey tasks:
- ❌ `PLAN: m1-core` (Types, CaseStore, Config)
- ❌ `PLAN: m2-workspace` (Git worktrees)

Use feature/outcome-focused Grey tasks:
- ✅ `PLAN: MVP - Walking Skeleton` (See a web page)
- ✅ `PLAN: MVP - Task List` (See tasks in UI)
- ✅ `PLAN: MVP - Create Task` (Add task via UI)

### Case Hierarchy

```
⬛ Directive (Black)  = docs/ folder (the spec/PRD)
        │
        ▼
⬜ Draft (Grey)       = High-level planning (one at a time)
        │
        ▼
🟦 Operation (Blue)   = ATOMIC feature (smallest deliverable feature)
        │
        ▼
🟩 Task (Green)       = ATOMIC implementation step (TDD unit)
```

### Atomicity Rules

**Blue (Operation) = Smallest Deliverable Feature:**
- Can be demoed or tested independently
- Has clear "done" criteria
- Provides value on its own (even if small)
- Example: "Config file loading" not "Config system"

**Green (Task) = Smallest TDD Step:**
- ONE test + ONE implementation
- Should take < 30 minutes
- Single responsibility
- Example: "Load() returns error on missing file" not "Load config"

### TDD Format for Green Tasks

Each Green task body MUST include:

```markdown
## Test Case
`TestFunctionName_Scenario`

## Expected Behavior
When [condition], should [result]

## Acceptance
- [ ] Test written and RED
- [ ] Implementation GREEN
- [ ] Committed
```

### Test Coverage Rules

**MANDATORY:**
- Every Green task with logic = has test(s)
- Happy path + at least 1 edge case per function
- Error conditions tested explicitly

**Edge Cases to Consider:**
- Empty input / nil
- Invalid input
- Boundary values
- Error returns

**Go Test Style:**

```go
func TestFunctionName_Scenario(t *testing.T) {
    // Arrange
    input := ...

    // Act
    result, err := Function(input)

    // Assert
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if result != expected {
        t.Errorf("got %v, want %v", result, expected)
    }
}
```

### Deliberate Workflow (MANDATORY)

**Each level requires discussion before creating the next level.**

#### Step 1: Grey (Draft) Extraction
1. Look at Directive (docs/)
2. **DISCUSS** what the first Grey task should be
3. Create ONE Grey task after agreement
4. Mark Grey as in_progress

#### Step 2: Grey → Blue Discussion
1. Read and understand the Grey task
2. **DISCUSS** what Blue tasks should come from it
3. Agree on Blue tasks and their order
4. Create Blue tasks
5. Close Grey task

#### Step 3: Blue → Green Discussion
1. Pick ONE Blue task
2. **DISCUSS** what Green tasks should come from it
3. Agree on Green tasks with acceptance criteria
4. Create Green tasks
5. Mark Blue as in_progress

#### Step 4: Green Implementation
1. Implement ALL Green tasks under current Blue (TDD)
2. Each Green: RED → GREEN → COMMIT
3. Close each Green when done

#### Step 5: Review (MANDATORY after each Blue)

After closing a Blue task, ALWAYS do this review:

1. **Task Review:**
   ```bash
   bd list -t epic -n 0    # Grey tasks (milestones)
   bd list -t feature -n 0 # Blue tasks (features)
   bd ready -n 0           # What's next?
   ```

2. **Progress Review:**
   ```bash
   cat PROGRESS.md         # Milestone status
   ```

3. **Update PROGRESS.md** if milestone status changed

4. **Decide next step:**
   - More Blues under current Grey? → Create next Blue
   - Grey complete? → Close Grey, update PROGRESS.md
   - New Grey needed? → Discuss and create

### Beads Task Types for Colors (MANDATORY)

| Renk | Beads Type | Prefix | Label | Parent |
|------|------------|--------|-------|--------|
| ⬜ Grey | `epic` | `PLAN:` | milestone | - |
| 🟦 Blue | `feature` | `F##:` | milestone | Grey ID |
| 🟩 Green | `task` | `F##.#:` | milestone | Blue ID |

**Creation Commands:**

```bash
# Grey (Epic)
bd create "PLAN: m1-core" -t epic -l m1-core -p 1

# Blue (Feature) - parent is Grey
bd create "F01: Config Load" -t feature -l m1-core --parent ax-xxx -p 1

# Green (Task) - parent is Blue
bd create "F01.1: Load returns error on missing file" -t task -l m1-core --parent ax-yyy -p 1
```

**Filtering by Color:**

```bash
bd list -t epic      # All Grey tasks
bd list -t feature   # All Blue tasks
bd list -t task      # All Green tasks
```

**Hierarchy Query:**

```bash
bd show ax-xxx       # Shows children
bd tree ax-xxx       # Shows full tree
```

### Rule: Everything Through Beads

**ALL work MUST be tracked via Beads tasks:**

- No implementation without a task
- No commits without a task reference `[ax-xxx]`
- Planning work = `PLAN:` prefixed tasks
- Bug fixes = `BUG:` prefixed tasks
- Chores = `CHORE:` prefixed tasks

### Rule: No Premature Task Creation

**NEVER create next-level tasks without discussion:**

- Don't create Blues until Grey is discussed
- Don't create Greens until Blue is discussed
- Each level = conversation first, then task creation

---

## Developer Context

**User Profile:** Senior developer, learning Go.

**Explanation Style:**
- Senior-level depth (no hand-holding)
- Focus on Go idioms and best practices
- Explain "why" only when non-obvious

---

## TLDR-First Rule (MANDATORY)

**Always use TLDR before directly reading files.**

When exploring code or searching for information:

```bash
# Search for patterns
tldr search "pattern" path/

# Get file structure
tldr structure path/ --lang go

# Get context for a function
tldr context function_name --project .
```

**Why:** TLDR provides 95% token savings compared to raw file reads. It gives structured context with call graphs, docstrings, and relationships.

**Only read files directly when:**
- You need to see exact implementation details
- TLDR output isn't sufficient for the task
- Making edits (must read before Edit tool)

---

## Context Compaction Rules

After a context compaction (session continuation):
1. **Re-read CLAUDE.md** to refresh understanding of project rules
2. **Re-read beads-task-tracking.md** for task workflow rules
3. **Re-read auto-commit.md** for TDD commit rules
4. **Continue from the summary** without asking questions

## Language Rules (MANDATORY)

### Project Artifacts: English

All project artifacts MUST be in **English**:

- **Beads tasks**: Title, description, body - all in English
- **Code**: Variable names, function names, struct names
- **Comments**: Inline comments, GoDoc, documentation
- **Commit messages**: Title and body
- **Test descriptions**: Test function names and t.Run() strings
- **Error messages**: User-facing and internal errors

This ensures consistency and accessibility across the codebase.

### User Communication: Turkish

Communicate with the user in **Turkish** during the session:

- Explanations, questions, status updates in Turkish
- Only project artifacts (code, docs, tasks, commits) in English
- This does NOT apply to generated code or documentation

## Bug Task Rules

When starting work on a bug task that was opened for later investigation:
1. **Read the task** - Understand the bug description and context
2. **Research online** - Search for relevant documentation, similar issues, or solutions
3. **Then start implementation** - Begin fixing the bug with research context

## Implementation Gate Rule (CRITICAL)

**NEVER start implementation without explicit user approval.**

### What This Means

1. **Grey (PLAN) tasks**: Can be worked on (research, design, documentation)
2. **Blue (F) tasks**: Can be CREATED but NOT IMPLEMENTED without approval
3. **Green tasks**: Can be CREATED but NOT IMPLEMENTED without approval

### Workflow

```
1. User gives goal
2. Create/update Grey (PLAN) task
3. Design solution in Grey task
4. ASK USER: "Blue task'ları oluşturayım mı?"
5. User approves → Create Blue tasks
6. ASK USER: "Implementasyona geçeyim mi?"
7. User approves → Implement
```

### What Requires Approval

| Action | Needs Approval? |
|--------|-----------------|
| Creating PLAN tasks | No |
| Working on PLAN tasks (research, design) | No |
| Creating Blue/Green tasks | Yes |
| Starting implementation (writing code) | Yes |
| Running tests on existing code | No |
| Committing implemented code | No (auto-commit rule) |

### Exception: Explicit Standing Instruction

If user explicitly says "devam et" or "implement et", then continue until:
- That specific task is done, OR
- User says stop

**Default mode is ALWAYS ask before implementing.**

## Task Selection Rules (When Approved to Implement)

When user has approved implementation:
1. **P0 > P1 > P2** - Priority order
2. **Fastest completion** - Among same priority, pick quickest to complete
3. **Independent over chain-starter** - If task A starts a chain but B is independent, prefer B (quick win)

## Key Discovery Documentation Rule (MANDATORY)

**When completing any task, if you discover critical technical information that could help future work, you MUST document it in the relevant rules file.**

### What Counts as a Key Discovery

- Unexpected behavior (e.g., "exec.Command requires absolute path")
- Workarounds for bugs or limitations
- Correct format/syntax when docs are unclear or wrong
- Environment-specific quirks
- Performance implications discovered during implementation
- Integration patterns that weren't obvious

### Where to Document

| Discovery Type | Document In |
|---------------|-------------|
| Task workflow | `.claude/rules/beads-task-tracking.md` |
| Commit/TDD patterns | `.claude/rules/auto-commit.md` |
| General workflow | `.claude/rules/workflow-rules.md` |
| Project-wide | `CLAUDE.md` |

### Documentation Format

```markdown
#### N. Short Title (CRITICAL if blocking)

**Problem:** What you encountered
**Solution:** How to fix/workaround
**Why:** Brief explanation

```code example if helpful```
```

**This rule ensures knowledge is preserved across sessions and helps future agents avoid the same pitfalls.**

## QA Mode

QA testing operates in **discussion mode by default**. Discuss issues, explore options, and get user input before taking action.

### Discussion Mode (Default)
- Analyze reported issues
- Explore the codebase to understand the problem
- Discuss options and alternatives with the user
- **DO NOT** create tasks automatically
- **DO NOT** start implementing fixes

### Implementation Mode (On Request)
Only when user explicitly says **"task aç"** (create task):

1. **Create Beads task** - `bd create "BUG: <description>" -p 2 -l bug`
2. **Write failing test first** (RED) - TDD approach
3. **Confirm test fails** - Run the test to verify it catches the bug
4. **Fix the issue** (GREEN) - Implement the fix
5. **Run quality checks** - `go test ./... && golangci-lint run`
6. **Close the task** - `bd close <id>` if all checks pass

### QA Test Pattern (Go)

```go
func TestSomething(t *testing.T) {
    t.Run("should handle edge case", func(t *testing.T) {
        // Arrange - setup the problematic scenario

        // Act - trigger the bug

        // Assert - verify correct behavior
    })
}
```

### Unimplemented Feature Rule (MANDATORY)

**When encountering an unimplemented feature during QA testing, create a planning task:**

1. **Identify** - Note which feature is missing
2. **Create Planning Task** - Use format: `PLAN: <Feature Name> Implementation`
3. **Task Body** - Include:
   - What the feature should do
   - Where it's referenced (docs, etc.)
   - Affected files (likely locations)
   - Dependencies on other features

```bash
bd create "PLAN: <Feature Name> Implementation" -p 2 -l <milestone> --body "$(cat <<'EOF'
## What
<Brief description of the feature>

## References
- Docs reference: <where documented>
- QA test found: <where discovered>

## Likely Files
- internal/package/file.go
- internal/package/file_test.go

## Dependencies
- Requires: <other features if any>
- Blocks: <features that need this>

## Planning Scope
This task is for PLANNING the implementation:
- [ ] Identify all code changes needed
- [ ] Break down into subtasks
- [ ] Estimate test count
- [ ] Create implementation tasks
EOF
)"
```

**Why:** This ensures no feature is forgotten and implementation is properly planned before coding.

---

## Tmux-Based Agent Rule (CRITICAL)

**Use tmux send-keys for persistent Claude CLI interaction.**

### Why

Claude CLI uses ink-based custom input widget:
1. **PTY stdin doesn't work** - Characters appear but don't submit
2. **`-p` flag exits after response** - Can't maintain persistent conversation
3. **tmux send-keys WORKS** - Based on Gastown's production-tested pattern

### Correct Approach

Use **tmux-based session management**:
- Create tmux session with Claude CLI running
- Send messages via `tmux send-keys -l` (literal mode)
- Add debounce delay (100ms) between text and Enter
- Capture output via `tmux capture-pane`

### Code Pattern

```go
// Create session
session := tmux.NewClaudeSession("agent-name", workDir)
session.Start(systemPrompt)
session.WaitForPrompt(30 * time.Second)

// Send messages (multi-turn, context preserved)
session.SendMessage("First question")
session.SendMessage("Follow-up question")

// Cleanup
session.Stop()
```

### tmux send-keys Pattern (from Gastown)

```go
// 1. Send text using literal mode (-l) to handle special chars
t.run("send-keys", "-t", session, "-l", message)

// 2. Debounce - wait for paste to be processed
time.Sleep(100 * time.Millisecond)

// 3. Send Enter separately - more reliable
t.run("send-keys", "-t", session, "Enter")
```

### Historical Context

MVP-07 discovered that PTY stdin doesn't work with Claude CLI's ink-based input.
GitHub issue #15553 documents the same problem. Solution: tmux send-keys (Gastown pattern).
