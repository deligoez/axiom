# E2E Testing Rules

Guidelines for writing E2E tests for Chorus TUI (Ink-based CLI app).

## Key Principles

1. **All `useInput` hooks MUST have TTY check** - Prevents "Raw mode is not supported" error
2. **Test projects need both `.beads/` and `.chorus/` directories** - App routes based on these
3. **Use `--mode semi-auto` flag** - Forces app to implementation mode
4. **Beads loading is async** - Use `waitForText()` to wait for content

## The Raw Mode Problem

Ink's `useInput` hook requires raw mode on stdin. In E2E tests (using cli-testing-library), there's no TTY, so raw mode fails:

```
ERROR Raw mode is not supported on the current process.stdin
```

### Solution: Add TTY Check to ALL useInput Hooks

```typescript
// CORRECT - Has TTY check
const getIsTTY = () => Boolean(process.stdin?.isTTY);

useInput(
  (input, key) => {
    // handle input
  },
  { isActive: getIsTTY() },
);

// ALSO CORRECT - For hooks with isActive parameter
useInput(
  (input, key) => {
    // handle input
  },
  { isActive: isActive && getIsTTY() },  // Combine with caller's isActive
);
```

### Files That Need TTY Check

When adding new components or hooks with `useInput`, ALWAYS include the TTY check:

- Components: `src/components/*.tsx`
- Hooks: `src/hooks/use*.ts`
- Modes: `src/modes/*.tsx`

## E2E Test Fixtures

### createTestProject()

Located in `src/test-utils/e2e-fixtures.ts`. Creates temp directory with:
- `.beads/issues.jsonl` - Test beads/tasks
- `.chorus/` - Empty directory to skip init wizard

```typescript
const projectDir = createTestProject([
  { id: "ch-test1", title: "Test Task", status: "open" },
]);
```

### renderApp()

Located in `src/test-utils/e2e-helpers.ts`. Renders app with:
- `--ci` flag for non-interactive mode
- `--mode semi-auto` flag (added automatically) for implementation mode

```typescript
const result = await renderApp([], projectDir);
```

## App Routing for E2E Tests

App routes based on:
1. CLI flags (`--mode`, `--ci`)
2. Directory existence (`.chorus/`)
3. Saved state in `.chorus/planning-state.json`

For E2E tests targeting ImplementationMode:
1. Create `.chorus/` directory (via createTestProject)
2. Pass `--mode semi-auto` (automatic via renderApp)
3. App will render ImplementationMode with task panel + agent grid

## Waiting for Content

Beads are loaded asynchronously via useEffect. Use `waitForText()`:

```typescript
// Wait for task to appear (async loading)
await waitForText(result, "Test Task", 5000);

// Then interact with app
await pressKey(result, "i");  // Open intervention menu
```

## Known Limitations

1. **Keyboard input in tests** - useInput is disabled when no TTY, so keyboard handling relies on cli-testing-library's `userEvent.keyboard()` which may have limitations
2. **TUI text wrapping** - Task titles wrap across lines in narrow columns (see below)
3. **Timing sensitivity** - E2E tests can be flaky; use appropriate timeouts

## TUI Text Wrapping Problem (CRITICAL)

The TUI layout has fixed-width columns (~22 chars for task panel). Long text wraps across multiple lines, breaking assertions:

```
// TUI renders "First Test Task" as:
┌──────────────────────┐
│ → First Test         │
│   Task               │  <-- title continues on next line
└──────────────────────┘
```

**NEVER wait for or assert on full task titles.** They WILL break.

### Solution: Use Headers and Short IDs

```typescript
// ❌ WRONG - Will timeout because title wraps
await waitForText(result, "First Test Task", 5000);
expect(output).toContain("First Test Task");

// ✅ CORRECT - Wait for reliable header, assert via short ID
await waitForText(result, "Tasks (1)", 5000);
expect(output).toContain("tst1");  // Short ID from "ch-tst1"
```

### Reliable Markers for E2E Tests

| Marker | Example | Use For |
|--------|---------|---------|
| **Header count** | `Tasks (3)` | Wait for beads to load |
| **Short ID** | `abc1` (from `ch-abc1`) | Identify specific task |
| **Status indicator** | `→` `●` `✓` `⊗` | Verify task status |
| **App title** | `CHORUS` | Verify app rendered |

### Status Indicators

