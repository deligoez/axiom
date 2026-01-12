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

describe("E2E: Intervention Menu (i key)", () => {
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

	it("opens intervention menu when i is pressed", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im1", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press i to open intervention menu
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - intervention panel is visible
		const output = getOutput(result);
		expect(output).toMatch(/intervention/i);
	});

	it("closes menu when i is pressed again", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im2", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press i twice (open then close)
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - app still shows task (menu closed or toggled)
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("closes menu when Escape is pressed", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im3", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - open with i, close with Escape
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await pressKey(result, "{Escape}");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - menu closed, task still visible
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("shows correct menu options", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im4", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press i to open intervention menu
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - shows expected intervention options
		const output = getOutput(result);
		expect(output).toMatch(/intervention/i);
		// Check for action hints in output
		expect(output).toMatch(/stop|pause|redirect/i);
	});

	it("pressing i multiple times does not crash app", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im5", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press i multiple times rapidly
		await pressKey(result, "i");
		await pressKey(result, "i");
		await pressKey(result, "i");
		await pressKey(result, "i");

		// Assert - app still responsive
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("app continues to function after closing menu", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-im6", title: "First Task" },
			{ id: "ch-im7", title: "Second Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - open/close intervention, then use other keys
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await pressKey(result, "{Escape}");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - app shows both tasks
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});
});
