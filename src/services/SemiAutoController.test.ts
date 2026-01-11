import { beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";
import { SemiAutoController } from "./SemiAutoController.js";

describe("SemiAutoController", () => {
	// Machine State - 4 tests
	describe("Machine State", () => {
		it("initial orchestration state is 'idle'", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" } },
			});
			actor.start();

			// Act
			const snapshot = actor.getSnapshot();

			// Assert
			expect(snapshot.matches({ orchestration: "idle" })).toBe(true);
		});

		it("SPAWN_AGENT transitions idle → running", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" } },
			});
			actor.start();

			// Act
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Assert
			expect(actor.getSnapshot().matches({ orchestration: "running" })).toBe(
				true,
			);
		});

		it("last AGENT_COMPLETED transitions running → idle", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" } },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Act
			actor.send({
				type: "AGENT_COMPLETED",
				agentId: "agent-ch-001",
				taskId: "ch-001",
			});

			// Assert
			expect(actor.getSnapshot().matches({ orchestration: "idle" })).toBe(true);
		});

		it("STOP_ALL transitions any → idle", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-002" });

			// Act
			actor.send({ type: "STOP_ALL" });

			// Assert
			expect(actor.getSnapshot().matches({ orchestration: "idle" })).toBe(true);
		});
	});

	// Slot Management (via guards) - 3 tests
	describe("Slot Management", () => {
		it("guard 'hasAvailableSlot' blocks SPAWN_AGENT when full", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 1 },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Act - try to spawn another when at max
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-002" });

			// Assert - should still be 1 acquired slot
			const snapshot = actor.getSnapshot();
			expect(snapshot.context.acquiredSlots).toBe(1);
			expect(snapshot.context.activeTaskIds).toHaveLength(1);
		});

		it("action 'claimSlot' decrements available slots", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();

			// Act
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Assert
			expect(actor.getSnapshot().context.acquiredSlots).toBe(1);
		});

		it("action 'releaseSlot' increments available slots on completion", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });
			expect(actor.getSnapshot().context.acquiredSlots).toBe(1);

			// Act
			actor.send({
				type: "AGENT_COMPLETED",
				agentId: "agent-ch-001",
				taskId: "ch-001",
			});

			// Assert
			expect(actor.getSnapshot().context.acquiredSlots).toBe(0);
		});
	});

	// Active Task Tracking - 3 tests
	describe("Active Task Tracking", () => {
		it("'trackActiveTask' adds taskId to context.activeTaskIds", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" } },
			});
			actor.start();

			// Act
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Assert
			expect(actor.getSnapshot().context.activeTaskIds).toContain("ch-001");
		});

		it("'removeActiveTask' removes taskId on completion", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" } },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });

			// Act
			actor.send({
				type: "AGENT_COMPLETED",
				agentId: "agent-ch-001",
				taskId: "ch-001",
			});

			// Assert
			expect(actor.getSnapshot().context.activeTaskIds).not.toContain("ch-001");
		});

		it("'clearActiveTasks' empties array on STOP_ALL", () => {
			// Arrange
			const actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });
			actor.send({ type: "SPAWN_AGENT", taskId: "ch-002" });
			expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(2);

			// Act
			actor.send({ type: "STOP_ALL" });

			// Assert
			expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(0);
		});
	});

	// Controller Wrapper - 4 tests
	describe("Controller Wrapper", () => {
		let actor: ReturnType<typeof createActor<typeof chorusMachine>>;
		let controller: SemiAutoController;

		beforeEach(() => {
			actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();
			controller = new SemiAutoController(actor);
		});

		it("startTask() returns Result with slot error when full", () => {
			// Arrange
			const singleSlotActor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 1 },
			});
			singleSlotActor.start();
			singleSlotActor.send({ type: "SPAWN_AGENT", taskId: "ch-001" });
			const singleSlotController = new SemiAutoController(singleSlotActor);

			// Act
			const result = singleSlotController.startTask("ch-002");

			// Assert
			expect(result.isErr()).toBe(true);
			expect(result.error?.type).toBe("NO_SLOTS_AVAILABLE");
		});

		it("cancelTask() sends STOP_AGENT event", () => {
			// Arrange
			controller.startTask("ch-001");
			expect(actor.getSnapshot().context.activeTaskIds).toContain("ch-001");

			// Act
			controller.cancelTask("ch-001", "agent-ch-001");

			// Assert
			expect(actor.getSnapshot().context.activeTaskIds).not.toContain("ch-001");
		});

		it("cancelAll() sends STOP_ALL event", () => {
			// Arrange
			controller.startTask("ch-001");
			controller.startTask("ch-002");
			expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(2);

			// Act
			controller.cancelAll();

			// Assert
			expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(0);
		});

		it("getStatus() returns current state from machine", () => {
			// Arrange
			controller.startTask("ch-001");
			controller.startTask("ch-002");

			// Act
			const status = controller.getStatus();

			// Assert
			expect(status.activeTaskIds).toEqual(["ch-001", "ch-002"]);
			expect(status.acquiredSlots).toBe(2);
		});
	});

	// Helper Methods - 2 tests
	describe("Helper Methods", () => {
		let actor: ReturnType<typeof createActor<typeof chorusMachine>>;
		let controller: SemiAutoController;

		beforeEach(() => {
			actor = createActor(chorusMachine, {
				input: { config: { projectRoot: "/test" }, maxAgents: 3 },
			});
			actor.start();
			controller = new SemiAutoController(actor);
		});

		it("isIdle() returns true when no active tasks", () => {
			// Arrange - no tasks spawned

			// Act
			const result = controller.isIdle();

			// Assert
			expect(result).toBe(true);
		});

		it("getActiveTaskCount() reads from context", () => {
			// Arrange
			controller.startTask("ch-001");
			controller.startTask("ch-002");

			// Act
			const count = controller.getActiveTaskCount();

			// Assert
			expect(count).toBe(2);
		});
	});
});
