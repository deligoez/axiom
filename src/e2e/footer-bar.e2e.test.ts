// SKIPPED: FooterBar not integrated into main app - see ch-lqp6
// These tests require FooterBar to be visible in the app layout
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe.skip("E2E: FooterBar Shows Stats", () => {
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

	it("shows task count by status", async () => {
		// Arrange - create tasks with different statuses
		projectDir = createTestProject([
			createStatusBead("ch-done1", "Done Task 1", "closed"),
			createStatusBead("ch-done2", "Done Task 2", "closed"),
			createStatusBead("ch-prog1", "Running Task", "in_progress"),
			createStatusBead("ch-open1", "Pending Task 1", "open"),
			createStatusBead("ch-open2", "Pending Task 2", "open"),
			createStatusBead("ch-open3", "Pending Task 3", "open"),
			createStatusBead("ch-block1", "Blocked Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "2 done", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("2 done");
		expect(output).toContain("1 running");
		expect(output).toContain("3 pending");
		expect(output).toContain("1 blocked");
	});

	it("shows merge queue indicator", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Test Task" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "queued", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("0 queued");
	});

	it("shows help hint text", async () => {
		// Arrange
		projectDir = createTestProject([]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "?", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("?");
	});
});
