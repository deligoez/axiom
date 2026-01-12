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

// NOTE: Keyboard-triggered state changes cannot be tested in E2E
// because Ink's useInput requires TTY, which isn't available in cli-testing-library.
// The actual InterventionPanel functionality is tested via unit tests.
// These E2E tests verify the app doesn't crash when keys are pressed.

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

	// SKIPPED: useInput is disabled in E2E (no TTY), so 'i' key doesn't trigger menu
	// InterventionPanel rendering is tested via unit tests
	it.skip("opens intervention menu when i is pressed", async () => {
		// This test cannot work because useInput requires TTY
		// See InterventionPanel.test.tsx for keyboard interaction tests
	});

	it("pressing i does not crash app", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im2", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press i (even though it won't open menu due to TTY limitation)
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - app still renders correctly
		const output = getOutput(result);
		expect(output).toContain("im2"); // Short ID
	});

	it("pressing i then Escape does not crash", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im3", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press i then Escape
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await pressKey(result, "{Escape}");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - app still renders
		const output = getOutput(result);
		expect(output).toContain("im3");
	});

	// SKIPPED: useInput is disabled in E2E (no TTY), so menu options can't be verified
	it.skip("shows correct menu options", async () => {
		// This test cannot work because useInput requires TTY
		// See InterventionPanel.test.tsx for menu options tests
	});

	it("pressing i multiple times does not crash app", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-im5", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (1)", 5000);

		// Act - press i multiple times rapidly
		await pressKey(result, "i");
		await pressKey(result, "i");
		await pressKey(result, "i");
		await pressKey(result, "i");

		// Assert - app still responsive
		const output = getOutput(result);
		expect(output).toContain("im5");
	});

	it("app continues to function after pressing i and Escape", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-im6", title: "First Task" },
			{ id: "ch-im7", title: "Second Task" },
		]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Tasks (2)", 5000);

		// Act - press i then Escape
		await pressKey(result, "i");
		await new Promise((resolve) => setTimeout(resolve, 100));
		await pressKey(result, "{Escape}");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Assert - app shows both tasks (via short IDs)
		const output = getOutput(result);
		expect(output).toContain("im6");
		expect(output).toContain("im7");
	});
});
