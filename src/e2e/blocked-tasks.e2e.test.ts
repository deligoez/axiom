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
		await waitForText(result, "Blocked Task", 5000);

		// Assert - blocked task shows with ⊗ indicator
		const output = getOutput(result);
		expect(output).toContain("Blocked Task");
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
		await waitForText(result, "Open Task", 5000);

		// Assert - all tasks visible with correct indicators
		const output = getOutput(result);
		expect(output).toContain("Open Task");
		expect(output).toContain("Blocked One");
		expect(output).toContain("Running Task");
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
		await waitForText(result, "First Blocked", 5000);

		// Assert - all blocked tasks visible
		const output = getOutput(result);
		expect(output).toContain("First Blocked");
		expect(output).toContain("Second Blocked");
		expect(output).toContain("Third Blocked");
	});

	it("shows resolved and blocked tasks together", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt8", "Completed Task", "closed"),
			createStatusBead("ch-bt9", "Waiting Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Completed Task", 5000);

		// Assert - both types visible
		const output = getOutput(result);
		expect(output).toContain("Completed Task");
		expect(output).toContain("Waiting Task");
		expect(output).toContain("✓"); // closed
		expect(output).toContain("⊗"); // blocked
	});
});
