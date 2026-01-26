import { describe, expect, it } from "vitest";
import type { AnyActorRef } from "xstate";
import { createActor } from "xstate";
import type { AgentIdentity } from "../types/persona.js";
import { agentMachine } from "./agent.machine.js";

describe("AgentMachine", () => {
	// Helper to create mock parent ref - only implements send for testing
	const createMockParentRef = (): AnyActorRef =>
		({ send: () => {} }) as unknown as AnyActorRef;

	it("initializes with input context", () => {
		// Arrange
		const input = {
			taskId: "task-1",
			parentRef: createMockParentRef(),
			maxIterations: 5,
		};

		// Act
		const actor = createActor(agentMachine, { input });
		actor.start();
		const snapshot = actor.getSnapshot();

		// Assert
		expect(snapshot.context.taskId).toBe("task-1");
		expect(snapshot.context.maxIterations).toBe(5);
		expect(snapshot.context.iteration).toBe(0);
		expect(snapshot.value).toBe("idle");
		actor.stop();
	});

	it("START transitions idle to preparing", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();

		// Act
		actor.send({ type: "START" });

		// Assert
		expect(actor.getSnapshot().value).toBe("preparing");
		actor.stop();
	});

	it("READY transitions preparing to executing", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });

		// Act
		actor.send({ type: "READY" });

		// Assert
		expect(actor.getSnapshot().value).toEqual({ executing: "iteration" });
		actor.stop();
	});

	it("ITERATION_DONE moves to checkQuality", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });

		// Act
		actor.send({ type: "ITERATION_DONE" });

		// Assert
		expect(actor.getSnapshot().value).toEqual({ executing: "checkQuality" });
		actor.stop();
	});

	it("ALL_PASS transitions to completed", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		actor.send({ type: "ITERATION_DONE" });

		// Act
		actor.send({ type: "ALL_PASS" });

		// Assert
		expect(actor.getSnapshot().value).toBe("completed");
		expect(actor.getSnapshot().status).toBe("done");
		actor.stop();
	});

	it("RETRY increments iteration and returns to iteration state", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		actor.send({ type: "ITERATION_DONE" });

		// Act
		actor.send({ type: "RETRY" });

		// Assert
		expect(actor.getSnapshot().context.iteration).toBe(1);
		expect(actor.getSnapshot().value).toEqual({ executing: "iteration" });
		actor.stop();
	});

	it("BLOCKED transitions to blocked state", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });

		// Act
		actor.send({ type: "BLOCKED", reason: "dependency not met" });

		// Assert
		expect(actor.getSnapshot().value).toBe("blocked");
		actor.stop();
	});

	it("FAIL transitions to failed state with error", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		const error = new Error("test error");

		// Act
		actor.send({ type: "FAIL", error });

		// Assert
		expect(actor.getSnapshot().value).toBe("failed");
		expect(actor.getSnapshot().context.error).toBe(error);
		expect(actor.getSnapshot().status).toBe("done");
		actor.stop();
	});

	it("completed is a final state", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		actor.send({ type: "ITERATION_DONE" });
		actor.send({ type: "ALL_PASS" });

		// Assert
		expect(actor.getSnapshot().status).toBe("done");
		actor.stop();
	});

	it("failed is a final state", () => {
		// Arrange
		const actor = createActor(agentMachine, {
			input: { taskId: "task-1", parentRef: createMockParentRef() },
		});
		actor.start();
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		actor.send({ type: "FAIL", error: new Error("test") });

		// Assert
		expect(actor.getSnapshot().status).toBe("done");
		actor.stop();
	});

	describe("identity integration", () => {
		it("context has identity field with AgentIdentity structure", () => {
			// Arrange
			const input = {
				taskId: "task-1",
				parentRef: createMockParentRef(),
				persona: "chip" as const,
				workerNumber: 1,
			};

			// Act
			const actor = createActor(agentMachine, { input });
			actor.start();
			const identity = actor.getSnapshot().context.identity;

			// Assert
			expect(identity).toBeDefined();
			expect(identity).toHaveProperty("id");
			expect(identity).toHaveProperty("persona");
			expect(identity).toHaveProperty("displayName");
			actor.stop();
		});

		it("workers get numbered identity format (chip-001)", () => {
			// Arrange
			const input = {
				taskId: "task-1",
				parentRef: createMockParentRef(),
				persona: "chip" as const,
				workerNumber: 1,
			};

			// Act
			const actor = createActor(agentMachine, { input });
			actor.start();
			const identity: AgentIdentity = actor.getSnapshot().context.identity;

			// Assert
			expect(identity.id).toBe("chip-001");
			expect(identity.persona).toBe("chip");
			expect(identity.instanceNumber).toBe(1);
			expect(identity.displayName).toBe("Chip-001");
			actor.stop();
		});

		it("singleton agents get simple identity (sage)", () => {
			// Arrange
			const input = {
				taskId: "task-1",
				parentRef: createMockParentRef(),
				persona: "sage" as const,
				// No workerNumber for singleton
			};

			// Act
			const actor = createActor(agentMachine, { input });
			actor.start();
			const identity: AgentIdentity = actor.getSnapshot().context.identity;

			// Assert
			expect(identity.id).toBe("sage");
			expect(identity.persona).toBe("sage");
			expect(identity.instanceNumber).toBeUndefined();
			expect(identity.displayName).toBe("Sage");
			actor.stop();
		});

		it("identity uses input persona", () => {
			// Arrange - use scout (non-singular) to test persona+workerNumber
			const input = {
				taskId: "task-1",
				parentRef: createMockParentRef(),
				persona: "scout" as const,
				workerNumber: 5,
			};

			// Act
			const actor = createActor(agentMachine, { input });
			actor.start();
			const identity: AgentIdentity = actor.getSnapshot().context.identity;

			// Assert
			expect(identity.persona).toBe("scout");
			expect(identity.id).toBe("scout-005");
			actor.stop();
		});

		it("identity uses input workerNumber", () => {
			// Arrange
			const input = {
				taskId: "task-1",
				parentRef: createMockParentRef(),
				persona: "patch" as const,
				workerNumber: 42,
			};

			// Act
			const actor = createActor(agentMachine, { input });
			actor.start();
			const identity: AgentIdentity = actor.getSnapshot().context.identity;

			// Assert
			expect(identity.instanceNumber).toBe(42);
			expect(identity.id).toBe("patch-042");
			expect(identity.displayName).toBe("Patch-042");
			actor.stop();
		});
	});
});
