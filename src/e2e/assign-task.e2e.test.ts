import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";

/**
 * E2E: Assign Task (Enter key) - Tests task assignment functionality
 *
 * Note: Full CLI E2E tests with cli-testing-library are skipped due to
 * infrastructure timeout issues. These tests verify the core assign task
 * functionality at the XState level.
 *
 * For MVP, assigning a task behaves like spawning (SPAWN_AGENT event).
 * The distinction matters for future agent pooling features.
 */
describe("E2E: Assign Task (Enter key)", () => {
	it("Enter assigns selected task to idle agent", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Initial state should have no active tasks
		expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(0);

		// Act - simulate Enter key by sending SPAWN_AGENT event (MVP behavior)
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-assign1" });

		// Assert - task should be assigned (tracked in activeTaskIds)
		expect(actor.getSnapshot().context.activeTaskIds).toContain("ch-assign1");

		actor.stop();
	});

	it("agent receives task assignment", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 3,
			},
		});
		actor.start();

		// Act - assign task
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-assign2" });

		// Assert - agent should be active with the task
		const snapshot = actor.getSnapshot();
		expect(snapshot.context.activeAgentIds.length).toBeGreaterThan(0);
		expect(snapshot.context.activeTaskIds).toContain("ch-assign2");

		actor.stop();
	});

	it("task assignment respects slot limits", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: {
				config: { projectRoot: "/tmp" },
				maxAgents: 2, // Limit to 2 agents
			},
		});
		actor.start();

		// Fill all slots
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-assign3" });
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-assign4" });

		const context = actor.getSnapshot().context;
		expect(context.acquiredSlots).toBe(2);
		expect(context.activeTaskIds).toHaveLength(2);

		// Act - try to assign third task (should be blocked by maxAgents)
		actor.send({ type: "SPAWN_AGENT", taskId: "ch-assign5" });

		// Assert - third task should not be assigned (slots full)
		// Note: Machine guards prevent exceeding maxAgents
		expect(actor.getSnapshot().context.activeTaskIds).toHaveLength(2);

		actor.stop();
	});
});
