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

describe("E2E: Grid Settings (g key)", () => {
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

	it("pressing g key does not crash app with tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs1", "Task One", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Act - press g to open grid settings
		await pressKey(result, "g");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Task One");
	});

	it("pressing g key does not crash app with no tasks", async () => {
		// Arrange
		projectDir = createTestProject([]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Chorus", 5000);

		// Act - press g
		await pressKey(result, "g");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Chorus");
	});

	it("pressing g multiple times does not cause error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs2", "Test Task", "open"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press g multiple times (toggle menu)
		await pressKey(result, "g");
		await pressKey(result, "g");
		await pressKey(result, "g");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("pressing Escape after g key maintains app state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs3", "Active Task", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Act - press g then Escape
		await pressKey(result, "g");
		await pressKey(result, "escape");

		// Assert - app still shows task
		const output = getOutput(result);
		expect(output).toContain("Active Task");
	});

	it("pressing g with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs4", "First Task", "open"),
			createStatusBead("ch-gs5", "Second Task", "in_progress"),
			createStatusBead("ch-gs6", "Third Task", "closed"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press g then Escape
		await pressKey(result, "g");
		await pressKey(result, "escape");

		// Assert - all tasks still visible
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});
});
