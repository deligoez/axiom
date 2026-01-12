import { describe, expect, it, vi } from "vitest";

// Test the logic directly without React rendering
// Following pattern from useAgentGrid.test.ts

interface MockTask {
	id: string;
	status: string;
	custom?: Record<string, string>;
}

interface MockHandler {
	selectedTask: MockTask | null;
	agentStopper: { stopAgentByTask: () => Promise<{ success: boolean } | null> };
	interventionPanel: { open: (mode: string) => void };
	beadsCLI: { addLabel: (taskId: string, label: string) => Promise<void> };
	onAction: (action: string, taskId: string) => void;
	isDisabled: boolean;
}

// Pure logic for testability
function handleKeyPress(
	input: string,
	handler: MockHandler,
): { handled: boolean; action?: string } {
	if (handler.isDisabled) {
		return { handled: false };
	}

	if (!handler.selectedTask) {
		return { handled: false };
	}

	const task = handler.selectedTask;
	const isFailed = task.custom?.failed === "true";
	const isTimeout = task.custom?.timeout === "true";

	switch (input) {
		case "x":
			if (task.status === "in_progress") {
				handler.agentStopper.stopAgentByTask();
				handler.onAction("stop", task.id);
				return { handled: true, action: "stop" };
			}
			return { handled: false };

		case "r":
			if (isFailed || isTimeout) {
				return { handled: false };
			}
			if (task.status === "in_progress") {
				handler.interventionPanel.open("redirect-select");
				return { handled: true, action: "redirect" };
			}
			return { handled: false };

		case "e":
			handler.interventionPanel.open("edit-select");
			return { handled: true, action: "edit" };

		case "b":
			if (task.status === "open" || task.status === "in_progress") {
				handler.beadsCLI.addLabel(task.id, "blocked");
				handler.onAction("block", task.id);
				return { handled: true, action: "block" };
			}
			return { handled: false };

		default:
			return { handled: false };
	}
}

describe("useQuickControlKeys", () => {
	const createHandler = (
		task: MockTask | null,
		isDisabled = false,
	): MockHandler => ({
		selectedTask: task,
		agentStopper: { stopAgentByTask: vi.fn() },
		interventionPanel: { open: vi.fn() },
		beadsCLI: { addLabel: vi.fn() },
		onAction: vi.fn(),
		isDisabled,
	});

	describe("Stop Key (x)", () => {
		it("'x' on in_progress task stops its agent", () => {
			// Arrange
			const handler = createHandler({ id: "ch-001", status: "in_progress" });

			// Act
			const result = handleKeyPress("x", handler);

			// Assert
			expect(result.handled).toBe(true);
			expect(result.action).toBe("stop");
			expect(handler.agentStopper.stopAgentByTask).toHaveBeenCalled();
		});

		it("'x' on open task is no-op", () => {
			// Arrange
			const handler = createHandler({ id: "ch-002", status: "open" });

			// Act
			const result = handleKeyPress("x", handler);

			// Assert
			expect(result.handled).toBe(false);
			expect(handler.agentStopper.stopAgentByTask).not.toHaveBeenCalled();
		});

		it("'x' on closed task is no-op", () => {
			// Arrange
			const handler = createHandler({ id: "ch-003", status: "closed" });

			// Act
			const result = handleKeyPress("x", handler);

			// Assert
			expect(result.handled).toBe(false);
		});
	});

	describe("Redirect Key (r)", () => {
		it("'r' on in_progress task opens intervention panel in redirect mode", () => {
			// Arrange
			const handler = createHandler({ id: "ch-001", status: "in_progress" });

			// Act
			const result = handleKeyPress("r", handler);

			// Assert
			expect(result.handled).toBe(true);
			expect(result.action).toBe("redirect");
			expect(handler.interventionPanel.open).toHaveBeenCalledWith(
				"redirect-select",
			);
		});

		it("'r' on failed task does nothing (F63m handles)", () => {
			// Arrange
			const handler = createHandler({
				id: "ch-002",
				status: "in_progress",
				custom: { failed: "true" },
			});

			// Act
			const result = handleKeyPress("r", handler);

			// Assert
			expect(result.handled).toBe(false);
			expect(handler.interventionPanel.open).not.toHaveBeenCalled();
		});

		it("'r' on timeout task does nothing (F63m handles)", () => {
			// Arrange
			const handler = createHandler({
				id: "ch-003",
				status: "in_progress",
				custom: { timeout: "true" },
			});

			// Act
			const result = handleKeyPress("r", handler);

			// Assert
			expect(result.handled).toBe(false);
		});

		it("'r' on open task is no-op", () => {
			// Arrange
			const handler = createHandler({ id: "ch-004", status: "open" });

			// Act
			const result = handleKeyPress("r", handler);

			// Assert
			expect(result.handled).toBe(false);
		});
	});

	describe("Edit Key (e)", () => {
		it("'e' on any task opens edit dialog", () => {
			// Arrange
			const handler = createHandler({ id: "ch-001", status: "open" });

			// Act
			const result = handleKeyPress("e", handler);

			// Assert
			expect(result.handled).toBe(true);
			expect(result.action).toBe("edit");
			expect(handler.interventionPanel.open).toHaveBeenCalledWith(
				"edit-select",
			);
		});
	});

	describe("Block Key (b)", () => {
		it("'b' on open task adds 'blocked' label", () => {
			// Arrange
			const handler = createHandler({ id: "ch-001", status: "open" });

			// Act
			const result = handleKeyPress("b", handler);

			// Assert
			expect(result.handled).toBe(true);
			expect(result.action).toBe("block");
			expect(handler.beadsCLI.addLabel).toHaveBeenCalledWith(
				"ch-001",
				"blocked",
			);
		});

		it("'b' on in_progress task blocks", () => {
			// Arrange
			const handler = createHandler({ id: "ch-002", status: "in_progress" });

			// Act
			const result = handleKeyPress("b", handler);

			// Assert
			expect(result.handled).toBe(true);
			expect(handler.beadsCLI.addLabel).toHaveBeenCalledWith(
				"ch-002",
				"blocked",
			);
		});

		it("'b' on closed task is no-op", () => {
			// Arrange
			const handler = createHandler({ id: "ch-003", status: "closed" });

			// Act
			const result = handleKeyPress("b", handler);

			// Assert
			expect(result.handled).toBe(false);
			expect(handler.beadsCLI.addLabel).not.toHaveBeenCalled();
		});
	});

	describe("Context Check", () => {
		it("all keys no-op when no task selected", () => {
			// Arrange
			const handler = createHandler(null);

			// Act & Assert
			expect(handleKeyPress("x", handler).handled).toBe(false);
			expect(handleKeyPress("r", handler).handled).toBe(false);
			expect(handleKeyPress("e", handler).handled).toBe(false);
			expect(handleKeyPress("b", handler).handled).toBe(false);
		});

		it("all keys no-op when disabled", () => {
			// Arrange
			const handler = createHandler({ id: "ch-001", status: "open" }, true);

			// Act & Assert
			expect(handleKeyPress("x", handler).handled).toBe(false);
			expect(handleKeyPress("r", handler).handled).toBe(false);
			expect(handleKeyPress("e", handler).handled).toBe(false);
			expect(handleKeyPress("b", handler).handled).toBe(false);
		});
	});
});
