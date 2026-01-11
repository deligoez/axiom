import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";
import { createXStateAdapter } from "./xstate-adapter.js";

describe("XState Adapter", () => {
	it("getState returns machine context", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();
		const adapter = createXStateAdapter(actor);

		// Act
		const state = adapter.getState();

		// Assert
		expect(state.config.projectRoot).toBe("/test");
		expect(state.mode).toBe("semi-auto");
		expect(state.agents).toEqual([]);
		actor.stop();
	});

	it("subscribe fires on state change", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();
		const adapter = createXStateAdapter(actor);
		const listener = vi.fn();

		// Act
		adapter.subscribe(listener);
		actor.send({ type: "SET_MODE", mode: "autopilot" });

		// Assert
		expect(listener).toHaveBeenCalled();
		expect(listener.mock.calls[listener.mock.calls.length - 1][0].mode).toBe(
			"autopilot",
		);
		actor.stop();
	});

	it("multiple subscribers supported", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();
		const adapter = createXStateAdapter(actor);
		const listener1 = vi.fn();
		const listener2 = vi.fn();

		// Act
		adapter.subscribe(listener1);
		adapter.subscribe(listener2);
		actor.send({ type: "SET_MODE", mode: "autopilot" });

		// Assert
		expect(listener1).toHaveBeenCalled();
		expect(listener2).toHaveBeenCalled();
		actor.stop();
	});

	it("unsubscribe works correctly", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();
		const adapter = createXStateAdapter(actor);
		const listener = vi.fn();

		// Act
		const unsubscribe = adapter.subscribe(listener);
		const callCountBefore = listener.mock.calls.length;
		unsubscribe();
		actor.send({ type: "SET_MODE", mode: "autopilot" });

		// Assert - should not receive new events after unsubscribe
		expect(listener.mock.calls.length).toBe(callCountBefore);
		actor.stop();
	});
});
