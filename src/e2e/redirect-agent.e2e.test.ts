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

describe("E2E: Redirect Agent (r key)", () => {
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

	it("pressing r key does not crash app with in_progress task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-ra1", "Running Task", "doing"),
			createStatusBead("ch-ra2", "Available Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (2)", 5000);

		// Act - press r to redirect
		await pressKey(result, "r");

		// Assert - app still renders correctly (r is handled without error)
		const output = getOutput(result);
		// Check for short IDs since full titles may span lines
		expect(output).toContain("ra1");
		expect(output).toContain("ra2");
		expect(output).toContain("●"); // in_progress indicator
	});

	it("pressing r key does not crash app with no running agents", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-ra3", "Open Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		// Wait for tasks to load (task count in header)
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press r (no running agent to redirect)
		await pressKey(result, "r");

		// Assert - app continues to function
		const output = getOutput(result);
		// Check for short ID since full title may span lines
		expect(output).toContain("ra3");
	});
});
