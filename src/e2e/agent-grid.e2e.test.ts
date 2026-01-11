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
		await waitForText(result, "No agents running", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("No agents running");
	});

	it("shows prompt to start agent", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Test Task" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Press 's' to start", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Press 's' to start");
	});

	it("shows agent grid area in layout", async () => {
		// Arrange
		projectDir = createTestProject([]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "agents", 5000);

		// Assert - HeaderBar shows "0 agents"
		const output = getOutput(result);
		expect(output).toContain("0 agents");
	});

	// Note: Agent tile tests require running agents which need actual
	// Claude CLI interaction. These are better tested via integration tests.
	// See: src/components/AgentGrid.integration.test.tsx for tile tests
	it("displays agent count in header", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-test1", title: "Task One" }]);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "0 agents", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("0 agents");
	});
});
