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

describe("E2E: Error States", () => {
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

	it("shows failed task indicator", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-es1", "Failed Task", "failed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Failed Task", 5000);

		// Assert - failed task shows with ✗ indicator
		const output = getOutput(result);
		expect(output).toContain("Failed Task");
		expect(output).toContain("✗");
	});

	it("shows blocked task indicator", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-es2", "Blocked Task", "stuck"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Blocked Task", 5000);

		// Assert - blocked task shows with blocked indicator
		const output = getOutput(result);
		expect(output).toContain("Blocked Task");
		expect(output).toContain("⊗");
	});

	it("displays failed and non-failed tasks together", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-es3", "Normal Task", "todo"),
			createStatusBead("ch-es4", "Failed Task", "failed"),
			createStatusBead("ch-es5", "Done Task", "done"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Normal Task", 5000);

		// Assert - all tasks displayed with correct indicators
		const output = getOutput(result);
		expect(output).toContain("Normal Task");
		expect(output).toContain("Failed Task");
		expect(output).toContain("Done Task");
		expect(output).toContain("✗"); // Failed
		expect(output).toContain("✓"); // Done
	});

	it("app handles multiple error states", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-es6", "Failed One", "failed"),
			createStatusBead("ch-es7", "Failed Two", "failed"),
			createStatusBead("ch-es8", "Blocked One", "stuck"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Failed One", 5000);

		// Assert - app handles multiple error states
		const output = getOutput(result);
		expect(output).toContain("Failed One");
		expect(output).toContain("Failed Two");
		expect(output).toContain("Blocked One");
	});
});
