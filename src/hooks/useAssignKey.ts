import { useInput } from "ink";
import type { TaskProviderTask } from "../types/task-provider.js";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseAssignKeyOptions {
	selectedTask: TaskProviderTask | null;
	slotManager: {
		hasAvailable: () => boolean;
		assignTask: (taskId: string) => string;
	};
	onAssigned?: (taskId: string, slotId: string) => void;
	onError?: (error: string) => void;
}

/**
 * useAssignKey - Hook for handling Enter key to assign task to idle agent
 *
 * Handles:
 * - Enter: Assign selected task to available agent slot
 *
 * Validates:
 * - Task is selected
 * - Task status is 'open'
 * - Idle slot is available
 *
 * Note: For MVP, behaves similarly to 's' (spawn).
 * Distinction matters for future agent pooling.
 */
export function useAssignKey({
	selectedTask,
	slotManager,
	onAssigned,
	onError,
}: UseAssignKeyOptions): void {
	// Handle keyboard input
	useInput(
		(_input, key) => {
			// Only respond to Enter key
			if (!key.return) {
				return;
			}

			// Validate task is selected
			if (!selectedTask) {
				onError?.("No task selected");
				return;
			}

			// Validate task status is open
			if (selectedTask.status !== "open") {
				onError?.("Task not available");
				return;
			}

			// Validate idle slot is available
			if (!slotManager.hasAvailable()) {
				onError?.("No idle slots available");
				return;
			}

			// Assign task to slot
			const slotId = slotManager.assignTask(selectedTask.id);
			onAssigned?.(selectedTask.id, slotId);
		},
		{ isActive: getIsTTY() },
	);
}
