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

1. **Keyboard input in tests** - useInput is disabled when no TTY (see TTY Testing section below)
2. **TUI text wrapping** - Task titles wrap across lines in narrow columns (see below)
3. **Timing sensitivity** - E2E tests can be flaky; use appropriate timeouts

## TTY Testing with node-pty

Ink's `useInput` hook requires a real TTY. `cli-testing-library` uses `child_process.spawn` with pipes, which doesn't provide TTY. For testing keyboard interactions, Ink itself uses `node-pty`:

### How Ink Tests useInput

```typescript
import {spawn} from 'node-pty';

const ps = spawn('node', ['./app.js'], {
  name: 'xterm-color',
  cols: 100,
  cwd: __dirname,
  env: {...process.env, NODE_NO_WARNINGS: '1', CI: 'false'},
});

// Send keyboard input
ps.write('q');           // Regular character
ps.write('\u001B');      // Escape key
ps.write('\u001B[A');    // Up arrow
ps.write('\u001B[B');    // Down arrow
ps.write('\t');          // Tab
ps.write('\r');          // Enter

// Listen for output
ps.onData(data => {
  result.output += data;
});

// Wait for process exit
ps.onExit(({exitCode}) => { ... });
```

### Key Codes Reference

| Key | Code | Description |
|-----|------|-------------|
| Escape | `\u001B` | ESC character |
| Tab | `\t` | Tab character |
| Shift+Tab | `\u001B[Z` | Reverse tab |
| Enter | `\r` | Carriage return |
| Up | `\u001B[A` | Up arrow |
| Down | `\u001B[B` | Down arrow |
| Left | `\u001B[D` | Left arrow |
| Right | `\u001B[C` | Right arrow |
| Ctrl+C | `\u0003` | Interrupt |
| Ctrl+F | `\u0006` | Ctrl modifier |
| Backspace | `\u0008` | Backspace |
| Delete | `\u007F` | Delete |
| PageUp | `\u001B[5~` | Page up |
| PageDown | `\u001B[6~` | Page down |

### PTY Test Helpers (IMPLEMENTED)

node-pty is now integrated for TTY-dependent E2E tests. Use the helpers in `src/test-utils/pty-helpers.ts`:

```typescript
import {
  renderAppWithPty,
  sendKey,
  Keys,
  cleanupPty,
  type PtyTestResult,
} from "../test-utils/pty-helpers.js";

describe("E2E: Keyboard Interactions (PTY)", () => {
  let ptyResult: PtyTestResult | null = null;

  afterEach(() => {
    if (ptyResult) cleanupPty(ptyResult);
  });

  it("j/k navigation works", async () => {
    // Arrange
    projectDir = createTestProject([...tasks]);
    ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });

    // Wait for app to start (uses ANSI stripping internally)
    await ptyResult.waitForText("Tasks (3)", 10000);

    // Act - send keyboard input
    await sendKey(ptyResult, "j", 300);  // j key with 300ms delay

    // Assert - use getCleanOutput() for ANSI-stripped output
    const output = ptyResult.getCleanOutput();
    expect(output).toContain("nav1");
  }, 20000);
});
```

### PTY Helper API

| Method | Description |
|--------|-------------|
| `renderAppWithPty(args, options)` | Spawn app in real PTY |
| `ptyResult.waitForText(text, timeout)` | Wait for text (ANSI stripped automatically) |
| `ptyResult.getOutput()` | Get raw output with ANSI codes |
| `ptyResult.getCleanOutput()` | Get output with ANSI codes stripped |
| `sendKey(ptyResult, key, delay)` | Send key with optional delay |
| `sendKeys(ptyResult, keys, delay)` | Send multiple keys in sequence |
| `cleanupPty(ptyResult)` | Kill PTY process |
| `Keys.TAB`, `Keys.ESCAPE`, etc. | Key code constants |

### When to Use PTY vs cli-testing-library

| Test Type | Tool | Reason |
|-----------|------|--------|
| Keyboard behavior | PTY (`pty-helpers.ts`) | Requires real TTY for `useInput` |
| App doesn't crash | cli-testing-library | Faster, broader compatibility |
| Visual rendering | cli-testing-library | Sufficient for layout tests |
| Unit keyboard tests | ink-testing-library | Direct stdin.write() works |

### Important: ANSI Stripping

PTY output contains ANSI escape codes. Always use `getCleanOutput()` for assertions:

```typescript
// ❌ WRONG - ANSI codes break string matching
const output = ptyResult.getOutput();
expect(output).toContain("Tasks (1)");  // May fail due to: [1mTasks [22m[2m(1)[22m

// ✅ CORRECT - ANSI codes stripped
const output = ptyResult.getCleanOutput();
expect(output).toContain("Tasks (1)");  // Works correctly
```

### macOS spawn-helper Permissions

If you get `posix_spawnp failed` errors on macOS, fix permissions:

