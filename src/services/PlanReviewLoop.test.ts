import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanReviewConfig } from "../types/config.js";
import type { Learning } from "../types/learning.js";
import { PlanReviewLoop, type TaskUpdate } from "./PlanReviewLoop.js";

// Mock dependencies
const mockPlanAgent = {
	start: vi.fn(),
	stop: vi.fn(),
	send: vi.fn(),
	setMockResponse: vi.fn(),
};

const mockSessionLogger = {
	log: vi.fn(),
};

const mockTaskLister = {
	listAll: vi.fn(),
};

function createMockLearning(overrides: Partial<Learning> = {}): Learning {
	return {
		id: "learning-1",
		content: "Test learning content",
		scope: "cross-cutting",
		category: "architecture",
		source: {
			taskId: "ch-test1",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
		...overrides,
	};
}

function createMockConfig(
	overrides: Partial<PlanReviewConfig> = {},
): PlanReviewConfig {
	return {
		enabled: true,
		maxIterations: 3,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "none",
		requireApproval: ["redundant"],
		...overrides,
	};
}

describe("PlanReviewLoop", () => {
	let loop: PlanReviewLoop;
	let learning: Learning;
	let config: PlanReviewConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock: return empty updates (no changes)
		mockPlanAgent.send.mockResolvedValue(
			JSON.stringify({ updates: [], redundant: [], unchanged: ["ch-task1"] }),
		);

		// Default mock: return some non-closed tasks
		mockTaskLister.listAll.mockResolvedValue([
			{ id: "ch-task1", status: "open", title: "Task 1" },
			{ id: "ch-task2", status: "in_progress", title: "Task 2" },
			{ id: "ch-task3", status: "closed", title: "Task 3" },
		]);

		loop = new PlanReviewLoop({
			planAgent: mockPlanAgent as never,
			sessionLogger: mockSessionLogger as never,
			taskLister: mockTaskLister as never,
		});

		learning = createMockLearning();
		config = createMockConfig();
	});

	describe("runPlanReviewLoop", () => {
		it("executes review iterations and returns result", async () => {
			// Arrange
			mockPlanAgent.send.mockResolvedValue(
				JSON.stringify({
					updates: [],
					redundant: [],
					unchanged: ["ch-task1", "ch-task2"],
				}),
			);

			// Act
			const result = await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(result.iterations).toBe(1);
			expect(result.totalUpdates).toEqual([]);
			expect(result.earlyStop).toBe(true);
		});

		it("spawns Plan Agent with review prompt including learning and tasks", async () => {
			// Arrange - already set up in beforeEach

			// Act
			await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(mockPlanAgent.start).toHaveBeenCalled();
			expect(mockPlanAgent.send).toHaveBeenCalled();
			const prompt = mockPlanAgent.send.mock.calls[0][0];
			expect(prompt).toContain("Test learning content");
			expect(prompt).toContain("ch-task1"); // non-closed task
			expect(prompt).toContain("ch-task2"); // non-closed task
			expect(prompt).not.toContain("ch-task3"); // closed task excluded
		});

		it("parses Plan Agent JSON response with updates", async () => {
			// Arrange
			const update: TaskUpdate = {
				taskId: "ch-task1",
				field: "description",
				oldValue: "old desc",
				newValue: "new desc",
			};
			mockPlanAgent.send
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [update],
						redundant: [],
						unchanged: ["ch-task2"],
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [],
						redundant: [],
						unchanged: ["ch-task1", "ch-task2"],
					}),
				);

			// Act
			const result = await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(result.totalUpdates).toHaveLength(1);
			expect(result.totalUpdates[0]).toEqual(update);
		});

		it("terminates when updates.length === 0", async () => {
			// Arrange - first iteration has updates, second has none
			mockPlanAgent.send
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [
							{ taskId: "ch-task1", field: "title", newValue: "Updated" },
						],
						redundant: [],
						unchanged: [],
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [],
						redundant: [],
						unchanged: ["ch-task1"],
					}),
				);

			// Act
			const result = await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(result.iterations).toBe(2);
			expect(result.earlyStop).toBe(true);
			expect(mockPlanAgent.send).toHaveBeenCalledTimes(2);
		});

		it("terminates when iteration count reaches maxIterations", async () => {
			// Arrange - always return updates (never converge)
			mockPlanAgent.send.mockResolvedValue(
				JSON.stringify({
					updates: [{ taskId: "ch-task1", field: "title", newValue: "Update" }],
					redundant: [],
					unchanged: [],
				}),
			);
			const limitedConfig = createMockConfig({ maxIterations: 2 });

			// Act
			const result = await loop.runPlanReviewLoop(learning, limitedConfig);

			// Assert
			expect(result.iterations).toBe(2);
			expect(result.earlyStop).toBe(false);
			expect(mockPlanAgent.send).toHaveBeenCalledTimes(2);
		});

		it("returns aggregated results from all iterations", async () => {
			// Arrange - multiple iterations with different updates
			mockPlanAgent.send
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [{ taskId: "ch-task1", field: "title", newValue: "V1" }],
						redundant: ["ch-old1"],
						unchanged: [],
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [{ taskId: "ch-task2", field: "title", newValue: "V2" }],
						redundant: ["ch-old2"],
						unchanged: [],
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [],
						redundant: [],
						unchanged: ["ch-task1", "ch-task2"],
					}),
				);

			// Act
			const result = await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(result.iterations).toBe(3);
			expect(result.totalUpdates).toHaveLength(2);
			expect(result.redundantTasks).toEqual(["ch-old1", "ch-old2"]);
		});

		it("logs each iteration to session log", async () => {
			// Arrange
			mockPlanAgent.send
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [{ taskId: "ch-task1", field: "x", newValue: "y" }],
						redundant: [],
						unchanged: [],
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						updates: [],
						redundant: [],
						unchanged: ["ch-task1"],
					}),
				);

			// Act
			await loop.runPlanReviewLoop(learning, config);

			// Assert
			const logCalls = mockSessionLogger.log.mock.calls;
			expect(logCalls.length).toBeGreaterThanOrEqual(2);

			// Check iteration logs
			const iterationLogs = logCalls.filter(
				(call) => call[0].eventType === "plan_review_iteration",
			);
			expect(iterationLogs).toHaveLength(2);
			expect(iterationLogs[0][0].details.iteration).toBe(1);
			expect(iterationLogs[0][0].details.changesCount).toBe(1);
			expect(iterationLogs[1][0].details.iteration).toBe(2);
			expect(iterationLogs[1][0].details.changesCount).toBe(0);
		});

		it("stops Plan Agent when loop completes", async () => {
			// Arrange - set up in beforeEach

			// Act
			await loop.runPlanReviewLoop(learning, config);

			// Assert
			expect(mockPlanAgent.stop).toHaveBeenCalled();
		});
	});
});
