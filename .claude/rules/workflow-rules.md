# Workflow Rules

Additional workflow rules for working on Chorus.

## Context Compaction Rules

After a context compaction (session continuation):
1. **Re-read CLAUDE.md** to refresh understanding of project rules
2. **Re-read beads-task-tracking.md** for task workflow rules
3. **Re-read auto-commit.md** for TDD commit rules
4. **Continue from the summary** without asking questions

## Language Rule (MANDATORY)

All project artifacts MUST be in **English**:

- **Beads tasks**: Title, description, body - all in English
- **Code**: Variable names, function names, class names
- **Comments**: Inline comments, JSDoc, documentation
- **Commit messages**: Title and body
- **Test descriptions**: `describe()` and `it()` strings
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

- Unexpected behavior (e.g., "CLI requires stdin not args")
- Workarounds for bugs or limitations
- Correct format/syntax when docs are unclear or wrong
- Environment-specific quirks (e.g., "stdin.isTTY is false in node-pty")
- Performance implications discovered during implementation
- Integration patterns that weren't obvious

### Where to Document

| Discovery Type | Document In |
|---------------|-------------|
| Testing patterns | `.claude/rules/e2e-testing.md` |
| Task workflow | `.claude/rules/beads-task-tracking.md` |
| Commit/TDD patterns | `.claude/rules/auto-commit.md` |
| General workflow | `.claude/rules/workflow-rules.md` |
| Project-wide | `CLAUDE.md` (Learnings section) |

### Documentation Format

```markdown
#### N. Short Title (CRITICAL if blocking)

**Problem:** What you encountered
**Solution:** How to fix/workaround
**Why:** Brief explanation

```code example if helpful```
```

### Example

When implementing integration tests, discovered:
- Claude CLI `--print` hangs when prompt is passed as argument
- Solution: Send prompt via stdin instead
- Documented in: `.claude/rules/e2e-testing.md` under "Integration Testing"

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
5. **Run quality checks** - `npm run quality`
6. **Close the task** - `bd close <id>` if all checks pass

### QA Mode Commands

```bash
# Create bug task
bd create "BUG: <description>" -p 2 -l bug --body "..."

# After fix is complete
bd close <id>
```

### QA Test Pattern

```typescript
it("should handle <edge case>", () => {
  // Arrange - setup the problematic scenario

  // Act - trigger the bug

  // Assert - verify correct behavior
});
```