| Indicator | Status | Description |
|-----------|--------|-------------|
| `→` | open | Pending task |
| `●` | in_progress | Running task |
| `✓` | closed | Completed task |
| `⊗` | blocked | Blocked task |

### createStatusBead Helper

Use `createStatusBead()` for creating tasks with specific statuses:

```typescript
import { createStatusBead, createTestProject } from "../test-utils/e2e-fixtures.js";

projectDir = createTestProject([
  createStatusBead("ch-abc1", "First Task", "open"),
  createStatusBead("ch-abc2", "Running Task", "in_progress"),
  createStatusBead("ch-abc3", "Done Task", "closed"),
  createStatusBead("ch-abc4", "Blocked Task", "blocked"),
]);
```

### normalizeOutput Helper

For complex assertions, use `normalizeOutput()` to collapse whitespace:

```typescript
import { normalizeOutput, getOutput } from "../test-utils/e2e-helpers.js";

const output = getOutput(result);
const normalized = normalizeOutput(output);
// Now "First Test\nTask" becomes "First Test Task"
```

## Common Patterns

### Testing Keyboard Shortcuts

```typescript
it("pressing key does not crash", async () => {
  // Arrange
  projectDir = createTestProject([
    createStatusBead("ch-abc1", "Task Name", "open"),
  ]);
  const result = await renderApp([], projectDir);
  await waitForText(result, "Tasks (1)", 5000);  // Wait for header, NOT task title

  // Act
  await pressKey(result, "b");

  // Assert - verify app still renders (use short ID, not title)
  const output = getOutput(result);
  expect(output).toContain("abc1");  // Short ID
});
```

### Testing Task Display

```typescript
it("shows tasks with correct statuses", async () => {
  // Arrange
  projectDir = createTestProject([
    createStatusBead("ch-tst1", "First Task", "open"),
    createStatusBead("ch-tst2", "Second Task", "in_progress"),
    createStatusBead("ch-tst3", "Third Task", "closed"),
  ]);

  // Act
  const result = await renderApp([], projectDir);
  await waitForText(result, "Tasks (3)", 5000);  // Wait for header count

  // Assert - use short IDs and status indicators
  const output = getOutput(result);
  expect(output).toContain("tst1");  // Short ID
  expect(output).toContain("tst2");
  expect(output).toContain("tst3");
  expect(output).toContain("→");    // open indicator
  expect(output).toContain("●");    // in_progress indicator
  expect(output).toContain("✓");    // closed indicator
});
```

### Testing Task Stats

```typescript
it("displays task statistics", async () => {
  // Arrange
  projectDir = createTestProject([
    createStatusBead("ch-st1", "Open Task", "open"),
    createStatusBead("ch-st2", "Running Task", "in_progress"),
    createStatusBead("ch-st3", "Done Task", "closed"),
  ]);

  // Act
  const result = await renderApp([], projectDir);
  await waitForText(result, "Tasks (3)", 5000);

  // Assert - stats text is reliable (not affected by wrapping)
  const output = getOutput(result);
  expect(output).toContain("1 done");
  expect(output).toContain("1 running");
  expect(output).toContain("1 pending");
});
```

### Testing App Modes

For mode-specific tests, avoid waiting for mode names which may not render:

```typescript
// ❌ WRONG - Mode name may not be visible in TUI
await waitForText(result, "PLANNING", 5000);
await waitForText(result, "ImplementationMode", 5000);

// ✅ CORRECT - Wait for mode-specific content
// For INIT mode:
await waitForText(result, "Checking", 8000);  // Init starts with "Checking project..."

// For Implementation mode (with tasks):
await waitForText(result, "Tasks (", 5000);   // Task panel header

// For CLI commands that exit:
const exitCode = await waitForExit(result, 5000);
expect(exitCode).toBe(0);
```

## Anti-Patterns (DO NOT USE)

```typescript
// ❌ Waiting for full task titles
await waitForText(result, "My Long Task Title", 5000);

// ❌ Asserting on full titles
expect(output).toContain("First Test Task");

// ❌ Using waitForText with mode names
await waitForText(result, "ImplementationMode", 5000);

// ❌ Waiting for text that spans multiple lines
await waitForText(result, "This is a very long text", 5000);
```

## References

- [cli-testing-library](https://github.com/gmrchk/cli-testing-library) - E2E test framework
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) - Unit test framework for Ink
- [Ink useInput docs](https://github.com/vadimdemedes/ink#useinputinputhandler-options) - Input handling
