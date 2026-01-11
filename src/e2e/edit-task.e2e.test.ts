import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	pressKey,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Edit Task (e key)", () => {
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

	it("pressing e key does not crash with open task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-et1", "Task to Edit", "open"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task to Edit", 5000);

		// Act - press e to edit
		await pressKey(result, "e");

		// Assert - app still renders correctly (e is handled without error)
		const output = getOutput(result);
		expect(output).toContain("Task to Edit");
	});

	it("pressing e key with in_progress task does not error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-et2", "Running Task", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - press e
		await pressKey(result, "e");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Running Task");
		expect(output).toContain("●");
	});

	it("pressing e with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-et3", "First Task", "open"),
			createStatusBead("ch-et4", "Second Task", "in_progress"),
			createStatusBead("ch-et5", "Third Task", "closed"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press e
		await pressKey(result, "e");

		// Assert - all tasks still visible
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});
});
