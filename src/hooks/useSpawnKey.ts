import { useInput } from "ink";
import type { Task } from "../services/BeadsCLI.js";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseSpawnKeyOptions {
	selectedTask: Task | null;
	slotManager: {
		hasAvailable: () => boolean;
	};
	orchestrator: {
		spawnAgent: (taskId: string) => string;
	};
	onSpawned?: (taskId: string, agentId: string) => void;
	onError?: (error: string) => void;
}

/**
 * useSpawnKey - Hook for handling 's' key to spawn agent for selected task
 *
 * Handles:
 * - s: Spawn agent for currently selected task
 *
 * Validates:
 * - Task is selected
 * - Task status is 'open'
 * - Task has no unmet dependencies
 * - Agent slot is available
 */
export function useSpawnKey({
	selectedTask,
	slotManager,
	orchestrator,
	onSpawned,
	onError,
}: UseSpawnKeyOptions): void {
	// Handle keyboard input
	useInput(
		(input) => {
			// Only respond to lowercase 's'
			if (input !== "s") {
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

			// Validate task has no unmet dependencies
			if (selectedTask.dependencies && selectedTask.dependencies.length > 0) {
				onError?.("Task is blocked");
				return;
			}

			// Validate slot is available
			if (!slotManager.hasAvailable()) {
				onError?.("No agent slots available");
				return;
			}

			// Spawn agent
			const agentId = orchestrator.spawnAgent(selectedTask.id);
			onSpawned?.(selectedTask.id, agentId);
		},
		{ isActive: getIsTTY() },
	);
}
