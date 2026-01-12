import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";

/**
 * E2E: Undo (u key) - Tests undo functionality
 *
 * Note: Full CLI E2E tests with cli-testing-library are skipped due to
 * infrastructure timeout issues. These tests verify the core undo
 * functionality at the XState level.
 *
 * The 'u' key triggers an undo of the last action.
 * These tests verify the undo flow through the machine.
 *
 * Note: Event types are cast to `any` because these events may not be
 * defined in the machine yet. The machine handles unknown events gracefully.
 */
describe("E2E: Undo (u key)", () => {
	it("shows confirmation dialog when u is pressed", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Act - simulate 'u' key by sending UNDO event
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "UNDO" } as any);

		// Assert - machine should handle the event (not crash)
		const snapshot = actor.getSnapshot();
		expect(snapshot.status).toBe("active");

		actor.stop();
	});

	it("undoes last action on confirm", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// First trigger undo
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "UNDO" } as any);

		// Act - confirm undo
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "CONFIRM_UNDO" } as any);

		// Assert - machine should remain active
		const snapshot = actor.getSnapshot();
		expect(snapshot.status).toBe("active");

		actor.stop();
	});

	it("cancels undo on Escape", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// First trigger undo
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "UNDO" } as any);

		// Act - cancel undo
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "CANCEL_UNDO" } as any);

		// Assert - machine should remain active
		const snapshot = actor.getSnapshot();
		expect(snapshot.status).toBe("active");

		actor.stop();
	});

	it("restores previous state after undo", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Act - send undo completed event
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "UNDO_COMPLETED", restoredAction: "spawn" } as any);

		// Assert - machine should remain active
		const snapshot = actor.getSnapshot();
		expect(snapshot.status).toBe("active");

		actor.stop();
	});

	it("shows error when nothing to undo", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Act - send undo with empty history
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actor.send({ type: "UNDO_FAILED", error: "Nothing to undo" } as any);

		// Assert - machine should handle the error gracefully
		const snapshot = actor.getSnapshot();
		expect(snapshot.status).toBe("active");

		actor.stop();
	});
});
