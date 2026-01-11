import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PlanningState,
	type PlanningStateData,
} from "../services/PlanningState.js";

describe("E2E: PlanningState Integration", () => {
	let tempDir: string;
	let chorusDir: string;
	let planningState: PlanningState;

	const createPlanningState = (
		status: PlanningStateData["status"],
		chosenMode?: "semi-auto" | "autopilot",
	): PlanningStateData => ({
		status,
		chosenMode,
		planSummary: { userGoal: "Implement feature X", estimatedTasks: 5 },
		tasks: [{ id: "ch-001", title: "Task 1" }],
		reviewIterations: [],
	});

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-planning-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });

		planningState = new PlanningState(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("returns null when no state file exists", () => {
		// Arrange - no planning-state.json file

		// Act
		const state = planningState.load();

		// Assert
		expect(state).toBeNull();
	});

	it("saves planning state to JSON file", () => {
		// Arrange
		const state = createPlanningState("planning");
		const statePath = join(chorusDir, "planning-state.json");
		expect(existsSync(statePath)).toBe(false);

		// Act
		planningState.save(state);

		// Assert
		expect(existsSync(statePath)).toBe(true);
		const content = readFileSync(statePath, "utf-8");
		const saved = JSON.parse(content);
		expect(saved.status).toBe("planning");
		expect(saved.planSummary.userGoal).toBe("Implement feature X");
	});

	it("loads planning state correctly", () => {
		// Arrange
		const originalState = createPlanningState("reviewing");
		planningState.save(originalState);

		// Act
		const loadedState = planningState.load();

		// Assert
		expect(loadedState).not.toBeNull();
		expect(loadedState?.status).toBe("reviewing");
		expect(loadedState?.planSummary.estimatedTasks).toBe(5);
		expect(loadedState?.tasks).toHaveLength(1);
	});

	it("handles status transitions (planning → reviewing → ready)", () => {
		// Arrange - start with planning status
		planningState.save(createPlanningState("planning"));

		// Act - transition through statuses
		let state = planningState.load();
		expect(state?.status).toBe("planning");

		planningState.save(createPlanningState("reviewing"));
		state = planningState.load();
		expect(state?.status).toBe("reviewing");

		planningState.save(createPlanningState("ready", "semi-auto"));
		state = planningState.load();

		// Assert
		expect(state?.status).toBe("ready");
	});

	it("preserves chosenMode setting", () => {
		// Arrange & Act
		planningState.save(createPlanningState("ready", "autopilot"));

		// Assert
		const state = planningState.load();
		expect(state?.chosenMode).toBe("autopilot");
	});

	it("requires chosenMode when status is ready", () => {
		// Arrange
		const stateWithoutMode = createPlanningState("ready");

		// Act & Assert
		expect(() => planningState.save(stateWithoutMode)).toThrow(
			"chosenMode is required when status is 'ready' or 'implementation'",
		);
	});
});
