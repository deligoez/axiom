# Beads Task Tracking Rules

How to track Chorus Phase 4 features via Beads (`bd` CLI).

## Task Creation

```bash
# Create feature task with dependencies
bd create "F01: Config System" \
  -p 1 \
  -l m1-infrastructure \
  --body "$(cat <<'EOF'
## What
Read/write `.chorus/config.json`

## Acceptance Criteria
- [ ] Can load config from file
- [ ] Returns defaults if file doesn't exist
- [ ] Can save config to file
- [ ] Validates config structure
- [ ] 8 tests pass

## Files
- src/types/config.ts
- src/services/ConfigService.ts
- tests/services/ConfigService.test.ts
EOF
)"
```

## Naming Convention

| Prefix | Meaning |
|--------|---------|
| F## | Feature (from plan) |
| BUG | Bug fix |
| CHORE | Non-feature work |

## Labels

| Label | Meaning |
|-------|---------|
| **m-1-xstate** | **Milestone -1: XState Foundation (BLOCKS ALL)** |
| m0-planning | Milestone 0: Planning Phase (Init, Plan Agent, Validation) |
| m1-infrastructure | Milestone 1: Config, State, Worktree |
| m2-agent-prep | Milestone 2: Prompt, Signal, Linking |
| m3-task-mgmt | Milestone 3: Test, Completion, Claim, Close |
| m4-orchestration | Milestone 4: Orchestrator, Semi-Auto, UI |
| m5-merge | Milestone 5: Merge Service |
| m6-parallelism | Milestone 6: Slot Manager |
| m7-autopilot | Milestone 7: Ralph Loop |
| m8-memory | Milestone 8: Learning/Memory System |
| m9-intervention | Milestone 9: Human Intervention |
| m10-rollback | Milestone 10: Rollback & Recovery |
| m11-hooks | Milestone 11: Hooks System |
| m12-tui | Milestone 12: TUI Visualization |
| bug | Bug fix |

Note: Keep labels minimal - just milestone. Use `--status=deferred` for MVP exclusion (not a label).

## Deferred Tasks

Beads supports `deferred` as a native status. Tasks with this status are automatically excluded from `bd ready`:

```bash
# Mark task as deferred (native status)
bd update ch-xxx --status=deferred

# Reactivate deferred task
bd update ch-xxx --status=open

# List deferred tasks
bd list -s deferred -n 0
```

**Note:** `bd ready` automatically excludes deferred tasks - no grep filtering needed.

**Current Deferred Tasks (non-Claude agent support):**
- ch-q1j (F07b) - Non-Claude Context Injection
- ch-jbe (F03c) - Non-Claude CLI Detection
- ch-eyd (F42) - Learning Injector
- ch-djom (F96c) - In-Progress Update Severity Classification
- ch-24qw (F96d) - TUI Notifications for Queued Updates

## Dependencies

```bash
# Add dependency (F04 depends on nothing, F05 depends on F04)
bd create "F05: Worktree Cleanup" --deps ch-xxxx  # where xxxx is F04's ID

# Multiple dependencies
bd create "F15: Orchestrator" --deps ch-xxx,ch-yyy,ch-zzz
```

## TDD Design Requirements

Every task MUST be designed for Test-Driven Development:

### Required in Acceptance Criteria
1. **Explicit test count**: "X tests pass" (not "tests pass")
2. **Testable methods**: Each method/function listed with expected behavior
3. **Edge cases**: Error handling, null returns, empty arrays explicitly stated
4. **No vague criteria**: "Works correctly" → "Returns X when Y"

### Task Structure Checklist
```markdown
## Acceptance Criteria
- [ ] `methodName()` does X           ← Specific behavior
- [ ] `methodName()` returns Y when Z ← Edge case
- [ ] `methodName()` throws on error  ← Error handling
- [ ] N tests pass                    ← Explicit count
```

### AAA Pattern (MANDATORY)

ALL tests MUST follow the **Arrange-Act-Assert** pattern:

```typescript
// REQUIRED: Every test follows this structure
it('should transition from idle to preparing on START', () => {
  // Arrange - Set up the test conditions
  const actor = createActor(agentMachine, {
    input: { taskId: 'task-1', parentRef: mockParentRef }
  });
  actor.start();

  // Act - Perform the action being tested
  actor.send({ type: 'START' });

  // Assert - Verify the expected outcome
  expect(actor.getSnapshot().value).toBe('preparing');
});
```

**XState-Specific Testing Patterns:**

| Test Type | Arrange | Act | Assert |
|-----------|---------|-----|--------|
| **State Transition** | `createActor(machine).start()` | `actor.send({ type: 'EVENT' })` | `getSnapshot().value` |
| **Context Update** | `createActor(machine, { input }).start()` | `actor.send({ type: 'EVENT', data })` | `getSnapshot().context` |
| **Guard Behavior** | Set context that fails guard | `actor.send({ type: 'EVENT' })` | State unchanged |
| **Action Execution** | `vi.fn()` mock for action | `actor.send({ type: 'EVENT' })` | `expect(mock).toHaveBeenCalled()` |
| **Async (Promise)** | `createActor(machine).start()` | `actor.send({ type: 'FETCH' })` | `await waitFor(actor, s => s.matches('done'))` |

