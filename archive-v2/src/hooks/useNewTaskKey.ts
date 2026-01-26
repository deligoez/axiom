import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseNewTaskKeyOptions {
	onNewTask?: () => void;
}

/**
 * useNewTaskKey - Hook for handling 'n' key to create new task
 *
 * Handles:
 * - n: Open new task dialog
 */
export function useNewTaskKey({ onNewTask }: UseNewTaskKeyOptions): void {
	useInput(
		(input) => {
			// Only respond to 'n' key
			if (input === "n") {
				onNewTask?.();
			}
		},
		{ isActive: getIsTTY() },
	);
}
