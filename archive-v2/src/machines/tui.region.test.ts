import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "./chorus.machine.js";

describe("TUI Region", () => {
	const defaultInput = {
		config: { projectRoot: "/test" },
	};

	describe("focus states", () => {
		it("starts with agentGrid focused", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Assert
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { focus: "agentGrid", modal: "closed" },
			});
			actor.stop();
		});

		it("TOGGLE_FOCUS switches to taskPanel", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act
			actor.send({ type: "TOGGLE_FOCUS" });

			// Assert
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { focus: "taskPanel" },
			});
			actor.stop();
		});

		it("FOCUS_TASK_PANEL and FOCUS_AGENT_GRID set specific focus", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act & Assert - focus task panel
			actor.send({ type: "FOCUS_TASK_PANEL" });
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { focus: "taskPanel" },
			});

			// Act & Assert - focus agent grid
			actor.send({ type: "FOCUS_AGENT_GRID" });
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { focus: "agentGrid" },
			});
			actor.stop();
		});
	});

	describe("modal states", () => {
		it("starts with modal closed", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Assert
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "closed" },
			});
			actor.stop();
		});

		it("OPEN_HELP transitions to help modal", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act
			actor.send({ type: "OPEN_HELP" });

			// Assert
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "help" },
			});
			actor.stop();
		});

		it("CLOSE_MODAL returns to closed", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();
			actor.send({ type: "OPEN_HELP" });

			// Act
			actor.send({ type: "CLOSE_MODAL" });

			// Assert
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "closed" },
			});
			actor.stop();
		});

		it("only one modal can be open at a time", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();
			actor.send({ type: "OPEN_HELP" });

			// Act - try to open another modal
			actor.send({ type: "OPEN_INTERVENTION" });

			// Assert - should transition to intervention (replaces help)
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "intervention" },
			});
			actor.stop();
		});
	});

	describe("selection context", () => {
		it("starts with null selection", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Assert
			const ctx = actor.getSnapshot().context;
			expect(ctx.selectedTaskId).toBeNull();
			expect(ctx.selectedAgentId).toBeNull();
			actor.stop();
		});

		it("SELECT_TASK updates selectedTaskId", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act
			actor.send({ type: "SELECT_TASK", taskId: "task-1" });

			// Assert
			expect(actor.getSnapshot().context.selectedTaskId).toBe("task-1");
			actor.stop();
		});

		it("SELECT_AGENT updates selectedAgentId", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act
			actor.send({ type: "SELECT_AGENT", agentId: "agent-1" });

			// Assert
			expect(actor.getSnapshot().context.selectedAgentId).toBe("agent-1");
			actor.stop();
		});
	});

	describe("keyboard routing guards", () => {
		it("navigation works when modal is closed", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Act
			actor.send({ type: "SELECT_NEXT" });

			// Assert
			expect(actor.getSnapshot().context.taskIndex).toBe(1);
			actor.stop();
		});

		it("navigation blocked when modal is open", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();
			actor.send({ type: "OPEN_HELP" });
			const before = actor.getSnapshot().context.taskIndex;

			// Act
			actor.send({ type: "SELECT_NEXT" });

			// Assert
			expect(actor.getSnapshot().context.taskIndex).toBe(before);
			actor.stop();
		});

		it("CLOSE_MODAL works from any modal", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();

			// Test from help modal
			actor.send({ type: "OPEN_HELP" });
			actor.send({ type: "CLOSE_MODAL" });
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "closed" },
			});

			// Test from intervention modal
			actor.send({ type: "OPEN_INTERVENTION" });
			actor.send({ type: "CLOSE_MODAL" });
			expect(actor.getSnapshot().value).toMatchObject({
				tui: { modal: "closed" },
			});

			actor.stop();
		});

		it("CLEAR_SELECTION resets selection", () => {
			// Arrange
			const actor = createActor(chorusMachine, { input: defaultInput });
			actor.start();
			actor.send({ type: "SELECT_TASK", taskId: "task-1" });
			actor.send({ type: "SELECT_AGENT", agentId: "agent-1" });

			// Act
			actor.send({ type: "CLEAR_SELECTION" });

			// Assert
			const ctx = actor.getSnapshot().context;
			expect(ctx.selectedTaskId).toBeNull();
			expect(ctx.selectedAgentId).toBeNull();
			actor.stop();
		});
	});
});
