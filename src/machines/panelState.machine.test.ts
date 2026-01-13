import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { panelStateMachine } from "./panelState.machine.js";

describe("panelStateMachine", () => {
	it("starts in 'none' state", () => {
		// Arrange & Act
		const actor = createActor(panelStateMachine);
		actor.start();

		// Assert
		expect(actor.getSnapshot().value).toBe("none");
	});

	it("transitions to 'intervention' on OPEN_INTERVENTION", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();

		// Act
		actor.send({ type: "OPEN_INTERVENTION" });

		// Assert
		expect(actor.getSnapshot().value).toBe("intervention");
	});

	it("transitions to 'help' on OPEN_HELP", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();

		// Act
		actor.send({ type: "OPEN_HELP" });

		// Assert
		expect(actor.getSnapshot().value).toBe("help");
	});

	it("transitions to 'exitConfirm' on OPEN_EXIT_CONFIRM", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();

		// Act
		actor.send({ type: "OPEN_EXIT_CONFIRM" });

		// Assert
		expect(actor.getSnapshot().value).toBe("exitConfirm");
	});

	it("transitions from 'intervention' to 'none' on CLOSE_PANEL", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();
		actor.send({ type: "OPEN_INTERVENTION" });

		// Act
		actor.send({ type: "CLOSE_PANEL" });

		// Assert
		expect(actor.getSnapshot().value).toBe("none");
	});

	it("transitions from 'help' to 'none' on CLOSE_PANEL", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();
		actor.send({ type: "OPEN_HELP" });

		// Act
		actor.send({ type: "CLOSE_PANEL" });

		// Assert
		expect(actor.getSnapshot().value).toBe("none");
	});

	it("transitions from 'exitConfirm' to 'none' on CLOSE_PANEL", () => {
		// Arrange
		const actor = createActor(panelStateMachine);
		actor.start();
		actor.send({ type: "OPEN_EXIT_CONFIRM" });

		// Act
		actor.send({ type: "CLOSE_PANEL" });

		// Assert
		expect(actor.getSnapshot().value).toBe("none");
	});
});
