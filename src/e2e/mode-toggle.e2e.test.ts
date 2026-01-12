import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";

/**
 * E2E: Mode Toggle (m key) - Tests mode switching at the state machine level
 *
 * Note: Full CLI E2E tests with cli-testing-library are skipped due to
 * infrastructure timeout issues. These tests verify the core mode toggle
 * functionality at the XState level.
 */
describe("E2E: Mode Toggle (m key)", () => {
	it("pressing m toggles mode from semi-auto to autopilot", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
			},
		});
		actor.start();

		// Initial state should be semi-auto
		expect(actor.getSnapshot().context.mode).toBe("semi-auto");

		// Act - simulate 'm' key press by sending SET_MODE event
		actor.send({ type: "SET_MODE", mode: "autopilot" });

		// Assert
		expect(actor.getSnapshot().context.mode).toBe("autopilot");
	});

	it("pressing m toggles mode from autopilot back to semi-auto", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
			},
		});
		actor.start();

		// Set to autopilot first
		actor.send({ type: "SET_MODE", mode: "autopilot" });
		expect(actor.getSnapshot().context.mode).toBe("autopilot");

		// Act - toggle back to semi-auto
		actor.send({ type: "SET_MODE", mode: "semi-auto" });

		// Assert
		expect(actor.getSnapshot().context.mode).toBe("semi-auto");
	});

	it("mode persists after other operations", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
			},
		});
		actor.start();

		// Set to autopilot
		actor.send({ type: "SET_MODE", mode: "autopilot" });
		expect(actor.getSnapshot().context.mode).toBe("autopilot");

		// Act - perform other operations (e.g., select task)
		actor.send({ type: "SELECT_TASK", taskId: "ch-test1" });
		actor.send({ type: "CLEAR_SELECTION" });

		// Assert - mode should still be autopilot
		expect(actor.getSnapshot().context.mode).toBe("autopilot");
	});
});
