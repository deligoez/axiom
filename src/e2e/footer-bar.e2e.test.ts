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

describe("E2E: FooterBar Shows Stats", () => {
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
			createStatusBead("ch-done1", "Done Task 1", "done"),
			createStatusBead("ch-done2", "Done Task 2", "done"),
			createStatusBead("ch-prog1", "Running Task", "doing"),
			createStatusBead("ch-open1", "Pending Task 1", "todo"),
			createStatusBead("ch-open2", "Pending Task 2", "todo"),
			createStatusBead("ch-open3", "Pending Task 3", "todo"),
			createStatusBead("ch-block1", "Blocked Task", "stuck"),
		]);

		// Act - wait for tasks to load (shown in task panel), then check footer stats
		const result = await renderApp([], projectDir);
		await waitForText(result, "Done Task 1", 5000);

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

		// Act - wait for footer to show with merge queue
		const result = await renderApp([], projectDir);
		await waitForText(result, "Merge:", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("0 queued");
	});

	it("shows help hint text", async () => {
		// Arrange
		projectDir = createTestProject([]);

		// Act - wait for footer to show with help hint
		const result = await renderApp([], projectDir);
		await waitForText(result, "? help", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("? help");
	});
});
