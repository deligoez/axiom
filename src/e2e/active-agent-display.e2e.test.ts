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
		await waitForText(result, "Tasks (1)", 5000);

		// Assert - active task displayed in app (use short ID)
		const output = getOutput(result);
		expect(output).toContain("aa1"); // Short ID
		expect(output).toContain("●"); // in_progress indicator
		expect(output).toContain("1 running"); // Footer stats
	});

	it("shows open and in_progress tasks together", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa2", "Waiting Task", "open"),
			createStatusBead("ch-aa3", "Running Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (2)", 5000);

		// Assert - both tasks visible via short IDs
		const output = getOutput(result);
		expect(output).toContain("aa2");
		expect(output).toContain("aa3");
	});

	it("shows multiple in_progress tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa4", "Agent One", "in_progress"),
			createStatusBead("ch-aa5", "Agent Two", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (2)", 5000);

		// Assert - multiple active tasks displayed via short IDs
		const output = getOutput(result);
		expect(output).toContain("aa4");
		expect(output).toContain("aa5");
		expect(output).toContain("2 running"); // Footer shows both running
	});

	it("handles transition from open to in_progress", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-aa6", "Ready Task", "open"),
			createStatusBead("ch-aa7", "Started Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (2)", 5000);

		// Assert - both states shown correctly
		const output = getOutput(result);
		expect(output).toContain("aa6");
		expect(output).toContain("aa7");
		expect(output).toContain("1 running");
		expect(output).toContain("1 pending");
	});
});
