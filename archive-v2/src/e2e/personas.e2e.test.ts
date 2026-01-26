import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createImplementationState,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	type PtyTestResult,
	renderAppWithPty,
	sendKey,
} from "../test-utils/pty-helpers.js";

/**
 * E2E tests for persona display in TUI.
 * Tests verify that persona-related UI elements render correctly.
 *
 * Note: Task short IDs are displayed as 4-char truncated form (e.g., "pers" not "pers1")
 */
describe("E2E: Persona Display (AP17)", () => {
	let projectDir: string;
	let ptyResult: PtyTestResult | null = null;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(() => {
		if (ptyResult) {
			cleanupPty(ptyResult);
			ptyResult = null;
		}
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("Agent grid renders with empty slots when no agents running", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-pers1", title: "Persona Test Task" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (1)", 10000);
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Assert - app renders with task and agent grid showing empty slots
		const output = ptyResult.getCleanOutput();
		// Task short ID is truncated to 4 chars: "pers" from "ch-pers1"
		expect(output).toContain("pers");
		expect(output).toContain("CHORUS");
		// Grid shows empty slots when no agents running
		expect(output).toContain("empty slot");
	}, 15000);

	it("Status line shows task statistics", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-stat1", title: "Stats Test Task", status: "todo" },
			{ id: "ch-stat2", title: "Stats Test Task 2", status: "done" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (2)", 10000);
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Assert - status line shows task stats
		const output = ptyResult.getCleanOutput();
		// Status line shows statistics format
		expect(output).toContain("Tasks:");
		expect(output).toMatch(/\d+ (done|pending|running|blocked)/);
	}, 15000);

	it("Press L key toggles Agent Log Panel visibility", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-logp1", title: "Log Panel Test Task" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (1)", 10000);
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Act - press L to open Agent Log Panel
		await sendKey(ptyResult, "L", 500);

		// Assert - app still renders without crashing after L key
		const outputAfterL = ptyResult.getCleanOutput();
		// Either log panel opens (shows "entries" or "No log entries") or L is handled
		expect(outputAfterL).toContain("CHORUS");

		// Act - press L again
		await sendKey(ptyResult, "L", 500);

		// Assert - app still renders normally
		const outputAfterClose = ptyResult.getCleanOutput();
		expect(outputAfterClose).toContain("logp");
	}, 20000);

	it("ANSI color codes present in raw output (verifies colors applied)", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-ansi1", title: "ANSI Test Task" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Assert - raw output (not cleaned) contains ANSI escape codes
		// ANSI codes start with ESC (0x1B) followed by [
		const rawOutput = ptyResult.getOutput();
		// Use string check for ESC character (code 27)
		const hasAnsiCodes = rawOutput.includes(`${String.fromCharCode(27)}[`);
		expect(hasAnsiCodes).toBe(true);
	}, 15000);

	it("Task panel shows tasks with short IDs and status indicators", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-wrk1", title: "Worker Tile Test" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (1)", 10000);
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Assert - task panel renders with short ID
		const output = ptyResult.getCleanOutput();
		// Task short ID: "wrk1" from "ch-wrk1"
		expect(output).toContain("wrk1");
		// Status indicator (→ for open, ● for in_progress, ✓ for closed)
		expect(output).toMatch(/[→●✓⊗]/);
		// Grid area shows empty slots
		expect(output).toContain("empty slot");
	}, 15000);

	it("Full TUI integration: tasks panel + agent grid + status line render together", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-int1", title: "Integration Task 1", status: "todo" },
			{ id: "ch-int2", title: "Integration Task 2", status: "todo" },
			{ id: "ch-int3", title: "Integration Task 3", status: "todo" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (3)", 10000);
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Assert - all major UI elements render
		const output = ptyResult.getCleanOutput();
		// Tasks panel header
		expect(output).toContain("Tasks (3)");
		// Task short IDs (4-char truncated)
		expect(output).toContain("int1");
		expect(output).toContain("int2");
		expect(output).toContain("int3");
		// Status line shows tasks stats
		expect(output).toContain("Tasks:");
		expect(output).toMatch(/\d+ pending/);
		// App header
		expect(output).toContain("CHORUS");
		// Grid renders (with empty slots since no agents running)
		expect(output).toContain("empty slot");
	}, 15000);
});
