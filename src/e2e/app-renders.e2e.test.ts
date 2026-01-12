import { afterEach, describe, expect, it } from "vitest";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: App Renders Correctly", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("shows Chorus title in output", async () => {
		// Arrange
		const result = await renderApp();

		// Act
		await waitForText(result, "CHORUS", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("CHORUS");
	});

	it("shows help hint text", async () => {
		// Arrange
		const result = await renderApp();

		// Act - footer shows "? help"
		await waitForText(result, "help", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("help");
	});

	it("shows task panel area", async () => {
		// Arrange
		const result = await renderApp();

		// Act - wait for task-related text (shows "No tasks" when empty)
		await waitForText(result, "tasks", 5000);

		// Assert
		const output = getOutput(result);
		// Shows "0 tasks" or "No tasks" depending on state
		expect(output).toMatch(/tasks/i);
	});

	it("shows agent grid area", async () => {
		// Arrange
		const result = await renderApp();

		// Act - grid shows empty slots when no agents
		await waitForText(result, "empty slot", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("empty slot");
	});
});
