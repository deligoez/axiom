# Workflow Rules

Additional workflow rules for working on AXIOM.

---

## AXIOM-Style Development (Dogfooding)

We build AXIOM using AXIOM's own methodology - manually playing the roles until the system exists.

### Case Hierarchy

```
⬛ Directive (Black)  = docs/ folder (the spec/PRD)
        │
        ▼
⬜ Draft (Grey)       = Milestone planning tasks (PLAN: m1-core, etc.)
        │
        ▼
🟦 Operation (Blue)   = Feature groups (F01: CaseStore, etc.)
        │
        ▼
🟩 Task (Green)       = TDD implementation units
```

### Workflow

1. **Directive exists** - `docs/` folder is our PRD
2. **Extract Draft** - Create `PLAN: <milestone>` task, think through it
3. **Draft → Operations** - Break down into feature tasks (F01, F02, ...)
4. **Operations → Tasks** - If needed, break further into smaller units
5. **Implement** - TDD: RED → GREEN → REFACTOR → COMMIT
6. **Close and continue** - Close task, pick next

### Beads Labels for Case Types

| Case Type | Beads Label | Example |
|-----------|-------------|---------|
| Draft | `plan` | `PLAN: m1-core Implementation` |
| Operation | `m1-core`, `m2-workspace`, etc. | `F01: CaseStore` |
| Task | Same as parent Operation | `F01.1: Store.Create method` |

### Manual Axel Role

Before starting a new milestone:

1. **Read relevant docs** - Understand what's needed
2. **Create Draft task** - `bd create "PLAN: <milestone>" -p 1 -l plan`
3. **Think through** - Dependencies, order, test strategy
4. **Extract Operations** - Create feature tasks with acceptance criteria
5. **Close Draft** - Mark planning complete

### Rule: Everything Through Beads

**ALL work MUST be tracked via Beads tasks:**

- No implementation without a task
- No commits without a task reference `[ax-xxx]`
- Planning work = `PLAN:` prefixed tasks
- Bug fixes = `BUG:` prefixed tasks
- Chores = `CHORE:` prefixed tasks

```bash
# Before ANY work
bd ready -n 0              # Check available tasks
bd update ax-xxx --status=in_progress  # Claim task

# After completing
bd close ax-xxx            # Close task
```

---

## Context Compaction Rules

After a context compaction (session continuation):
1. **Re-read CLAUDE.md** to refresh understanding of project rules
2. **Re-read beads-task-tracking.md** for task workflow rules
3. **Re-read auto-commit.md** for TDD commit rules
4. **Continue from the summary** without asking questions

## Language Rule (MANDATORY)

All project artifacts MUST be in **English**:

- **Beads tasks**: Title, description, body - all in English
- **Code**: Variable names, function names, struct names
- **Comments**: Inline comments, GoDoc, documentation
- **Commit messages**: Title and body
- **Test descriptions**: Test function names and t.Run() strings
- **Error messages**: User-facing and internal errors

This ensures consistency and accessibility across the codebase.

## Bug Task Rules

When starting work on a bug task that was opened for later investigation:
1. **Read the task** - Understand the bug description and context
2. **Research online** - Search for relevant documentation, similar issues, or solutions
3. **Then start implementation** - Begin fixing the bug with research context

## Standing Instruction

"Ben soyleyene kadar hic durmadan, en uygun taski alip devam et"
(Continue without stopping until told, picking the most appropriate task)

Task selection rules:
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
