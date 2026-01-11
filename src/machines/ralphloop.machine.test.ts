import { describe, expect, it, vi } from "vitest";
import type { AnyActorRef } from "xstate";
import { createActor } from "xstate";
import { ralphLoopMachine } from "./ralphloop.machine.js";

// Mock parent ref
const createMockParentRef = () =>
	({
		send: vi.fn(),
		id: "parent",
	}) as unknown as AnyActorRef;

describe("RalphLoop Machine", () => {
	describe("State Transitions", () => {
		it("initial state is idle", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});

			// Act
			actor.start();

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			actor.stop();
		});

		it("START transitions idle to running", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();

			// Act
			actor.send({ type: "START" });

			// Assert
			expect(actor.getSnapshot().value).toBe("running");
			actor.stop();
		});

		it("STOP transitions any state to idle", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "STOP" });

			// Assert
			expect(actor.getSnapshot().value).toBe("idle");
			actor.stop();
		});

		it("PAUSE transitions running to paused", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "PAUSE" });

			// Assert
			expect(actor.getSnapshot().value).toBe("paused");
			actor.stop();
		});

		it("RESUME transitions paused to running", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });
			actor.send({ type: "PAUSE" });

			// Act
			actor.send({ type: "RESUME" });

			// Assert
			expect(actor.getSnapshot().value).toBe("running");
			actor.stop();
		});
	});

	describe("Error Handling", () => {
		it("ERROR increments consecutiveErrors", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef(), errorThreshold: 5 },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "ERROR", error: new Error("test") });

			// Assert
			expect(actor.getSnapshot().context.consecutiveErrors).toBe(1);
			actor.stop();
		});

		it("transitions to errorHalt when consecutiveErrors reaches threshold", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef(), errorThreshold: 2 },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "ERROR", error: new Error("test1") });
			actor.send({ type: "ERROR", error: new Error("test2") });

			// Assert
			expect(actor.getSnapshot().value).toBe("errorHalt");
			expect(actor.getSnapshot().context.consecutiveErrors).toBe(2);
			actor.stop();
		});

		it("TASK_COMPLETED resets consecutiveErrors to 0", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef(), errorThreshold: 5 },
			});
			actor.start();
			actor.send({ type: "START" });
			actor.send({ type: "ERROR", error: new Error("test") });
			actor.send({ type: "ERROR", error: new Error("test") });

			// Act
			actor.send({ type: "TASK_COMPLETED", taskId: "task-1" });

			// Assert
			expect(actor.getSnapshot().context.consecutiveErrors).toBe(0);
			actor.stop();
		});
	});

	describe("Stuck Detection", () => {
		it("AGENT_COMMITTED updates lastCommitTimes map", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({
				type: "AGENT_COMMITTED",
				agentId: "agent-1",
				commitHash: "abc123",
			});

			// Assert
			const lastCommitTimes = actor.getSnapshot().context.lastCommitTimes;
			expect(lastCommitTimes.has("agent-1")).toBe(true);
			actor.stop();
		});

		it("STUCK_AGENT_DETECTED transitions to stuck state", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "STUCK_AGENT_DETECTED", agentId: "agent-1" });

			// Assert
			expect(actor.getSnapshot().value).toBe("stuck");
			actor.stop();
		});
	});

	describe("Disk Monitoring", () => {
		it("DISK_FULL transitions to diskFull state", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "DISK_FULL" });

			// Assert
			expect(actor.getSnapshot().value).toBe("diskFull");
			actor.stop();
		});

		it("DISK_CLEARED transitions diskFull to running", () => {
			// Arrange
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: createMockParentRef() },
			});
			actor.start();
			actor.send({ type: "START" });
			actor.send({ type: "DISK_FULL" });

			// Act
			actor.send({ type: "DISK_CLEARED" });

			// Assert
			expect(actor.getSnapshot().value).toBe("running");
			actor.stop();
		});
	});

	describe("Parent Communication", () => {
		it("sends RALPHLOOP_HALTED on errorHalt entry", () => {
			// Arrange
			const parentSend = vi.fn();
			const mockParent = {
				send: parentSend,
				id: "parent",
			} as unknown as AnyActorRef;
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: mockParent, errorThreshold: 1 },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "ERROR", error: new Error("test") });

			// Assert
			expect(parentSend).toHaveBeenCalledWith({
				type: "RALPHLOOP_HALTED",
				reason: "errorThreshold",
			});
			actor.stop();
		});

		it("sends RALPHLOOP_STUCK on stuck entry", () => {
			// Arrange
			const parentSend = vi.fn();
			const mockParent = {
				send: parentSend,
				id: "parent",
			} as unknown as AnyActorRef;
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: mockParent },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "STUCK_AGENT_DETECTED", agentId: "agent-1" });

			// Assert
			expect(parentSend).toHaveBeenCalledWith({ type: "RALPHLOOP_STUCK" });
			actor.stop();
		});

		it("sends RALPHLOOP_DISK_FULL on diskFull entry", () => {
			// Arrange
			const parentSend = vi.fn();
			const mockParent = {
				send: parentSend,
				id: "parent",
			} as unknown as AnyActorRef;
			const actor = createActor(ralphLoopMachine, {
				input: { parentRef: mockParent },
			});
			actor.start();
			actor.send({ type: "START" });

			// Act
			actor.send({ type: "DISK_FULL" });

			// Assert
			expect(parentSend).toHaveBeenCalledWith({ type: "RALPHLOOP_DISK_FULL" });
			actor.stop();
		});
	});
});
