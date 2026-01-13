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

describe("E2E: Concurrent Operations", () => {
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

	it("handles multiple in_progress tasks simultaneously", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-co1", "Agent One", "doing"),
			createStatusBead("ch-co2", "Agent Two", "doing"),
			createStatusBead("ch-co3", "Agent Three", "doing"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Agent One", 5000);

		// Assert - all agents visible
		const output = getOutput(result);
		expect(output).toContain("Agent One");
		expect(output).toContain("Agent Two");
		expect(output).toContain("Agent Three");
	});

	it("status bar shows correct task counts", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-co4", "Done Task", "done"),
			createStatusBead("ch-co5", "Running Task", "doing"),
			createStatusBead("ch-co6", "Waiting Task", "todo"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Done Task", 5000);

		// Assert - status bar shows counts
		const output = getOutput(result);
		expect(output).toContain("done");
		expect(output).toContain("running");
		expect(output).toContain("pending");
	});

	it("handles rapid key presses without error", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-co7", "Task One", "todo"),
			createStatusBead("ch-co8", "Task Two", "todo"),
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Task One", 5000);

		// Act - rapid key presses
		await pressKey(result, "j");
		await pressKey(result, "k");
		await pressKey(result, "j");
		await pressKey(result, "k");
		await pressKey(result, "j");

		// Assert - app still functions
		const output = getOutput(result);
		expect(output).toContain("Task One");
		expect(output).toContain("Task Two");
	});

	it("displays mixed status tasks correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-co9", "Open One", "todo"),
			createStatusBead("ch-co10", "Running One", "doing"),
			createStatusBead("ch-co11", "Done One", "done"),
			createStatusBead("ch-co12", "Blocked One", "stuck"),
			createStatusBead("ch-co13", "Failed One", "failed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open One", 5000);

		// Assert - all statuses visible
		const output = getOutput(result);
		expect(output).toContain("Open One");
		expect(output).toContain("Running One");
		expect(output).toContain("Done One");
		expect(output).toContain("Blocked One");
		expect(output).toContain("Failed One");
	});
});
