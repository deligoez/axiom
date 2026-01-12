# Chorus

Multi-agent TUI orchestrator using Ink (React for CLI) with XState v5 actor model.

## Task Workflow

```bash
# 1. Pick a task
bd ready -n 0
bd show <id>  # View details + check "Blocks" section

# 2. Start working
bd update <id> --status=in_progress

# 3. Work (TDD: RED → GREEN → quality → commit)
#    Commit format: "feat: description [ch-xxxx]"

# 4. Complete
bd close <id>  # Unblocks dependents
bd sync        # Sync with git (optional)
```

**Task Selection Rules (in order):**
1. **Priority first:** P0 > P1 > P2
2. **Fastest completion:** Among same priority, pick the one that completes fastest
3. **Independent over chain-starter:** If task A starts a chain of dependent tasks but task B can be completed independently, prefer B first (quick win)
4. **Check test count:** Lower test count often = faster completion

## Quality Pipeline

```bash
npm run quality   # Runs all checks:
# 1. npm run test:run   - Vitest
# 2. npm run typecheck  - TypeScript strict
# 3. npm run lint       - Biome
# 4. npm run knip       - Dead code detection
```

**TDD Pattern:** `RED → GREEN → npm run quality → COMMIT`

## Beads Commands

| Command | Purpose |
|---------|---------|
| `bd ready -n 0` | List available tasks |
| `bd update <id> --status=in_progress` | Start task |
| `bd close <id>` | Complete task (unblocks dependents) |
| `bd sync` | Sync with git |
| `bd list -l <label> -n 0` | List by milestone |
| `bd blocked` | See blocked tasks |
| `bd show <id>` | Task details |

## Milestones

| Label | Milestone |
|-------|-----------|
| **m-1-xstate** | XState Foundation (BLOCKS ALL) |
| m0-planning | Planning Phase |
| m1-infrastructure | Config, State, Worktree |
| m2-agent-prep | Prompt, Signal, Linking |
| m3-task-mgmt | Test, Completion, Claim |
| m4-orchestration | Orchestrator, Semi-Auto |
| m5-merge | Merge Service |
| m6-parallelism | Slot Manager |
| m7-autopilot | Ralph Loop |
| m8-memory | Learning/Memory |
| m9-intervention | Human Intervention |
| m10-rollback | Rollback & Recovery |
| m11-hooks | Hooks System |
| m12-tui | TUI Visualization |

## Key Files

| File | Purpose |
|------|---------|
| `thoughts/shared/plans/2026-01-09-chorus-workflow.md` | Master Plan (v5.1 - includes XState & Review) |
| `.claude/rules/beads-task-tracking.md` | Task tracking rules |
| `.claude/rules/auto-commit.md` | TDD commit rules |

> **Note:** Master plans in `thoughts/shared/plans/` are large files. Don't read at conversation start. When stuck or need architectural decisions, search first (`grep`) before reading full files to save context.

## Architecture (XState v5)

```
┌─────────────────────────────────────────────────────────┐
│                   CHORUS ROOT MACHINE                    │
│                     type: 'parallel'                     │
├─────────────────────────────────────────────────────────┤
│  orchestration │ mergeQueue │ monitoring │    TUI       │
├─────────────────────────────────────────────────────────┤
│              SPAWNED CHILD ACTORS: AgentMachine × n     │
└─────────────────────────────────────────────────────────┘
```

## Key Decisions

1. **State Management:** XState v5 actor model
2. **Crash Recovery:** Snapshot + event sourcing fallback
3. **Agent Model:** Spawned child actors
4. **Test Pattern:** AAA (Arrange-Act-Assert) mandatory
5. **MVP Scope:** Claude-only

## Learnings

Document important task-applicable findings here (only truly universal insights):

- **XState sendTo vs direct send:** `sendTo` action requires full XState actor ref with `_send` method. For mocked parents in tests, use direct `context.parentRef.send()` in actions instead.
- **Type-only imports in tests:** Vitest may pass even if type files don't exist because `import type` is erased at runtime. Always run `npm run typecheck` to catch missing types.

## Testing Patterns

**AAA Pattern (mandatory):**
```typescript
it('should transition from idle to preparing on START', () => {
  // Arrange
  const actor = createActor(machine).start();

  // Act
  actor.send({ type: 'START' });

  // Assert
  expect(actor.getSnapshot().value).toBe('preparing');
});
```

**XState Testing Patterns:**

| Test Type | Arrange | Act | Assert |
|-----------|---------|-----|--------|
| State Transition | `createActor(machine).start()` | `actor.send({ type: 'EVENT' })` | `getSnapshot().value` |
| Context Update | `createActor(machine, { input })` | `actor.send({ type: 'EVENT', data })` | `getSnapshot().context` |
| Guard Behavior | Set context that fails guard | `actor.send({ type: 'EVENT' })` | State unchanged |
| Final State | Navigate to final state | Check status | `getSnapshot().status === 'done'` |

## Skipped Test Policy

**When you skip a test with `it.skip()`, you MUST create a bug task immediately:**

```bash
bd create "BUG: <brief description of why test is skipped>" -p 3 -l <milestone> --body "..."
```

**Bug task must include:**
- Which test(s) are skipped and file:line locations
- Root cause explanation
- Possible solutions
- Acceptance criteria: "Remove `.skip` from test method"

**Reference the task in the skip comment:**
```typescript
// SKIPPED: <reason> - see ch-xxxx
it.skip("test description", async () => {
```

**Current skipped tests with tasks:**
| File | Test | Bug Task |
|------|------|----------|
| `beads-cli.e2e.test.ts` | 6 tests (no-db mode) | ch-5imz |
| `fresh-init.e2e.test.ts` | file watcher flaky | ch-211i |
| `e2e-helpers.test.ts` | hasExited timing | ch-a2zx |