**Anti-patterns in Tests:**
```typescript
// BAD - No clear sections
it('test', () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'A' });
  expect(actor.getSnapshot().value).toBe('b');
  actor.send({ type: 'C' });
  expect(actor.getSnapshot().value).toBe('d');
});

// GOOD - Each test has ONE act and ONE assert
it('should transition to B on A', () => {
  // Arrange
  const actor = createActor(machine);
  actor.start();

  // Act
  actor.send({ type: 'A' });

  // Assert
  expect(actor.getSnapshot().value).toBe('b');
});

it('should transition to D on C from B', () => {
  // Arrange
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'A' }); // Get to state B

  // Act
  actor.send({ type: 'C' });

  // Assert
  expect(actor.getSnapshot().value).toBe('d');
});
```

### Anti-patterns to Avoid
| Bad | Good |
|-----|------|
| "Works correctly" | "`parse()` returns Signal object" |
| "Handles errors" | "`run()` throws on non-zero exit" |
| "Tests pass" | "6 tests pass" |
| "Returns result" | "Returns `null` for invalid ID" |
| Multiple acts in one test | One act per test |
| No comments for sections | `// Arrange`, `// Act`, `// Assert` |

### Before Creating/Updating Task
Ask yourself:
1. Can I write a failing test for each criterion?
2. Is the expected behavior specific enough?
3. Are edge cases (null, empty, error) covered?
4. Is the test count accurate?
5. **NEW:** Does each test have clear AAA sections?
6. **NEW:** Is each test testing ONE thing?

---

## Workflow

1. **Pick task**: `bd ready -n 0` shows available tasks (deferred auto-excluded)
2. **Start task**: `bd update <id> --status=in_progress`
3. **TDD**: Write tests → RED → Implement → GREEN → Commit
4. **Complete**: `bd close <id>`
5. **Dependencies auto-unblock**: Dependents become ready

## Progress Check

```bash
bd list -n 0                  # All open tasks
bd ready -n 0                 # Ready to work (deferred auto-excluded)
bd list -s deferred -n 0      # Deferred tasks
bd list -s closed -n 0        # Completed tasks
bd show <id>                  # Task details
```

## Learnings Log

Update this section as you learn:

### 2026-01-12 (Deferred Status Discovery)
- **Beads supports native `deferred` status** - no need for label+grep workaround
- `bd update ch-xxx --status=deferred` marks task as deferred
- `bd ready` automatically excludes deferred tasks
- `bd list -s deferred -n 0` lists all deferred tasks
- Updated 5 tasks from label-only to proper deferred status
- Removed static task ID tables from docs (267 tasks, 256 closed - outdated)
- Documentation now uses dynamic `bd` commands instead of static lists

### 2026-01-11 (Ninth Audit - Comprehensive Task Review)
- **174 tasks reviewed** by 8 parallel agents across all 13 milestones
- **Key Findings:**
  - P0 "incomplete" tasks were false positives (agent output truncated in parallel execution)
  - All 6 reported incomplete tasks (ch-555, ch-6ta, ch-1gi, ch-9yl, ch-a6h, ch-nvo) are fully specified
  - Dependency migration from ch-8j3 to ch-vskx already complete
  - XState TUI architecture correct: ch-89dk (Keyboard Router) → ch-g3of (TUI Machine)
- **AAA Pattern Compliance:**
  - Exemplary: ch-g3of (FX09), ch-lbe7 (FX10), ch-z8g (F82), ch-a0a (F85)
  - M0 Planning: 92% compliant (24/26 tasks)
  - M1-M12: Need restructuring to add explicit Arrange-Act-Assert sections
- **Verified Architecture:**
  - Display components → ch-mzi3 (Migration Bridge) ✓
  - Keyboard Router → ch-g3of (TUI Machine) ✓
  - Key handlers → Keyboard Router (transitive) ✓
- **No Blocking Issues Found**
- **Total Tasks:** 174 (10 M-1 + 164 existing)
- **Ready Tasks:** 1 (ch-lxxb: FX01 XState Setup)
- **Next After FX01:** FX02 Types + FX03 Root Machine + FX04 Agent Machine (parallel)

### 2026-01-11 (XState Migration - v4.0)
- **MAJOR ARCHITECTURE CHANGE:** Migrated from Zustand to XState v5 actor model
- **New Milestone M-1 (XState Foundation):** 10 tasks (FX01-FX10), blocks ALL other milestones
- **Key Decisions:**
  - XState v5 for state management (actor model fits multi-agent orchestration)
  - Hybrid persistence: snapshot + event sourcing fallback
  - Spawned child actors for agents (not invoked)
