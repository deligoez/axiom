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

describe("E2E: Status Transitions", () => {
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

	it("displays open task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st1", "Open Task", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Assert - task is displayed
		const output = getOutput(result);
		expect(output).toContain("Open Task");
	});

	it("displays in_progress task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st2", "Running Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Running Task", 5000);

		// Assert - running task is displayed
		const output = getOutput(result);
		expect(output).toContain("Running Task");
	});

	it("displays closed task status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st3", "Completed Task", "closed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Completed Task", 5000);

		// Assert - closed task shows with checkmark
		const output = getOutput(result);
		expect(output).toContain("Completed Task");
		expect(output).toContain("✓");
	});

	it("displays multiple status types simultaneously", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-st4", "Open One", "open"),
			createStatusBead("ch-st5", "Running One", "in_progress"),
			createStatusBead("ch-st6", "Done One", "closed"),
			createStatusBead("ch-st7", "Blocked One", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open One", 5000);

		// Assert - all tasks displayed
		const output = getOutput(result);
		expect(output).toContain("Open One");
		expect(output).toContain("Running One");
		expect(output).toContain("Done One");
		expect(output).toContain("Blocked One");
	});
});
