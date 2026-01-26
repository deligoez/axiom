import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { reviewRegionMachine } from "./reviewRegion.js";

describe("reviewRegionMachine", () => {
	describe("initial state", () => {
		it("starts in idle state with empty pendingReviews", () => {
			// Arrange & Act
			const actor = createActor(reviewRegionMachine);
			actor.start();

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			expect(actor.getSnapshot().context.pendingReviews).toEqual([]);
			expect(actor.getSnapshot().context.currentBatch).toEqual([]);
			expect(actor.getSnapshot().context.currentIndex).toBe(0);
			actor.stop();
		});
	});

	describe("TASK_COMPLETED event", () => {
		it("adds task to pendingReviews", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();

			// Act
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});

			// Assert
			expect(actor.getSnapshot().context.pendingReviews).toHaveLength(1);
			expect(actor.getSnapshot().context.pendingReviews[0].taskId).toBe(
				"task-1",
			);
			actor.stop();
		});
	});

	describe("START_REVIEW event", () => {
		it("does nothing when no reviews pending (guard)", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();

			// Act
			actor.send({ type: "START_REVIEW" });

			// Assert - should stay in idle
			expect(actor.getSnapshot().value).toBe("idle");
			expect(actor.getSnapshot().context.currentBatch).toEqual([]);
			actor.stop();
		});

		it("snapshots pendingReviews into currentBatch and transitions to reviewingSummary", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});

			// Act
			actor.send({ type: "START_REVIEW" });

			// Assert
			expect(actor.getSnapshot().value).toBe("reviewingSummary");
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(2);
			expect(actor.getSnapshot().context.currentBatch[0].taskId).toBe("task-1");
			expect(actor.getSnapshot().context.currentBatch[1].taskId).toBe("task-2");
			actor.stop();
		});

		it("new tasks during review NOT added to currentBatch (snapshot behavior)", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });

			// Act - add new task during review
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});

			// Assert - currentBatch unchanged, pendingReviews has new task
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(1);
			expect(actor.getSnapshot().context.pendingReviews).toHaveLength(2);
			actor.stop();
		});
	});

	describe("START_REVIEW_SINGLE event", () => {
		it("transitions to reviewingTask with single task in currentBatch", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});

			// Act
			actor.send({ type: "START_REVIEW_SINGLE", taskId: "task-2" });

			// Assert
			expect(actor.getSnapshot().value).toBe("reviewingTask");
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(1);
			expect(actor.getSnapshot().context.currentBatch[0].taskId).toBe("task-2");
			expect(actor.getSnapshot().context.currentIndex).toBe(0);
			actor.stop();
		});
	});

	describe("summary to task navigation", () => {
		it("START_ONE_BY_ONE transitions from summary to task review", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });

			// Act
			actor.send({ type: "START_ONE_BY_ONE" });

			// Assert
			expect(actor.getSnapshot().value).toBe("reviewingTask");
			expect(actor.getSnapshot().context.currentIndex).toBe(0);
			actor.stop();
		});

		it("JUMP_TO_TASK sets currentIndex and transitions to task review", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });

			// Act
			actor.send({ type: "JUMP_TO_TASK", index: 1 });

			// Assert
			expect(actor.getSnapshot().value).toBe("reviewingTask");
			expect(actor.getSnapshot().context.currentIndex).toBe(1);
			actor.stop();
		});
	});

	describe("task review actions", () => {
		it("APPROVE removes task from pending AND currentBatch", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });

			// Act
			actor.send({ type: "APPROVE" });

			// Assert
			expect(actor.getSnapshot().context.pendingReviews).toHaveLength(1);
			expect(actor.getSnapshot().context.pendingReviews[0].taskId).toBe(
				"task-2",
			);
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(1);
			expect(actor.getSnapshot().context.currentBatch[0].taskId).toBe("task-2");
			actor.stop();
		});

		it("REDO transitions to feedbackModal", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });

			// Act
			actor.send({ type: "REDO" });

			// Assert
			expect(actor.getSnapshot().value).toBe("feedbackModal");
			actor.stop();
		});

		it("REJECT removes task from pending and currentBatch", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });

			// Act
			actor.send({ type: "REJECT" });

			// Assert
			expect(actor.getSnapshot().context.pendingReviews).toHaveLength(1);
			expect(actor.getSnapshot().context.pendingReviews[0].taskId).toBe(
				"task-2",
			);
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(1);
			actor.stop();
		});
	});

	describe("task navigation", () => {
		it("NEXT updates currentIndex within bounds", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });
			expect(actor.getSnapshot().context.currentIndex).toBe(0);

			// Act
			actor.send({ type: "NEXT" });

			// Assert
			expect(actor.getSnapshot().context.currentIndex).toBe(1);

			// Act - NEXT at last item stays at last
			actor.send({ type: "NEXT" });
			expect(actor.getSnapshot().context.currentIndex).toBe(1);
			actor.stop();
		});

		it("PREV updates currentIndex within bounds", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-2",
				result: {
					taskId: "task-2",
					agentId: "agent-2",
					iterations: 2,
					duration: 200,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });
			actor.send({ type: "NEXT" });
			expect(actor.getSnapshot().context.currentIndex).toBe(1);

			// Act
			actor.send({ type: "PREV" });

			// Assert
			expect(actor.getSnapshot().context.currentIndex).toBe(0);

			// Act - PREV at first item stays at first
			actor.send({ type: "PREV" });
			expect(actor.getSnapshot().context.currentIndex).toBe(0);
			actor.stop();
		});

		it("BACK returns to summary from task review", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			actor.send({ type: "START_ONE_BY_ONE" });

			// Act
			actor.send({ type: "BACK" });

			// Assert
			expect(actor.getSnapshot().value).toBe("reviewingSummary");
			actor.stop();
		});
	});

	describe("CANCEL event", () => {
		it("clears currentBatch and returns to idle", () => {
			// Arrange
			const actor = createActor(reviewRegionMachine);
			actor.start();
			actor.send({
				type: "TASK_COMPLETED",
				taskId: "task-1",
				result: {
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 1,
					duration: 100,
					signal: null,
					quality: [],
					changes: [],
				},
			});
			actor.send({ type: "START_REVIEW" });
			expect(actor.getSnapshot().context.currentBatch).toHaveLength(1);

			// Act
			actor.send({ type: "CANCEL" });

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			expect(actor.getSnapshot().context.currentBatch).toEqual([]);
			// pendingReviews should still have the task (not removed)
			expect(actor.getSnapshot().context.pendingReviews).toHaveLength(1);
			actor.stop();
		});
	});
});