- **Tasks Created:** ch-lxxb, ch-j321, ch-kjae, ch-qz9m, ch-134l, ch-5gxg, ch-vskx, ch-mzi3, ch-g3of, ch-lbe7
- **Tasks Deferred:** ch-8j3 (OrchestrationStore - replaced by XState)
- **Dependencies Updated:** 7 tasks moved from ch-8j3 → ch-vskx
- **Root Tasks Blocked:** 47 tasks now depend on ch-mzi3 (FX08)
- **Total Tasks:** 174 (10 new M-1 + 164 existing)
- **Ready Tasks:** 1 (ch-lxxb - FX01: XState Setup)
- **Plan Documents:**
  - Master Plan: `thoughts/shared/plans/2026-01-09-chorus-workflow.md` (v4.0)
  - XState Plan: `thoughts/shared/plans/2026-01-11-xstate-migration.md`

### 2026-01-11 (Seventh Audit - M8-M12 Deep Review)
- **92 tasks reviewed** across M8-M12 with 7 parallel review agents
- **Key Conflict Resolution:**
  - 'L' key: ch-u5j (View Learnings) uses 'L', ch-s8u (Learning Review) now uses 'Ctrl+L'
  - 'a' key: No actual conflict - ch-jx9 (Autopilot) and ch-6ta (Approve Merge) are context-dependent
- **Keyboard Router Fix (ch-89dk):**
  - Was incorrectly depending on individual key handlers
  - Now depends on ch-g3of (TUI Machine) for focus/modal state routing
  - Blocks 10 key handlers + Full TUI Integration
- **Verified:** All 52 ready tasks have correct dependencies satisfied
- **Total Tasks:** 164 (52 ready, 3 deferred)

### 2026-01-11 (v3.6)
- Master Plan v3.6: Incremental Planning & Manual Triggers
- NEW: Implementation-Triggered Task Creation (Just-in-Time planning)
- NEW: Planning Horizon concept with stop conditions
- NEW: Spec Lifecycle (Consumed Backlog Pattern) - collapse tasked, archive complete
- NEW: TUI Manual Triggers (P for planning, Ctrl+L for learning review)
- NEW FEATURES CREATED:
  - F98 Incremental Planning Trigger (ch-yhq)
  - F99 Planning Horizon Manager (ch-wqn)
  - F100 Spec Evolution Tracker (ch-2yp)
  - F100a Spec Section Collapser (ch-iru)
  - F100b Spec Archiver (ch-tr4)
  - F101a TUI Learning Review Trigger (ch-s8u)
  - F101b TUI Planning Trigger (ch-fts)
- Total: 7 new tasks in M8/M12

### 2026-01-11 (v3.0-v3.5)
- M0 Planning Phase tasks created (25 tasks)
- m0-planning label added for Planning Phase milestone
- Existing M1 tasks updated with qualityCommands support
- F01a-c, F03b, F07, F10 updated with new requirements
- F89 App Router, F90 CLI Parser, F91 Implementation Mode added
- Total tasks: 127 (102 existing + 25 new)
- **Master Plan Coverage Audit:**
  - F86 (ch-to7): Added `chosenMode` field to state (9 tests)
  - F85 (ch-a0a): Added state transition + F86 dependency (12 tests)
  - F80 (ch-m9y): Added F03b-1 dependency
  - F03b-1 (ch-mdj): Removed unnecessary F01c dependency
  - Ready tasks: 48

### 2026-01-10
- Initial setup complete
- bd v0.46.0 installed via homebrew
- Flag is `--deps` not `--depends`
- Use `-d` or `--description` for short desc, `--body` for full markdown
- `bd ready` shows tasks with no blockers (dependencies satisfied)
- Tasks blocked by deps don't appear in `bd ready`
- Use `bd dep add <blocked> <blocker>` to add deps after creation
- Use `bd dep remove <blocked> <blocker>` to remove deps
- Use `bd blocked` to see all blocked tasks with their blockers
- **IMPORTANT**: If `bd dep remove` doesn't persist, use `bd --no-daemon dep remove`
- Prefix changed from `bd-` to `ch-` (Chorus)
- **FIXED**: F09 does NOT depend on F02b - they are independent (Agent types vs ChorusState)
- **FIXED**: F10 does NOT depend on F01b - TestRunner receives testCommand as constructor arg, caller provides it
- **CLEANED**: Removed `feature` and `critical-path` labels - keep only milestone labels for cleaner output
- **TIP**: Use `bd --no-daemon label remove <id> <label>` if changes don't persist

## Current Task Status

Use `bd` commands to get current task status - static lists get outdated quickly.

```bash
bd status                     # Quick overview
bd ready -n 0                 # Available tasks
bd list -s in_progress -n 0   # In progress
bd list -s deferred -n 0      # Deferred (MVP excluded)
bd blocked                    # Blocked tasks with reasons
bd list -l m8-memory -n 0     # Filter by milestone
```

### Statuses

| Status | Meaning | In `bd ready`? |
|--------|---------|----------------|
| `open` | Not started | Yes (if unblocked) |
| `in_progress` | Being worked on | Yes |
| `blocked` | Has unmet dependencies | No |
| `deferred` | Not for MVP | No |
| `closed` | Completed | No |