```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

### Important: TTY Detection in node-pty (CRITICAL)

**Problem:** In node-pty spawned processes, `process.stdin.isTTY` is often `false` or `undefined` even though the process is connected to a real PTY. This causes `useInput` hooks to be disabled because they check `process.stdin?.isTTY`.

**Solution:** When writing hooks that use `useInput`, check BOTH stdin AND stdout for TTY:

```typescript
// ❌ WRONG - stdin.isTTY is false in node-pty spawned processes
const getIsTTY = () => Boolean(process.stdin?.isTTY);

// ✅ CORRECT - Check both stdin and stdout
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);
```

**Why this happens:** node-pty creates a pseudo-terminal for stdout/stderr, but stdin may be handled differently (as a PassThrough stream). Checking `process.stdout?.isTTY` correctly detects the PTY environment.

**Files already fixed:**
- `src/modes/ImplementationMode.tsx`
- `src/hooks/useInterventionKey.ts`
- `src/components/InterventionPanel.tsx`

**When adding new hooks with `useInput`:** Always use the combined TTY check pattern above.

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

## Integration Testing (Real Claude CLI)

Integration tests spawn the real Claude CLI to verify end-to-end behavior. Located in `src/integration/`.

### Running Integration Tests

```bash
npm run test:integration
```

### Key Discoveries (CRITICAL)

#### 1. Claude CLI --print requires stdin for prompt

When running Claude CLI with `--print` flag from a subprocess, the prompt MUST be sent via stdin, not as a command line argument:

```typescript
// ❌ WRONG - Prompt as argument fails in subprocess
const child = spawn(claudePath, ["--print", 'Say "OK"'], { ... });

// ✅ CORRECT - Send prompt via stdin
const child = spawn(claudePath, ["--print"], { ... });
child.stdin?.write('Say "OK"');
child.stdin?.end();
```

**Why:** Without a TTY, Claude CLI doesn't receive the prompt argument correctly and hangs.

#### 2. Use --dangerously-skip-permissions for tests

For non-interactive integration tests, use `--dangerously-skip-permissions` to bypass permission prompts:

```typescript
const child = spawn(claudePath, ["--print", "--dangerously-skip-permissions"], { ... });
```

#### 3. Signal format is `<chorus>TYPE:payload</chorus>`

The actual signal format used by SignalParser:

```typescript
// Signal types: COMPLETE, BLOCKED, NEEDS_HELP, PROGRESS, RESOLVED, NEEDS_HUMAN
<chorus>COMPLETE</chorus>           // No payload
<chorus>BLOCKED:reason</chorus>     // With payload
<chorus>PROGRESS:75</chorus>        // Numeric payload
```

**Note:** The task descriptions may show old format `[CHORUS:TYPE:...]` - use the angle bracket format.

#### 4. LearningStore uses content hashing for deduplication

Learnings are deduplicated using SHA-256 hash of normalized (lowercase, trimmed) content. Same content = same hash = skipped.

### Integration Test Patterns

```typescript
// Standard setup
let claudePath = "claude";

beforeAll(() => {
  claudePath = execSync("which claude", { stdio: "pipe", encoding: "utf-8" }).trim();
});

// Run Claude with prompt
async function runClaude(prompt: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, ["--print", "--dangerously-skip-permissions"], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin?.write(prompt);
    child.stdin?.end();

    let stdout = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
    child.on("exit", (code) => code === 0 ? resolve(stdout) : reject(...));
  });
}
```

### Test Files

| File | Purpose |
|------|---------|
| `claude-cli.integration.test.ts` | INT-01: Basic CLI spawn |
| `file-operations.integration.test.ts` | INT-02: File operations |
| `agent-lifecycle.integration.test.ts` | INT-03: Worktree lifecycle |
| `multi-agent.integration.test.ts` | INT-04: Parallel agents |
| `e2e-workflow.integration.test.ts` | INT-05: Full workflow |
| `signal-parsing.integration.test.ts` | INT-06: Signal parsing |
| `learnings.integration.test.ts` | INT-07: Learning storage |
| `learning-propagation.integration.test.ts` | INT-08: Learning propagation |
| `ralph-iteration.integration.test.ts` | INT-09: Ralph retry pattern |
| `parallel-learning.integration.test.ts` | INT-10: Parallel learning |

## References

- [cli-testing-library](https://github.com/gmrchk/cli-testing-library) - E2E test framework (no TTY)
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) - Unit test framework for Ink
- [Ink useInput docs](https://github.com/vadimdemedes/ink#useinputinputhandler-options) - Input handling
- [node-pty](https://github.com/microsoft/node-pty) - Pseudo-terminal for TTY testing (used by Ink)
- [Ink hooks tests](https://github.com/vadimdemedes/ink/blob/master/test/hooks.tsx) - Example of node-pty usage
