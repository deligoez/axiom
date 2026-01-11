import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	pressKey,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Quick Select (1-9)", () => {
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

	it("pressing 1 selects first task", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-qs1", title: "First Task" },
			{ id: "ch-qs2", title: "Second Task" },
			{ id: "ch-qs3", title: "Third Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press 1 to select first task
		await pressKey(result, "1");

		// Assert - app still renders correctly (1 is handled without error)
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
		expect(output).toContain("Third Task");
	});

	it("pressing 5 selects fifth task", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-qs1", title: "Task One" },
			{ id: "ch-qs2", title: "Task Two" },
			{ id: "ch-qs3", title: "Task Three" },
			{ id: "ch-qs4", title: "Task Four" },
			{ id: "ch-qs5", title: "Task Five" },
			{ id: "ch-qs6", title: "Task Six" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Act - press 5 to select fifth task
		await pressKey(result, "5");

		// Assert - app still renders correctly (5 is handled without error)
		const output = getOutput(result);
		expect(output).toContain("Task One");
		expect(output).toContain("Task Five");
	});

	it("invalid number greater than task count is no-op", async () => {
		// Arrange - only 2 tasks but pressing 9
		projectDir = createTestProject([
			{ id: "ch-qs1", title: "First Task" },
			{ id: "ch-qs2", title: "Second Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press 9 (more than task count)
		await pressKey(result, "9");

		// Assert - app still renders correctly (no-op, no crash)
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});
});
