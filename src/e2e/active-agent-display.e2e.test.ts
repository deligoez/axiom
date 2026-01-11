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

describe("E2E: Active Agent Display", () => {
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

	it("shows in_progress task in agent grid area", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa1", "Active Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Active Task", 5000);

		// Assert - active task displayed in app
		const output = getOutput(result);
		expect(output).toContain("Active Task");
		expect(output).toContain("agents"); // lowercase in "0 agents"
	});

	it("shows open and in_progress tasks together", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa2", "Waiting Task", "open"),
			createStatusBead("ch-aa3", "Running Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Waiting Task", 5000);

		// Assert - both tasks visible
		const output = getOutput(result);
		expect(output).toContain("Waiting Task");
		expect(output).toContain("Running Task");
	});

	it("shows multiple in_progress tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa4", "Agent One", "in_progress"),
			createStatusBead("ch-aa5", "Agent Two", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Agent One", 5000);

		// Assert - multiple active agents displayed
		const output = getOutput(result);
		expect(output).toContain("Agent One");
		expect(output).toContain("Agent Two");
	});

	it("handles transition from open to in_progress", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa6", "Ready Task", "open"),
			createStatusBead("ch-aa7", "Started Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Ready Task", 5000);

		// Assert - both states shown correctly
		const output = getOutput(result);
		expect(output).toContain("Ready Task");
		expect(output).toContain("Started Task");
	});
});
