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

describe("E2E: Output Scrolling", () => {
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

	it("app renders with agent output area", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-os1", "Active Task", "doing"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Assert - app shows agent area with empty slots
		const output = getOutput(result);
		expect(output).toContain("Active Task");
		expect(output).toContain("empty slot");
	});

	it("j/k keys work in main view without error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-os2", "Task One", "todo"),
			createStatusBead("ch-os3", "Task Two", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Act - navigate with j/k
		await pressKey(result, "j");
		await pressKey(result, "k");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Task One");
		expect(output).toContain("Task Two");
	});

	it("l key opens log view without error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-os4", "Running Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Act - open log view
		await pressKey(result, "l");

		// Assert - app handles log view
		const output = getOutput(result);
		expect(output).toContain("Running Task");
	});

	it("j/k keys after l key don't crash app", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-os5", "Active Task", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Act - open log view and navigate
		await pressKey(result, "l");
		await pressKey(result, "j");
		await pressKey(result, "k");

		// Assert - app handles navigation in log view
		const output = getOutput(result);
		expect(output).toContain("Active Task");
	});
});
