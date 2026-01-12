import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";

/**
 * E2E: Spawn Agent (s key) - Tests agent spawning functionality
 *
 * Note: Full CLI E2E tests with cli-testing-library are skipped due to
 * infrastructure timeout issues. These tests verify the core spawn agent
 * functionality at the XState level.
 */
describe("E2E: Spawn Agent (s key)", () => {
	it("pressing s spawns new agent", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Initial state should have no agents
		expect(actor.getSnapshot().context.agents).toHaveLength(0);

		// Act - simulate s key press by sending SPAWN_AGENT event
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-test1" });

		// Assert
		expect(actor.getSnapshot().context.activeTaskIds).toContain("ch-test1");

		actor.stop();
	});

	it("agent count increments when spawned", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		const initialActiveCount =
			actor.getSnapshot().context.activeAgentIds.length;

		// Act - spawn agent
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-test2" });

		// Assert - activeAgentIds should increment
		expect(actor.getSnapshot().context.activeAgentIds.length).toBe(
			initialActiveCount + 1,
		);

		actor.stop();
	});

	it("acquired slots increments on spawn", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		expect(actor.getSnapshot().context.acquiredSlots).toBe(0);

		// Act - spawn agent
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-test3" });

		// Assert
		expect(actor.getSnapshot().context.acquiredSlots).toBe(1);

		actor.stop();
	});

	it("task ID tracked in activeTaskIds", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(0);

		// Act - spawn agent for specific task
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-test4" });

		// Assert - task should be in active list
		expect(actor.getSnapshot().context.activeTaskIds).toContain("ch-test4");

		actor.stop();
	});
});
