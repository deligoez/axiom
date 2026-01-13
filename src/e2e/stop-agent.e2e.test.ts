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

describe("E2E: Stop Agent (x key)", () => {
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

	it("pressing x key does not crash app with in_progress task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sa1", "Running Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - press x to stop
		await pressKey(result, "x");

		// Assert - app still renders correctly (x is handled without error)
		const output = getOutput(result);
		expect(output).toContain("Running Task");
	});

	it("pressing x key does not crash app with no in_progress tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sa2", "Open Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Act - press x (no running agent to stop)
		await pressKey(result, "x");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Open Task");
	});

	it("pressing x with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sa3", "First Task", "todo"),
			createStatusBead("ch-sa4", "Second Task", "doing"),
			createStatusBead("ch-sa5", "Third Task", "done"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press x
		await pressKey(result, "x");

		// Assert - all tasks still visible
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});
});
