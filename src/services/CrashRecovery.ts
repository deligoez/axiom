import type { TaskStore } from "./TaskStore.js";

/**
 * Result of crash recovery operation.
 */
export interface RecoveryResult {
	recoveredCount: number;
	recoveredIds: string[];
}

/**
 * Recover orphaned tasks after a crash.
 *
 * Finds all tasks in 'doing' status (orphaned without active agent)
 * and resets them to 'todo' status so they can be re-claimed.
 *
 * @param store - The TaskStore instance
 * @returns Recovery result with count and IDs
 */
export async function recoverOrphanedTasks(
	store: TaskStore,
): Promise<RecoveryResult> {
	const orphanedTasks = store.doing();
	const recoveredIds: string[] = [];

	for (const task of orphanedTasks) {
		// Get current execution stats
		const execution = task.execution ?? { iterations: 0, retryCount: 0 };

		// Update task to todo with incremented retryCount
		store.update(task.id, {
			status: "todo",
		});

		// Update execution directly (since update doesn't handle nested execution)
		const updated = store.get(task.id);
		if (updated) {
			// Use internal method pattern - store the updated execution
			(updated as { execution: typeof execution }).execution = {
				...execution,
				retryCount: (execution.retryCount ?? 0) + 1,
			};
		}

		// Log recovery event to audit
		store.audit(task.id, {
			type: "crash_recovery",
			action: "reset_to_todo",
			previousRetryCount: execution.retryCount ?? 0,
		});

		recoveredIds.push(task.id);
	}

	return {
		recoveredCount: recoveredIds.length,
		recoveredIds,
	};
}
