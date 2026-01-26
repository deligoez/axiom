import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { type UndoableAction, useUndoKey } from "./useUndoKey.js";

// Test component that uses the hook
function TestComponent({
	send,
	actionHistory,
	onEmpty,
	onUndo,
}: {
	send: (event: { type: "UNDO" }) => void;
	actionHistory: UndoableAction[];
	onEmpty?: () => void;
	onUndo?: (action: UndoableAction) => void;
}) {
	useUndoKey({
		send,
		actionHistory,
		onEmpty,
		onUndo,
	});

	return (
		<Box flexDirection="column">
			<Text>History count: {actionHistory.length}</Text>
		</Box>
	);
}

describe("useUndoKey", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Helper to create undoable actions
	const createAction = (
		type: UndoableAction["type"],
		payload?: unknown,
	): UndoableAction => ({
		type,
		payload: payload ?? {},
		timestamp: Date.now(),
	});

	describe("Undo Actions", () => {
		it("sends UNDO event to machine when u pressed with block action in history", () => {
			// Arrange
			const send = vi.fn();
			const onUndo = vi.fn();
			const actionHistory = [createAction("block", { taskId: "ch-test1" })];
			const { stdin } = render(
				<TestComponent
					send={send}
					actionHistory={actionHistory}
					onUndo={onUndo}
				/>,
			);

			// Act
			stdin.write("u");

			// Assert
			expect(send).toHaveBeenCalledWith({ type: "UNDO" });
		});

		it("sends UNDO event for spawn action", () => {
			// Arrange
			const send = vi.fn();
			const actionHistory = [
				createAction("spawn", { taskId: "ch-test2", agentId: "agent-1" }),
			];
			const { stdin } = render(
				<TestComponent send={send} actionHistory={actionHistory} />,
			);

			// Act
			stdin.write("u");

			// Assert
			expect(send).toHaveBeenCalledWith({ type: "UNDO" });
		});

		it("sends UNDO event for mode_change action", () => {
			// Arrange
			const send = vi.fn();
			const actionHistory = [
				createAction("mode_change", {
					previousMode: "semi-auto",
					newMode: "autopilot",
				}),
			];
			const { stdin } = render(
				<TestComponent send={send} actionHistory={actionHistory} />,
			);

			// Act
			stdin.write("u");

			// Assert
			expect(send).toHaveBeenCalledWith({ type: "UNDO" });
		});

		it("sends UNDO event for pause action", () => {
			// Arrange
			const send = vi.fn();
			const actionHistory = [createAction("pause", { wasPaused: false })];
			const { stdin } = render(
				<TestComponent send={send} actionHistory={actionHistory} />,
			);

			// Act
			stdin.write("u");

			// Assert
			expect(send).toHaveBeenCalledWith({ type: "UNDO" });
		});
	});

	describe("Empty History", () => {
		it("calls onEmpty when history is empty", () => {
			// Arrange
			const send = vi.fn();
			const onEmpty = vi.fn();
			const actionHistory: UndoableAction[] = [];
			const { stdin } = render(
				<TestComponent
					send={send}
					actionHistory={actionHistory}
					onEmpty={onEmpty}
				/>,
			);

			// Act
			stdin.write("u");

			// Assert
			expect(onEmpty).toHaveBeenCalled();
			expect(send).not.toHaveBeenCalled();
		});

		it("does not crash on empty history without onEmpty handler", () => {
			// Arrange
			const send = vi.fn();
			const actionHistory: UndoableAction[] = [];
			const { stdin } = render(
				<TestComponent send={send} actionHistory={actionHistory} />,
			);

			// Act & Assert - should not throw
			expect(() => stdin.write("u")).not.toThrow();
			expect(send).not.toHaveBeenCalled();
		});
	});

	describe("History Management", () => {
		it("calls onUndo with the last action when u pressed", () => {
			// Arrange
			const send = vi.fn();
			const onUndo = vi.fn();
			const lastAction = createAction("block", { taskId: "ch-test5" });
			const actionHistory = [
				createAction("spawn", { taskId: "ch-test4" }),
				lastAction,
			];
			const { stdin } = render(
				<TestComponent
					send={send}
					actionHistory={actionHistory}
					onUndo={onUndo}
				/>,
			);

			// Act
			stdin.write("u");

			// Assert - should report the last action (most recent)
			expect(onUndo).toHaveBeenCalledWith(lastAction);
		});

		it("ignores other keys", () => {
			// Arrange
			const send = vi.fn();
			const actionHistory = [createAction("block", { taskId: "ch-test6" })];
			const { stdin } = render(
				<TestComponent send={send} actionHistory={actionHistory} />,
			);

			// Act
			stdin.write("a");
			stdin.write("b");
			stdin.write("U"); // uppercase

			// Assert
			expect(send).not.toHaveBeenCalled();
		});
	});
});
