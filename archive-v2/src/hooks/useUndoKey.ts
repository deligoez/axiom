import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UndoableAction {
	type: "block" | "spawn" | "mode_change" | "pause";
	payload: unknown;
	timestamp: number;
}

export interface UseUndoKeyOptions {
	send: (event: { type: "UNDO" }) => void;
	actionHistory: UndoableAction[];
	onEmpty?: () => void;
	onUndo?: (action: UndoableAction) => void;
}

/**
 * useUndoKey - Hook for handling 'u' key to undo last user action
 *
 * Handles:
 * - u: Undo last action (block, spawn, mode_change, pause)
 *
 * Note: Agent commits are handled by 'R' (rollback), not 'u' (undo).
 * This hook sends UNDO event to the machine which handles the actual logic.
 */
export function useUndoKey({
	send,
	actionHistory,
	onEmpty,
	onUndo,
}: UseUndoKeyOptions): void {
	// Handle keyboard input
	useInput(
		(input) => {
			// Only respond to lowercase 'u'
			if (input !== "u") {
				return;
			}

			// Check if history is empty
			if (actionHistory.length === 0) {
				onEmpty?.();
				return;
			}

			// Get the last action for callback
			const lastAction = actionHistory[actionHistory.length - 1];

			// Notify about the action being undone
			onUndo?.(lastAction);

			// Send UNDO event to machine - machine handles the logic
			send({ type: "UNDO" });
		},
		{ isActive: getIsTTY() },
	);
}
