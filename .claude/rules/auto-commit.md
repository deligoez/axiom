# Auto-Commit Rule

**CRITICAL: NEVER ask for permission to commit. Just do it.**

When committing changes, commit immediately without asking. This applies to ALL commits, not just TDD.

When practicing TDD, commit automatically after quality checks pass.

## Pattern

```
RED → GREEN → QUALITY CHECKS → COMMIT → REFACTOR (if needed) → repeat
```

## Quality Checks (After Tests Pass)

Run these commands in order after tests are GREEN:

```bash
# 1. Tests
go test ./...

# 2. Format (auto-fix, always run)
gofmt -w .

# 3. Lint (golangci-lint)
golangci-lint run

# 4. Build (ensure it compiles)
go build ./...
```

**All must pass before committing.**

Quick combined check:
```bash
go test ./... && gofmt -w . && golangci-lint run && go build ./...
```

**PHP/Laravel karşılığı:**
| Go | PHP |
|----|-----|
| `go test` | `phpunit` |
| `gofmt` | `php-cs-fixer fix` |
| `golangci-lint` | `phpstan analyse` |
| `go build` | (PHP interpreted, no build) |

## Rules

1. **One test at a time**: Write one test, run RED, implement GREEN, repeat. Don't write all tests upfront.
2. **Atomic tests**: Each test should test ONE thing (single assertion focus). Multiple tests per file is fine.
3. **Quality checks on GREEN**: After tests pass, run lint before commit
4. **NEVER ask permission**: Don't ask "shall I commit?" or "Shall I proceed?" - JUST DO IT
5. **Conventional commits**: Use `feat:`, `fix:`, `test:`, `refactor:` prefixes
6. **Atomic commits**: Each commit = one logical unit of work
7. **Include test count**: Mention passing tests in commit message

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
<type>: <short description> [task-id]

- What was added/changed
- Test count: X passing tests
```

**Task ID is required** when working on a Beads task. Format: `[ax-xxxx]`

**CRITICAL: No AI traces in commits**
- Do NOT add `Co-Authored-By: Claude` or similar AI attribution
- Do NOT mention "AI", "Claude", "GPT" in commit messages
- Commits should look like normal human commits

## Examples

```bash
# After adding new feature with tests
feat: add CLI argument parsing [ax-001]

- Parse --version and --help flags
- 5 passing tests

# After fixing a bug with test
fix: handle empty input in parser [ax-002]

- Return default values for empty args
- 6 passing tests

# After refactoring (tests still green)
refactor: extract validation logic [ax-003]

- Move validation to separate function
- 6 passing tests (unchanged)

# Chore without task (rare)
chore: update gitignore

- Add Go build artifacts to ignored files
```

## Why This Matters

- Small, frequent commits = easy to bisect bugs
- Each commit is a known-good state
- Rollback granularity when things break
- Clear history of TDD progression
