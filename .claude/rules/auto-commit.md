# Auto-Commit Rule

**CRITICAL: NEVER ask for permission to commit. Just do it.**

When committing changes, commit immediately without asking. This applies to ALL commits, not just TDD.

## Pattern

```
RED → GREEN → COMMIT → REFACTOR (if needed) → repeat
```

## Rules

1. **Commit on GREEN**: After tests pass, commit immediately
2. **NEVER ask permission**: Don't ask "shall I commit?" or "Shall I proceed?" - JUST DO IT
3. **Conventional commits**: Use `feat:`, `fix:`, `test:`, `refactor:` prefixes
4. **Atomic commits**: Each commit = one logical unit of work
5. **Include test count**: Mention passing tests in commit message

## CRITICAL: No Permission Prompts (survives /clear)

For ALL commits (TDD or otherwise):
- Do NOT ask "I plan to create N commits, shall I proceed?"
- Do NOT ask "Ready to commit?" or similar
- Do NOT ask "Devam edeyim mi?" or any Turkish equivalent
- Do NOT wait for user confirmation
- Do NOT present a "commit plan" and ask for approval
- JUST RUN `git add` and `git commit` immediately
- Then continue working on the next task

## Commit Message Format

```
<type>: <short description>

- What was added/changed
- Test count: X passing tests
```

## Examples

```bash
# After adding new feature with tests
feat: add CLI argument parsing

- Parse --version and --help flags
- 5 passing tests

# After fixing a bug with test
fix: handle empty input in parser

- Return default values for empty args
- 6 passing tests

# After refactoring (tests still green)
refactor: extract validation logic

- Move validation to separate function
- 6 passing tests (unchanged)
```

## Why This Matters

- Small, frequent commits = easy to bisect bugs
- Each commit is a known-good state
- Rollback granularity when things break
- Clear history of TDD progression
