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

describe("E2E: Fullscreen Agent (f key)", () => {
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

	it("pressing f key does not crash app with in_progress task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fs1", "Running Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - press f to toggle fullscreen
		await pressKey(result, "f");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Running Task");
	});

	it("pressing f key does not crash app with open task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fs2", "Open Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Act - press f
		await pressKey(result, "f");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Open Task");
	});

	it("pressing f multiple times toggles without error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fs3", "Test Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - toggle fullscreen multiple times
		await pressKey(result, "f");
		await pressKey(result, "f");
		await pressKey(result, "f");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("pressing Escape after f key maintains app state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fs4", "Active Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Act - press f then Escape
		await pressKey(result, "f");
		await pressKey(result, "escape");

		// Assert - app still shows task
		const output = getOutput(result);
		expect(output).toContain("Active Task");
	});

	it("pressing f with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fs5", "First Task", "todo"),
			createStatusBead("ch-fs6", "Second Task", "doing"),
			createStatusBead("ch-fs7", "Third Task", "done"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press f
		await pressKey(result, "f");

		// Assert - all tasks still visible after exiting fullscreen
		await pressKey(result, "f"); // exit fullscreen
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});
});
