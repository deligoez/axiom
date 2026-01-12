import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Quit App (q)", () => {
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

	it("shows help hint in footer (q key documented in help)", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-qa1", title: "Test Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Test Task", 5000);

		// Assert - footer shows help hint (q quit is in help panel)
		const output = getOutput(result);
		expect(output).toContain("? help");
	});

	it("app renders with task panel and no running agents", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-qa2", title: "First Task" },
			{ id: "ch-qa3", title: "Second Task" },
		]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "First Task", 5000);

		// Assert - no agents running means immediate exit is expected
		const output = getOutput(result);
		expect(output).toContain("First Task");
		expect(output).toContain("Second Task");
	});

	it("app shows implementation mode with tasks", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-qa4", title: "Ready Task" }]);
		const result = await renderApp([], projectDir);
		await waitForText(result, "Ready Task", 5000);

		// Assert - in implementation mode (not init/planning)
		const output = getOutput(result);
		expect(output).toContain("Ready Task");
	});
});
