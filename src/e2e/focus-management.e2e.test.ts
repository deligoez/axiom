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

describe("E2E: Focus Management", () => {
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

	it("Tab key cycles through panels without error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fm1", "Test Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press Tab multiple times
		await pressKey(result, "tab");
		await pressKey(result, "tab");
		await pressKey(result, "tab");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("Tab key works with multiple tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fm2", "Task One", "todo"),
			createStatusBead("ch-fm3", "Task Two", "doing"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Act
		await pressKey(result, "tab");

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Task One");
		expect(output).toContain("Task Two");
	});

	it("Tab after opening modal doesn't crash app", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fm4", "Modal Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Modal Task", 5000);

		// Act - open help modal and try Tab
		await pressKey(result, "?");
		await pressKey(result, "tab");
		await pressKey(result, "escape");

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Modal Task");
	});

	it("focus returns after closing modal", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fm5", "Focus Task", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Focus Task", 5000);

		// Act - open and close modal
		await pressKey(result, "?");
		await pressKey(result, "escape");
		// Navigate after closing modal
		await pressKey(result, "j");

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Focus Task");
	});
});
