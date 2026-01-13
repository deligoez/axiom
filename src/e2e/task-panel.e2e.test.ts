import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: TaskPanel Displays Tasks", () => {
	let projectDir: string;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(async () => {
		await cleanup();
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("shows task titles in list", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-abc1", title: "First Test Task" },
			{ id: "ch-def2", title: "Second Test Task" },
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for the tasks header to appear (indicates tasks are loaded)
		await waitForText(result, "Tasks (2)", 5000);

		// Assert - check for task identifiers (short IDs) and key title words
		// Note: Full titles may be split across lines in TUI, so check for key parts
		const output = getOutput(result);
		expect(output).toContain("abc1"); // Short ID for first task
		expect(output).toContain("def2"); // Short ID for second task
		expect(output).toContain("First"); // Part of first title
		expect(output).toContain("Second"); // Part of second title
	});

	it("shows → for open tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-open1", "Open Task", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("→");
	});

	it("shows ● for in_progress tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-prog1", "In Progress Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for the tasks header to appear
		await waitForText(result, "Tasks (1)", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("●");
		expect(output).toContain("prog"); // Part of short ID
	});

	it("shows ✓ for closed tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-done1", "Closed Task", "closed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Closed Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("✓");
	});

	it("shows priority badge (default P1)", async () => {
		// NOTE: TaskStore doesn't support priority (by design).
		// All tasks get default P1 priority in the UI.
		// Arrange
		projectDir = createTestProject([{ id: "ch-abc1", title: "Test Task" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - all tasks show P1 (hardcoded default)
		const output = getOutput(result);
		expect(output).toContain("P1");
	});

	it("shows ⊗ for blocked tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-blk1", "Blocked Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for the tasks header to appear
		await waitForText(result, "Tasks (1)", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("⊗");
		expect(output).toContain("blk1"); // Part of short ID
	});

	it("shows ✗ for failed tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fail1", "Failed Task", "failed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Failed Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("✗");
	});
});
