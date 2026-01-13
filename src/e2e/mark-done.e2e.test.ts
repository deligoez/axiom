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

describe("E2E: Mark Done (d key)", () => {
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

	it("pressing d key does not crash with open task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-md1", "Task to Mark Done", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press d to mark done
		await pressKey(result, "d");

		// Assert - app still renders correctly (d is handled without error)
		const output = getOutput(result);
		expect(output).toContain("md1");
		expect(output).toContain("→"); // Still shows open indicator
	});

	it("pressing d key with in_progress task does not error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-md2", "In Progress Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press d
		await pressKey(result, "d");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("md2");
		expect(output).toContain("●"); // Still shows in_progress indicator
	});

	it("pressing d with multiple tasks maintains state", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-md3", "First Task", "todo"),
			createStatusBead("ch-md4", "Second Task", "doing"),
			createStatusBead("ch-md5", "Third Task", "done"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (3)", 5000);

		// Act - press d
		await pressKey(result, "d");

		// Assert - all tasks still visible via short IDs, stats still correct
		const output = getOutput(result);
		expect(output).toContain("md3");
		expect(output).toContain("md4");
		expect(output).toContain("md5");
		expect(output).toContain("1 done");
		expect(output).toContain("1 running");
		expect(output).toContain("1 pending");
	});
});
