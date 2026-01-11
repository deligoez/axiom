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
			createStatusBead("ch-ra1", "Running Task", "in_progress"),
			createStatusBead("ch-ra2", "Available Task", "open"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - press r to redirect
		await pressKey(result, "r");

		// Assert - app still renders correctly (r is handled without error)
		const output = getOutput(result);
		expect(output).toContain("Running Task");
		expect(output).toContain("Available Task");
	});

	it("pressing r key does not crash app with no running agents", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-ra3", "Open Task", "open"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Act - press r (no running agent to redirect)
		await pressKey(result, "r");

		// Assert - app continues to function
		const output = getOutput(result);
		expect(output).toContain("Open Task");
	});
});
