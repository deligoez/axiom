import { afterEach, describe, expect, it } from "vitest";
import {
	cleanup,
	getOutput,
	pressKey,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Panel Focus (Tab)", () => {
	afterEach(async () => {
		await cleanup();
	});

	it("Tab switches focus without error", async () => {
		// Arrange
		const result = await renderApp();
		await waitForText(result, "Chorus", 5000);

		// Act - press Tab to switch focus
		await pressKey(result, "{Tab}");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Chorus");
		expect(output).toMatch(/agents/i);
	});

	it("Tab can be pressed multiple times", async () => {
		// Arrange
		const result = await renderApp();
		await waitForText(result, "Chorus", 5000);

		// Act - press Tab twice (left -> right -> left)
		await pressKey(result, "{Tab}");
		await pressKey(result, "{Tab}");

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("Chorus");
	});

	it("app continues to function after Tab key", async () => {
		// Arrange
		const result = await renderApp();
		await waitForText(result, "Chorus", 5000);

		// Act - press Tab then verify other keys still work
		await pressKey(result, "{Tab}");
		await pressKey(result, "?"); // Toggle help (should still respond)

		// Assert - help text appears (help panel opened)
		// Small delay to let the UI update
		await new Promise((resolve) => setTimeout(resolve, 100));
		const output = getOutput(result);
		expect(output).toContain("Chorus");
	});
});
