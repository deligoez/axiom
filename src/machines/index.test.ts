import { describe, expect, it } from "vitest";

describe("XState Setup", () => {
	it("should import xstate package", async () => {
		// Arrange & Act
		const xstate = await import("xstate");

		// Assert
		expect(xstate).toBeDefined();
		expect(xstate.createMachine).toBeDefined();
		expect(xstate.createActor).toBeDefined();
	});

	it("should import @xstate/react package", async () => {
		// Arrange & Act
		const xstateReact = await import("@xstate/react");

		// Assert
		expect(xstateReact).toBeDefined();
		expect(xstateReact.useMachine).toBeDefined();
		expect(xstateReact.useActor).toBeDefined();
	});

	it("should compile XState machine definition with TypeScript", async () => {
		// Arrange
		const { createMachine } = await import("xstate");

		// Act
		const machine = createMachine({
			id: "test",
			initial: "idle",
			states: {
				idle: {
					on: { START: "running" },
				},
				running: {
					on: { STOP: "idle" },
				},
			},
		});

		// Assert
		expect(machine).toBeDefined();
		expect(machine.id).toBe("test");
	});

	it("should create and start a simple machine", async () => {
		// Arrange
		const { createMachine, createActor } = await import("xstate");
		const machine = createMachine({
			id: "simple",
			initial: "idle",
			states: {
				idle: {
					on: { START: "running" },
				},
				running: {
					on: { STOP: "idle" },
				},
			},
		});

		// Act
		const actor = createActor(machine);
		actor.start();
		const initialState = actor.getSnapshot().value;
		actor.send({ type: "START" });
		const runningState = actor.getSnapshot().value;
		actor.stop();

		// Assert
		expect(initialState).toBe("idle");
		expect(runningState).toBe("running");
	});
});
