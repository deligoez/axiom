import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { TaskProvider } from "../types/task-provider.js";
import type { TaskUpdate } from "./PlanReviewLoop.js";

export interface QueuedUpdateApplierOptions {
	queuePath: string;
	taskProvider: Pick<TaskProvider, "updateTask">;
}

/**
 * Applies queued task updates at the start of each agent iteration.
 *
 * When Plan Review updates a task while an agent is working on it,
 * the update is queued. This component applies queued updates
 * before building the next prompt.
 */
export class QueuedUpdateApplier {
	private readonly queuePath: string;
	private readonly taskProvider: Pick<TaskProvider, "updateTask">;

	constructor(options: QueuedUpdateApplierOptions) {
		this.queuePath = options.queuePath;
		this.taskProvider = options.taskProvider;
	}

	/**
	 * Check for pending updates for a specific task
	 *
	 * @param taskId The task ID to check
	 * @returns Array of pending updates (empty if none)
	 */
	async checkQueuedUpdates(taskId: string): Promise<TaskUpdate[]> {
		const queue = this.loadQueue();
		return queue[taskId] || [];
	}

	/**
	 * Apply pending updates for a task and remove from queue
	 *
	 * @param taskId The task ID to process
	 * @returns Array of applied updates
	 */
	async applyAndClearUpdates(taskId: string): Promise<TaskUpdate[]> {
		const queue = this.loadQueue();
		const updates = queue[taskId] || [];

		if (updates.length === 0) {
			return [];
		}

		// Apply each update
		for (const update of updates) {
			await this.taskProvider.updateTask(
				update.taskId,
				update.field,
				update.newValue,
			);
		}

		// Remove from queue atomically
		delete queue[taskId];
		this.saveQueue(queue);

		return updates;
	}

	/**
	 * Load queue from file
	 */
	private loadQueue(): Record<string, TaskUpdate[]> {
		if (!existsSync(this.queuePath)) {
			return {};
		}

		try {
			const content = readFileSync(this.queuePath, "utf-8");
			return JSON.parse(content) as Record<string, TaskUpdate[]>;
		} catch {
			return {};
		}
	}

	/**
	 * Save queue to file
	 */
	private saveQueue(queue: Record<string, TaskUpdate[]>): void {
		writeFileSync(this.queuePath, JSON.stringify(queue, null, 2));
	}
}
