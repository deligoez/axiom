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

describe("E2E: Status Transitions", () => {
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

	it("displays open task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st1", "Open Task", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - task is displayed with open status indicator
		const output = getOutput(result);
		expect(output).toContain("st1"); // Short ID
		expect(output).toContain("→"); // Open status indicator
	});

	it("displays in_progress task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st2", "Running Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - running task is displayed with progress indicator
		const output = getOutput(result);
		expect(output).toContain("st2"); // Short ID
		expect(output).toContain("●"); // In-progress indicator
	});

	it("displays closed task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st3", "Completed Task", "closed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - closed task shows with checkmark
		const output = getOutput(result);
		expect(output).toContain("st3"); // Short ID
		expect(output).toContain("✓"); // Closed status indicator
	});

	it("displays multiple status types simultaneously", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st4", "Open One", "open"),
			createStatusBead("ch-st5", "Running One", "in_progress"),
			createStatusBead("ch-st6", "Done One", "closed"),
			createStatusBead("ch-st7", "Blocked One", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (4)", 5000);

		// Assert - all tasks displayed via short IDs
		const output = getOutput(result);
		expect(output).toContain("st4"); // Open task
		expect(output).toContain("st5"); // Running task
		expect(output).toContain("st6"); // Done task
		expect(output).toContain("st7"); // Blocked task
		// And status indicators
		expect(output).toContain("→"); // Open
		expect(output).toContain("●"); // In-progress
		expect(output).toContain("✓"); // Closed
		expect(output).toContain("⊗"); // Blocked
	});
});
