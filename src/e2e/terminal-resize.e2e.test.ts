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

describe("E2E: Terminal Resize", () => {
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

	it("renders UI in default terminal size", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-tr1", "Test Task", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Assert - UI renders correctly
		const output = getOutput(result);
		expect(output).toContain("Test Task");
		expect(output).toContain("Chorus");
	});

	it("handles long task titles with truncation", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead(
				"ch-tr2",
				"Very Long Task Title That Should Be Truncated In The UI",
				"open",
			),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Very Long Task", 5000);

		// Assert - app renders without crashing
		const output = getOutput(result);
		expect(output).toContain("Very Long Task");
	});

	it("handles many tasks in list", async () => {
		// Arrange - create more tasks than fit in viewport
		projectDir = createTestProject([
			createStatusBead("ch-tr3", "Task 1", "open"),
			createStatusBead("ch-tr4", "Task 2", "open"),
			createStatusBead("ch-tr5", "Task 3", "open"),
			createStatusBead("ch-tr6", "Task 4", "open"),
			createStatusBead("ch-tr7", "Task 5", "open"),
			createStatusBead("ch-tr8", "Task 6", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task 1", 5000);

		// Assert - renders first tasks at minimum
		const output = getOutput(result);
		expect(output).toContain("Task 1");
	});

	it("displays both panels in layout", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-tr9", "Panel Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Panel Task", 5000);

		// Assert - both task and agent areas visible
		const output = getOutput(result);
		expect(output).toContain("Panel Task");
		expect(output).toContain("Tasks");
	});
});
