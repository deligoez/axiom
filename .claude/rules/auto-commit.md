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
# 0. Auto-fix lint issues first
npm run lint:fix

# 1. Tests (already green at this point)
npm run test:run

# 2. TypeScript type check
npm run typecheck

# 3. Lint (Biome)
npm run lint

# 4. Dead code detection (Knip)
npm run knip
```

**All five must pass before committing.**

Quick combined check (after lint:fix):
```bash
npm run lint:fix && npm run quality
```

## Rules

1. **One test at a time**: Write one test, run RED, implement GREEN, repeat. Don't write all tests upfront.
2. **Atomic tests**: Each test should test ONE thing (single assertion focus). Multiple tests per file is fine.
3. **Quality checks on GREEN**: After tests pass, run typecheck + lint before commit
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

**Task ID is required** when working on a Beads task. Format: `[ch-xxxx]`

**CRITICAL: No AI traces in commits**
- Do NOT add `Co-Authored-By: Claude` or similar AI attribution
- Do NOT mention "AI", "Claude", "GPT" in commit messages
- Commits should look like normal human commits

## Examples

```bash
# After adding new feature with tests
feat: add CLI argument parsing [ch-nrr]

- Parse --version and --help flags
- 5 passing tests

# After fixing a bug with test
fix: handle empty input in parser [ch-mpl]

- Return default values for empty args
- 6 passing tests

# After refactoring (tests still green)
refactor: extract validation logic [ch-wk8]

- Move validation to separate function
- 6 passing tests (unchanged)

# Chore without task (rare)
chore: update gitignore

- Add .perles/ to ignored files
```

## Why This Matters

- Small, frequent commits = easy to bisect bugs
- Each commit is a known-good state
- Rollback granularity when things break
- Clear history of TDD progression
