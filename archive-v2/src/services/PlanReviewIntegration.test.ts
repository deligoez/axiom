import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanReviewConfig } from "../types/config.js";
import type { Learning } from "../types/learning.js";
import type { CategorizationResult } from "./LearningCategorizer.js";
import { PlanReviewIntegration } from "./PlanReviewIntegration.js";
import type { PlanReviewResult } from "./PlanReviewLoop.js";
import type { ApplyResult } from "./TaskUpdater.js";

// Mock dependencies
const mockLearningExtractor = {
	parse: vi.fn(),
};

const mockLearningCategorizer = {
	categorize: vi.fn(),
};

const mockPlanReviewTrigger = {
	shouldTriggerReview: vi.fn(),
};

const mockPlanReviewLoop = {
	runPlanReviewLoop: vi.fn(),
};

const mockTaskUpdater = {
	applyTaskUpdates: vi.fn(),
};

const mockSessionLogger = {
	log: vi.fn(),
};

function createMockConfig(
	overrides: Partial<PlanReviewConfig> = {},
): PlanReviewConfig {
	return {
		enabled: true,
		maxIterations: 3,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "minor",
		requireApproval: ["redundant"],
		...overrides,
	};
}

function createMockLearning(overrides: Partial<Learning> = {}): Learning {
	return {
		id: "learn-1",
		content: "Test learning",
		scope: "local",
		category: "general",
		source: {
			taskId: "ch-task1",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
		...overrides,
	};
}

function createMockCategorizationResult(
	overrides: Partial<CategorizationResult> = {},
): CategorizationResult {
	return {
		scope: "local",
		confidence: "default",
		...overrides,
	};
}

function createMockPlanReviewResult(
	overrides: Partial<PlanReviewResult> = {},
): PlanReviewResult {
	return {
		iterations: 1,
		totalUpdates: [],
		redundantTasks: [],
		earlyStop: true,
		...overrides,
	};
}

function createMockApplyResult(
	overrides: Partial<ApplyResult> = {},
): ApplyResult {
	return {
		applied: [],
		pending: [],
		queued: [],
		failed: [],
		...overrides,
	};
}

describe("PlanReviewIntegration", () => {
	let integration: PlanReviewIntegration;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLearningExtractor.parse.mockReturnValue([]);
		mockLearningCategorizer.categorize.mockReturnValue(
			createMockCategorizationResult(),
		);
		mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(false);
		mockPlanReviewLoop.runPlanReviewLoop.mockResolvedValue(
			createMockPlanReviewResult(),
		);
		mockTaskUpdater.applyTaskUpdates.mockResolvedValue(createMockApplyResult());

		integration = new PlanReviewIntegration({
			learningExtractor: mockLearningExtractor as never,
			learningCategorizer: mockLearningCategorizer as never,
			planReviewTrigger: mockPlanReviewTrigger as never,
			planReviewLoop: mockPlanReviewLoop as never,
			taskUpdater: mockTaskUpdater as never,
			sessionLogger: mockSessionLogger as never,
		});
	});

	describe("onTaskComplete - Learning Extraction", () => {
		it("extracts learnings from task output", async () => {
			// Arrange
			const taskId = "ch-task1";
			const output = "### Learnings\n- Test learning";
			const config = createMockConfig();
			mockLearningExtractor.parse.mockReturnValue([createMockLearning()]);

			// Act
			await integration.onTaskComplete(taskId, output, "claude", config);

			// Assert
			expect(mockLearningExtractor.parse).toHaveBeenCalledWith(
				output,
				taskId,
				"claude",
			);
		});

		it("categorizes each extracted learning", async () => {
			// Arrange
			const learnings = [
				createMockLearning({ id: "learn-1", content: "Learning 1" }),
				createMockLearning({ id: "learn-2", content: "Learning 2" }),
			];
			mockLearningExtractor.parse.mockReturnValue(learnings);
			mockLearningCategorizer.categorize.mockReturnValue(
				createMockCategorizationResult({ scope: "cross-cutting" }),
			);

			// Act
			await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(mockLearningCategorizer.categorize).toHaveBeenCalledTimes(2);
			expect(mockLearningCategorizer.categorize).toHaveBeenCalledWith(
				"Learning 1",
			);
			expect(mockLearningCategorizer.categorize).toHaveBeenCalledWith(
				"Learning 2",
			);
		});
	});

	describe("onTaskComplete - Review Triggering", () => {
		it("checks if review should trigger for each learning", async () => {
			// Arrange
			const learnings = [
				createMockLearning({ id: "learn-1", scope: "cross-cutting" }),
			];
			mockLearningExtractor.parse.mockReturnValue(learnings);

			// Act
			await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(mockPlanReviewTrigger.shouldTriggerReview).toHaveBeenCalledWith(
				expect.objectContaining({ id: "learn-1" }),
				expect.any(Object),
			);
		});

		it("runs review loop when trigger returns true", async () => {
			// Arrange
			const learning = createMockLearning({ scope: "cross-cutting" });
			mockLearningExtractor.parse.mockReturnValue([learning]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(true);

			// Act
			await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(mockPlanReviewLoop.runPlanReviewLoop).toHaveBeenCalled();
		});

		it("skips review loop when trigger returns false", async () => {
			// Arrange
			mockLearningExtractor.parse.mockReturnValue([createMockLearning()]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(false);

			// Act
			await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(mockPlanReviewLoop.runPlanReviewLoop).not.toHaveBeenCalled();
		});
	});

	describe("onTaskComplete - Update Application", () => {
		it("applies updates via TaskUpdater after review", async () => {
			// Arrange
			const learning = createMockLearning({ scope: "architectural" });
			mockLearningExtractor.parse.mockReturnValue([learning]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(true);
			const reviewResult = createMockPlanReviewResult({
				totalUpdates: [
					{ taskId: "ch-task2", field: "description", newValue: "Updated" },
				],
			});
			mockPlanReviewLoop.runPlanReviewLoop.mockResolvedValue(reviewResult);
			const config = createMockConfig();

			// Act
			await integration.onTaskComplete("ch-task1", "output", "claude", config);

			// Assert
			expect(mockTaskUpdater.applyTaskUpdates).toHaveBeenCalledWith(
				reviewResult,
				config,
			);
		});

		it("returns applied updates in result", async () => {
			// Arrange
			const learning = createMockLearning({ scope: "cross-cutting" });
			mockLearningExtractor.parse.mockReturnValue([learning]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(true);
			mockPlanReviewLoop.runPlanReviewLoop.mockResolvedValue(
				createMockPlanReviewResult(),
			);
			const applyResult = createMockApplyResult({
				applied: [
					{ taskId: "ch-task2", field: "title", newValue: "New title" },
				],
			});
			mockTaskUpdater.applyTaskUpdates.mockResolvedValue(applyResult);

			// Act
			const result = await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(result.updatesApplied).toBe(applyResult);
		});
	});

	describe("onTaskComplete - Logging", () => {
		it("logs complete pipeline to session log", async () => {
			// Arrange
			const learning = createMockLearning({ scope: "cross-cutting" });
			mockLearningExtractor.parse.mockReturnValue([learning]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(true);
			mockPlanReviewLoop.runPlanReviewLoop.mockResolvedValue(
				createMockPlanReviewResult({ iterations: 2 }),
			);
			mockTaskUpdater.applyTaskUpdates.mockResolvedValue(
				createMockApplyResult({
					applied: [{ taskId: "x", field: "y", newValue: "z" }],
				}),
			);

			// Act
			await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(mockSessionLogger.log).toHaveBeenCalledWith({
				mode: "plan_review",
				eventType: "plan_review_complete",
				details: expect.objectContaining({
					taskId: "ch-task1",
					learningsExtracted: 1,
					reviewTriggered: true,
				}),
			});
		});
	});

	describe("onTaskComplete - Error Handling", () => {
		it("handles errors gracefully and continues", async () => {
			// Arrange
			mockLearningExtractor.parse.mockImplementation(() => {
				throw new Error("Parse error");
			});

			// Act
			const result = await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].stage).toBe("extraction");
			expect(result.errors[0].message).toContain("Parse error");
		});

		it("handles review loop errors gracefully", async () => {
			// Arrange
			mockLearningExtractor.parse.mockReturnValue([
				createMockLearning({ scope: "cross-cutting" }),
			]);
			mockPlanReviewTrigger.shouldTriggerReview.mockReturnValue(true);
			mockPlanReviewLoop.runPlanReviewLoop.mockRejectedValue(
				new Error("Loop error"),
			);

			// Act
			const result = await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].stage).toBe("review");
		});
	});

	describe("onTaskComplete - Result Structure", () => {
		it("returns complete result structure", async () => {
			// Arrange
			mockLearningExtractor.parse.mockReturnValue([
				createMockLearning({ scope: "local" }),
			]);

			// Act
			const result = await integration.onTaskComplete(
				"ch-task1",
				"output",
				"claude",
				createMockConfig(),
			);

			// Assert
			expect(result).toEqual({
				learningsExtracted: 1,
				reviewTriggered: false,
				updatesApplied: null,
				errors: [],
			});
		});
	});
});
