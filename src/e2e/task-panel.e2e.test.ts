import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createPriorityBead,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: TaskPanel Displays Tasks", () => {
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

	it("shows task titles in list", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-abc1", title: "First Test Task" },
			{ id: "ch-def2", title: "Second Test Task" },
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Test Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("First Test Task");
		expect(output).toContain("Second Test Task");
	});

	it("shows → for open tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-open1", "Open Task", "open"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Open Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("→");
	});

	it("shows ● for in_progress tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-prog1", "In Progress Task", "in_progress"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "In Progress Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("●");
	});

	it("shows ✓ for closed tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-done1", "Closed Task", "closed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Closed Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("✓");
	});

	it("shows priority badges (P0-P4)", async () => {
		// Arrange
		projectDir = createTestProject([
			createPriorityBead("ch-p0", "Critical Task", 0),
			createPriorityBead("ch-p1", "High Task", 1),
			createPriorityBead("ch-p2", "Medium Task", 2),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Critical Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("P0");
		expect(output).toContain("P1");
		expect(output).toContain("P2");
	});

	it("shows ⊗ for blocked tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-blk1", "Blocked Task", "blocked"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Blocked Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("⊗");
	});

	it("shows ✗ for failed tasks", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fail1", "Failed Task", "failed"),
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Failed Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("✗");
	});
});
