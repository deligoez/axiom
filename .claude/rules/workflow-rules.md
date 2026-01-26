# Workflow Rules

Additional workflow rules for working on AXIOM.

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
