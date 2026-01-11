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
# 1. Tests (already green at this point)
npm run test:run

# 2. TypeScript type check
npm run typecheck

# 3. Lint (Biome)
npm run lint

# 4. Dead code detection (Knip)
npm run knip
```

**All four must pass before committing.** If lint has auto-fixable issues, run `npm run lint:fix` first.

Quick combined check (single command):
```bash
npm run quality
```

## Rules

1. **Quality checks on GREEN**: After tests pass, run typecheck + lint before commit
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
<type>: <short description> [task-id]

- What was added/changed
- Test count: X passing tests
```

**Task ID is required** when working on a Beads task. Format: `[ch-xxxx]`

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
