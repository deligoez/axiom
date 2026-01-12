import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningHorizonManager } from "./PlanningHorizonManager.js";

describe("PlanningHorizonManager", () => {
	let tempDir: string;
	let manager: PlanningHorizonManager;

	beforeEach(() => {
		vi.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "planning-horizon-test-"));

		// Create .chorus directory
		const chorusDir = path.join(tempDir, ".chorus");
		fs.mkdirSync(chorusDir, { recursive: true });

		manager = new PlanningHorizonManager(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("getCurrentHorizon()", () => {
		it("returns 1 for initial state", () => {
			// Arrange - no state file

			// Act
			const horizon = manager.getCurrentHorizon();

			// Assert
			expect(horizon).toBe(1);
		});

		it("returns persisted horizon value", () => {
			// Arrange - save a state with horizon 3
			const statePath = path.join(tempDir, ".chorus", "planning-state.json");
			fs.writeFileSync(
				statePath,
				JSON.stringify({
					status: "planning",
					planSummary: { userGoal: "test", estimatedTasks: 5 },
					tasks: [],
					reviewIterations: [],
					horizon: 3,
				}),
			);

			// Act
			const horizon = manager.getCurrentHorizon();

			// Assert
			expect(horizon).toBe(3);
		});
	});

	describe("getStopConditions()", () => {
		it("returns default stop conditions when not configured", () => {
			// Arrange - no config file

			// Act
			const conditions = manager.getStopConditions();

			// Assert
			expect(conditions).toContain("unknownDependency");
			expect(conditions).toContain("decisionPoint");
			expect(conditions).toContain("taskCountReached");
			expect(conditions).toContain("specComplete");
		});

		it("returns configured stop conditions from config.json", () => {
			// Arrange
			const configPath = path.join(tempDir, ".chorus", "config.json");
			fs.writeFileSync(
				configPath,
				JSON.stringify({
					version: "1.0",
					mode: "semi-auto",
					agents: { default: "claude" },
					project: { taskIdPrefix: "ch" },
					qualityCommands: [],
					planningHorizon: {
						stopConditions: ["specComplete", "taskCountReached"],
					},
				}),
			);

			// Create new manager to pick up config
			const managerWithConfig = new PlanningHorizonManager(tempDir);

			// Act
			const conditions = managerWithConfig.getStopConditions();

			// Assert
			expect(conditions).toEqual(["specComplete", "taskCountReached"]);
		});
	});

	describe("shouldStopPlanning()", () => {
		it("returns true when reason matches a stop condition", () => {
			// Arrange - default stop conditions include unknownDependency

			// Act
			const result = manager.shouldStopPlanning("unknownDependency");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when reason does not match any stop condition", () => {
			// Arrange

			// Act
			const result = manager.shouldStopPlanning("nonExistentCondition");

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("advanceHorizon()", () => {
		it("increments horizon and persists to planning-state.json", () => {
			// Arrange
			expect(manager.getCurrentHorizon()).toBe(1);

			// Act
			manager.advanceHorizon();

			// Assert
			expect(manager.getCurrentHorizon()).toBe(2);

			// Verify persistence
			const statePath = path.join(tempDir, ".chorus", "planning-state.json");
			const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
			expect(state.horizon).toBe(2);
		});

		it("preserves existing state fields when advancing", () => {
			// Arrange
			const statePath = path.join(tempDir, ".chorus", "planning-state.json");
			fs.writeFileSync(
				statePath,
				JSON.stringify({
					status: "planning",
					planSummary: { userGoal: "Build feature X", estimatedTasks: 10 },
					tasks: [{ id: "ch-001", title: "Task 1" }],
					reviewIterations: [],
					horizon: 1,
				}),
			);

			// Act
			manager.advanceHorizon();

			// Assert
			const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
			expect(state.horizon).toBe(2);
			expect(state.planSummary.userGoal).toBe("Build feature X");
			expect(state.tasks).toHaveLength(1);
		});
	});

	describe("getHorizonSummary()", () => {
		it("returns horizon with sectionsPlanned and sectionsPending", () => {
			// Arrange
			const specProgressPath = path.join(
				tempDir,
				".chorus",
				"specs",
				"spec-progress.json",
			);
			fs.mkdirSync(path.dirname(specProgressPath), { recursive: true });
			fs.writeFileSync(
				specProgressPath,
				JSON.stringify({
					"test-spec.md": {
						"Section 1": { status: "tasked", taskIds: ["ch-001"] },
						"Section 2": { status: "tasked", taskIds: ["ch-002"] },
						"Section 3": { status: "draft", taskIds: [] },
					},
				}),
			);

			// Act
			const summary = manager.getHorizonSummary();

			// Assert
			expect(summary.horizon).toBe(1);
			expect(summary.sectionsPlanned).toBe(2);
			expect(summary.sectionsPending).toBe(1);
		});

		it("returns zeros when no spec progress exists", () => {
			// Arrange - no spec-progress.json

			// Act
			const summary = manager.getHorizonSummary();

			// Assert
			expect(summary.horizon).toBe(1);
			expect(summary.sectionsPlanned).toBe(0);
			expect(summary.sectionsPending).toBe(0);
		});
	});

	describe("Config Loading", () => {
		it("loads initialTaskCount from config.json", () => {
			// Arrange
			const configPath = path.join(tempDir, ".chorus", "config.json");
			fs.writeFileSync(
				configPath,
				JSON.stringify({
					version: "1.0",
					mode: "semi-auto",
					agents: { default: "claude" },
					project: { taskIdPrefix: "ch" },
					qualityCommands: [],
					planningHorizon: {
						initialTaskCount: 15,
						minReadyTasks: 5,
					},
				}),
			);

			// Act
			const managerWithConfig = new PlanningHorizonManager(tempDir);
			const config = managerWithConfig.getHorizonConfig();

			// Assert
			expect(config.initialTaskCount).toBe(15);
			expect(config.minReadyTasks).toBe(5);
		});

		it("uses defaults when planningHorizon not in config", () => {
			// Arrange
			const configPath = path.join(tempDir, ".chorus", "config.json");
			fs.writeFileSync(
				configPath,
				JSON.stringify({
					version: "1.0",
					mode: "semi-auto",
					agents: { default: "claude" },
					project: { taskIdPrefix: "ch" },
					qualityCommands: [],
				}),
			);

			// Act
			const managerWithConfig = new PlanningHorizonManager(tempDir);
			const config = managerWithConfig.getHorizonConfig();

			// Assert
			expect(config.initialTaskCount).toBe(10); // default
			expect(config.minReadyTasks).toBe(3); // default
		});
	});
});
