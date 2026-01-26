import { describe, expect, it, vi } from "vitest";
import type { PlanReviewConfig } from "../types/config.js";
import type { Learning } from "../types/learning.js";
import { PlanReviewTrigger } from "./PlanReviewTrigger.js";

describe("PlanReviewTrigger", () => {
	const mockLogger = {
		log: vi.fn(),
	};

	const createLearning = (
		scope: "local" | "cross-cutting" | "architectural",
	): Learning => ({
		id: "learning-001",
		content: "Test learning content",
		scope,
		category: "testing",
		source: {
			taskId: "ch-001",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
	});

	const defaultConfig: PlanReviewConfig = {
		enabled: true,
		maxIterations: 5,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "minor",
		requireApproval: ["redundant", "dependency_change"],
	};

	describe("shouldTriggerReview", () => {
		it("should return false when planReview.enabled is false", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("cross-cutting");
			const config = { ...defaultConfig, enabled: false };

			// Act
			const result = trigger.shouldTriggerReview(learning, config);

			// Assert
			expect(result).toBe(false);
		});

		it("should return false for LOCAL learnings", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("local");

			// Act
			const result = trigger.shouldTriggerReview(learning, defaultConfig);

			// Assert
			expect(result).toBe(false);
		});

		it("should return true for CROSS_CUTTING when configured in triggerOn", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("cross-cutting");

			// Act
			const result = trigger.shouldTriggerReview(learning, defaultConfig);

			// Assert
			expect(result).toBe(true);
		});

		it("should return true for ARCHITECTURAL when configured in triggerOn", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("architectural");

			// Act
			const result = trigger.shouldTriggerReview(learning, defaultConfig);

			// Assert
			expect(result).toBe(true);
		});

		it("should return false for CROSS_CUTTING when not in triggerOn", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("cross-cutting");
			const config = { ...defaultConfig, triggerOn: ["architectural"] };

			// Act
			const result = trigger.shouldTriggerReview(learning, config);

			// Assert
			expect(result).toBe(false);
		});

		it("should return false for ARCHITECTURAL when not in triggerOn", () => {
			// Arrange
			const trigger = new PlanReviewTrigger(mockLogger);
			const learning = createLearning("architectural");
			const config = { ...defaultConfig, triggerOn: ["cross_cutting"] };

			// Act
			const result = trigger.shouldTriggerReview(learning, config);

			// Assert
			expect(result).toBe(false);
		});

		it("should log trigger decision to session log", () => {
			// Arrange
			const logger = { log: vi.fn() };
			const trigger = new PlanReviewTrigger(logger);
			const learning = createLearning("cross-cutting");

			// Act
			trigger.shouldTriggerReview(learning, defaultConfig);

			// Assert
			expect(logger.log).toHaveBeenCalled();
			expect(logger.log).toHaveBeenCalledWith(
				expect.stringContaining("Plan review trigger"),
			);
		});
	});
});
