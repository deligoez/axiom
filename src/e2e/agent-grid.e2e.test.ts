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

describe("E2E: AgentGrid Shows Slots", () => {
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

	it("shows empty slots when no agents", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Test Task" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "empty slot", 5000);

		// Assert - AgentGrid shows [empty slot] when no agents
		const output = getOutput(result);
		expect(output).toContain("empty slot");
	});

	it("shows help hint in header", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Test Task" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "? for help", 5000);

		// Assert - HeaderBar shows help hint
		const output = getOutput(result);
		expect(output).toContain("? for help");
	});

	it("shows agent grid area in layout", async () => {
		// Arrange
		projectDir = createTestProject([]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "empty slot", 5000);

		// Assert - Shows empty slots in agent grid area
		const output = getOutput(result);
		expect(output).toContain("empty slot");
	});

	// Note: Agent tile tests require running agents which need actual
	// Claude CLI interaction. These are better tested via integration tests.
	// See: src/components/AgentGrid.integration.test.tsx for tile tests
	it("displays agent count in header", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Task One" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "0/4", 5000);

		// Assert - Header shows agent slots as "X/Y" format
		const output = getOutput(result);
		expect(output).toContain("0/4");
	});
});
