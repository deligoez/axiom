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

describe("E2E: Keyboard Shortcut Help", () => {
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

	it("pressing ? key does not crash app", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-kh1", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press ? to toggle help
		await pressKey(result, "?");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("pressing ? multiple times does not error", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-kh2", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Act - press ? multiple times
		await pressKey(result, "?");
		await pressKey(result, "?");
		await pressKey(result, "?");

		// Assert - app still works
		const output = getOutput(result);
		expect(output).toContain("Test Task");
	});

	it("footer shows help hint with ? key", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-kh3", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Assert - footer shows help hint
		const output = getOutput(result);
		expect(output).toContain("? help");
	});

	it("app state maintained after toggling help", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-kh4", title: "First Task" },
			{ id: "ch-kh5", title: "Second Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Act - toggle help on/off
		await pressKey(result, "?");
		await pressKey(result, "?");

		// Assert - tasks still visible
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});
});
