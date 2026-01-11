import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	pressKey,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Task Navigation (j/k)", () => {
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

	it("j key moves selection down without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press j to move down
		await pressKey(result, "j");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});

	it("k key moves selection up without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press k to move up
		await pressKey(result, "k");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});

	it("navigation keys work at boundaries without error", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-nav1", title: "Only Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Only Task", 5000);

		// Act - press j and k multiple times (boundary case)
		await pressKey(result, "j");
		await pressKey(result, "j");
		await pressKey(result, "k");
		await pressKey(result, "k");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Only Task");
	});

	it("arrow keys work for navigation without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - press arrow keys
		await pressKey(result, "{ArrowDown}");
		await pressKey(result, "{ArrowUp}");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});
});
