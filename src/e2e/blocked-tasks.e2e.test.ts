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

describe("E2E: Blocked Tasks", () => {
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

	it("shows blocked indicator for blocked tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt1", "Blocked Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - blocked task shows with ⊗ indicator
		const output = getOutput(result);
		expect(output).toContain("bt1");
		expect(output).toContain("⊗");
	});

	it("displays blocked task among other tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt2", "Open Task", "open"),
			createStatusBead("ch-bt3", "Blocked One", "blocked"),
			createStatusBead("ch-bt4", "Running Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (3)", 5000);

		// Assert - all tasks visible with correct indicators
		const output = getOutput(result);
		expect(output).toContain("bt2");
		expect(output).toContain("bt3");
		expect(output).toContain("bt4");
		expect(output).toContain("⊗");
	});

	it("handles multiple blocked tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt5", "First Blocked", "blocked"),
			createStatusBead("ch-bt6", "Second Blocked", "blocked"),
			createStatusBead("ch-bt7", "Third Blocked", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (3)", 5000);

		// Assert - all blocked tasks visible via short IDs
		const output = getOutput(result);
		expect(output).toContain("bt5");
		expect(output).toContain("bt6");
		expect(output).toContain("bt7");
	});

	it("shows resolved and blocked tasks together", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt8", "Completed Task", "closed"),
			createStatusBead("ch-bt9", "Waiting Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (2)", 5000);

		// Assert - both types visible via short IDs
		const output = getOutput(result);
		expect(output).toContain("bt8");
		expect(output).toContain("bt9");
		expect(output).toContain("✓"); // closed
		expect(output).toContain("⊗"); // blocked
	});
});
