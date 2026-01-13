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
			createStatusBead("ch-gs1", "Task One", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press g to open grid settings
		await pressKey(result, "g");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("gs1"); // Short ID
	});

	it("pressing g key does not crash app with no tasks", async () => {
		// Arrange
		projectDir = createTestProject([]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "CHORUS", 5000);

		// Act - press g
		await pressKey(result, "g");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("CHORUS");
	});

	it("pressing g multiple times does not cause error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs2", "Test Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press g multiple times (toggle menu)
		await pressKey(result, "g");
		await pressKey(result, "g");
		await pressKey(result, "g");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("gs2");
	});

	it("pressing Escape after g key maintains app state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs3", "Active Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press g then Escape
		await pressKey(result, "g");
		await pressKey(result, "escape");

		// Assert - app still shows task
		const output = getOutput(result);
		expect(output).toContain("gs3");
	});

	it("pressing g with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-gs4", "First Task", "todo"),
			createStatusBead("ch-gs5", "Second Task", "doing"),
			createStatusBead("ch-gs6", "Third Task", "done"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (3)", 5000);

		// Act - press g then Escape
		await pressKey(result, "g");
		await pressKey(result, "escape");

		// Assert - all tasks still visible (via short IDs)
		const output = getOutput(result);
		expect(output).toContain("gs4");
		expect(output).toContain("gs5");
		expect(output).toContain("gs6");
	});
});
