import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { sprintRegionMachine } from "./sprintRegion.js";

describe("sprintRegionMachine", () => {
	describe("initial state", () => {
		it("starts in idle state with empty stats", () => {
			// Arrange & Act
			const actor = createActor(sprintRegionMachine);
			actor.start();

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			expect(actor.getSnapshot().context.tasksCompleted).toBe(0);
			expect(actor.getSnapshot().context.tasksFailed).toBe(0);
			actor.stop();
		});
	});

	describe("START_PLANNING event", () => {
		it("transitions from idle to planning", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();

			// Act
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});

			// Assert
			expect(actor.getSnapshot().value).toBe("planning");
			expect(actor.getSnapshot().context.target?.type).toBe("taskCount");
			actor.stop();
		});
	});

	describe("START_SPRINT event", () => {
		it("transitions from planning to running", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 3 },
			});

			// Act
			actor.send({ type: "START_SPRINT" });

			// Assert
			expect(actor.getSnapshot().value).toBe("running");
			actor.stop();
		});
	});

	describe("TASK_COMPLETED event", () => {
		it("increments tasksCompleted count", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});
			actor.send({ type: "START_SPRINT" });

			// Act
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-001" });

			// Assert
			expect(actor.getSnapshot().context.tasksCompleted).toBe(1);
			actor.stop();
		});

		it("transitions to completed when taskCount target reached", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 2 },
			});
			actor.send({ type: "START_SPRINT" });
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-001" });

			// Act
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-002" });

			// Assert
			expect(actor.getSnapshot().value).toBe("completed");
			actor.stop();
		});
	});

	describe("TASK_FAILED event", () => {
		it("increments tasksFailed count", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});
			actor.send({ type: "START_SPRINT" });

			// Act
			actor.send({ type: "TASK_FAILED", taskId: "ch-fail" });

			// Assert
			expect(actor.getSnapshot().context.tasksFailed).toBe(1);
			actor.stop();
		});
	});

	describe("PAUSE event", () => {
		it("transitions from running to paused", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});
			actor.send({ type: "START_SPRINT" });

			// Act
			actor.send({ type: "PAUSE" });

			// Assert
			expect(actor.getSnapshot().value).toBe("paused");
			actor.stop();
		});
	});

	describe("RESUME event", () => {
		it("transitions from paused to running", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});
			actor.send({ type: "START_SPRINT" });
			actor.send({ type: "PAUSE" });

			// Act
			actor.send({ type: "RESUME" });

			// Assert
			expect(actor.getSnapshot().value).toBe("running");
			actor.stop();
		});
	});

	describe("CANCEL event", () => {
		it("transitions from running to idle and resets state", () => {
			// Arrange
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "taskCount", count: 5 },
			});
			actor.send({ type: "START_SPRINT" });
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-001" });

			// Act
			actor.send({ type: "CANCEL" });

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			expect(actor.getSnapshot().context.tasksCompleted).toBe(0);
			expect(actor.getSnapshot().context.target).toBeNull();
			actor.stop();
		});
	});

	describe("completion guards", () => {
		it("does not complete when noReady target and tasks still available", () => {
			// Arrange - noReady target means run until no ready tasks
			const actor = createActor(sprintRegionMachine);
			actor.start();
			actor.send({
				type: "START_PLANNING",
				target: { type: "noReady" },
			});
			actor.send({ type: "START_SPRINT" });

			// Act - complete a task
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-001" });

			// Assert - should stay running (noReady target doesn't auto-complete on count)
			expect(actor.getSnapshot().value).toBe("running");
			expect(actor.getSnapshot().context.tasksCompleted).toBe(1);
			actor.stop();
		});
	});
});
