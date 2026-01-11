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

describe("E2E: Initial Load", () => {
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

	it("shows app header on initial load", async () => {
		// Arrange
		projectDir = createTestProject([]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Chorus", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Chorus");
	});

	it("loads tasks from beads file", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-il1", "Task From File", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task From File", 5000);

		// Assert - task loaded from beads file
		const output = getOutput(result);
		expect(output).toContain("Task From File");
	});

	it("shows empty state for new projects", async () => {
		// Arrange - empty beads file
		projectDir = createTestProject([]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Chorus", 5000);

		// Assert - shows no tasks message
		const output = getOutput(result);
		expect(output).toContain("No tasks");
	});

	it("displays multiple tasks on load", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-il2", "Task One", "open"),
			createStatusBead("ch-il3", "Task Two", "in_progress"),
			createStatusBead("ch-il4", "Task Three", "closed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Assert - all tasks visible
		const output = getOutput(result);
		expect(output).toContain("Task One");
		expect(output).toContain("Task Two");
		expect(output).toContain("Task Three");
	});
});
