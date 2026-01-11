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

describe("E2E: View Logs (l key)", () => {
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

	it("pressing l key does not crash app with in_progress task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-vl1", "Running Task", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - press l to view logs
		await pressKey(result, "l");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Running Task");
	});

	it("pressing l key does not crash app with open task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-vl2", "Open Task", "open"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Act - press l
		await pressKey(result, "l");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Open Task");
	});

	it("pressing l multiple times does not cause error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-vl3", "Test Task", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press l multiple times (toggle view)
		await pressKey(result, "l");
		await pressKey(result, "l");
		await pressKey(result, "l");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("pressing Escape after l key maintains app state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-vl4", "Active Task", "in_progress"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Act - press l then Escape
		await pressKey(result, "l");
		await pressKey(result, "escape");

		// Assert - app still shows task
		const output = getOutput(result);
		expect(output).toContain("Active Task");
	});

	it("pressing l with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-vl5", "First Task", "open"),
			createStatusBead("ch-vl6", "Second Task", "in_progress"),
			createStatusBead("ch-vl7", "Third Task", "closed"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press l
		await pressKey(result, "l");

		// Assert - all tasks still visible
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});
});
