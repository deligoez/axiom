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
2. **Column width truncation** - Task titles may be truncated in narrow columns; don't assert on full titles
3. **Timing sensitivity** - E2E tests can be flaky; use appropriate timeouts

## Common Patterns

### Testing Keyboard Shortcuts

```typescript
it("opens menu when key is pressed", async () => {
  // Arrange
  projectDir = createTestProject([{ id: "ch-test", title: "Task" }]);
  const result = await renderApp([], projectDir);
  await waitForText(result, "Task", 5000);  // Wait for beads to load

  // Act
  await pressKey(result, "i");
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Assert
  const output = getOutput(result);
  expect(output).toMatch(/menu|panel|intervention/i);
});
```

### Testing Task Display

```typescript
it("shows task count", async () => {
  // Arrange
  projectDir = createTestProject([
    { id: "ch-1", title: "First" },
    { id: "ch-2", title: "Second" },
  ]);

  // Act
  const result = await renderApp([], projectDir);
  await waitForText(result, "2", 5000);  // Wait for count

  // Assert
  const output = getOutput(result);
  expect(output).toContain("2");  // Task count in panel
});
```

## References

- [cli-testing-library](https://github.com/gmrchk/cli-testing-library) - E2E test framework
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) - Unit test framework for Ink
- [Ink useInput docs](https://github.com/vadimdemedes/ink#useinputinputhandler-options) - Input handling
