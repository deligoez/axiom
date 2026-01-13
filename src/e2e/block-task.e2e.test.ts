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

describe("E2E: Block Task (b key)", () => {
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

	it("pressing b key does not crash with open task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-bt1", "Task to Block", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press b to block
		await pressKey(result, "b");

		// Assert - app still renders correctly (b is handled without error)
		const output = getOutput(result);
		expect(output).toContain("bt1");
	});

	it("blocked task displays ⊗ indicator", async () => {
		// Arrange - create already blocked task
		projectDir = createTestProject([
			createStatusBead("ch-bt2", "Blocked Task", "stuck"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press b (no-op since already blocked)
		await pressKey(result, "b");

		// Assert - task shows blocked indicator
		const output = getOutput(result);
		expect(output).toContain("bt2");
		expect(output).toContain("⊗");
	});
});
