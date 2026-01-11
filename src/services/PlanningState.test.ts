import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningState, type PlanningStateData } from "./PlanningState.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	mkdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);

describe("PlanningState", () => {
	let service: PlanningState;
	const projectDir = "/test/project";

	beforeEach(() => {
		vi.clearAllMocks();
		service = new PlanningState(projectDir);
	});

	describe("save", () => {
		it("writes state to .chorus/planning-state.json", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			const state: PlanningStateData = {
				status: "planning",
				planSummary: { userGoal: "Add feature", estimatedTasks: 5 },
				tasks: [],
				reviewIterations: [],
			};

			// Act
			service.save(state);

			// Assert
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				"/test/project/.chorus/planning-state.json",
				expect.any(String),
				"utf-8",
			);
		});

		it("creates parent directory if not exists", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);
			const state: PlanningStateData = {
				status: "planning",
				planSummary: { userGoal: "Add feature", estimatedTasks: 5 },
				tasks: [],
				reviewIterations: [],
			};

			// Act
			service.save(state);

			// Assert
			expect(mockMkdirSync).toHaveBeenCalledWith("/test/project/.chorus", {
				recursive: true,
			});
		});
	});

	describe("load", () => {
		it("reads and parses state from file", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "planning",
				planSummary: { userGoal: "Add feature", estimatedTasks: 5 },
				tasks: [],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result).toEqual(state);
		});

		it("returns null if file does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const result = service.load();

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("state structure", () => {
		it("state includes status field", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "reviewing",
				planSummary: { userGoal: "Test", estimatedTasks: 3 },
				tasks: [],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result?.status).toBe("reviewing");
		});

		it("state includes chosenMode field when status=ready", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "ready",
				chosenMode: "semi-auto",
				planSummary: { userGoal: "Test", estimatedTasks: 3 },
				tasks: [],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result?.chosenMode).toBe("semi-auto");
		});

		it("state includes planSummary field", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "planning",
				planSummary: { userGoal: "Build API", estimatedTasks: 10 },
				tasks: [],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result?.planSummary.userGoal).toBe("Build API");
			expect(result?.planSummary.estimatedTasks).toBe(10);
		});

		it("state includes tasks array", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "planning",
				planSummary: { userGoal: "Test", estimatedTasks: 2 },
				tasks: [
					{ id: "task-1", title: "First task" },
					{ id: "task-2", title: "Second task" },
				],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result?.tasks).toHaveLength(2);
			expect(result?.tasks[0].id).toBe("task-1");
		});

		it("state includes reviewIterations history array", () => {
			// Arrange
			const state: PlanningStateData = {
				status: "reviewing",
				planSummary: { userGoal: "Test", estimatedTasks: 3 },
				tasks: [],
				reviewIterations: [
					{ timestamp: "2026-01-11T10:00:00Z", feedback: "Looks good" },
				],
			};
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(JSON.stringify(state));

			// Act
			const result = service.load();

			// Assert
			expect(result?.reviewIterations).toHaveLength(1);
			expect(result?.reviewIterations[0].feedback).toBe("Looks good");
		});
	});

	describe("validation", () => {
		it("validates chosenMode is present when status=ready or implementation", () => {
			// Arrange - state missing chosenMode when status=ready
			const invalidState = {
				status: "ready",
				planSummary: { userGoal: "Test", estimatedTasks: 3 },
				tasks: [],
				reviewIterations: [],
			};
			mockExistsSync.mockReturnValue(true);

			// Act & Assert
			expect(() => service.save(invalidState as PlanningStateData)).toThrow(
				"chosenMode is required",
			);
		});
	});
});
