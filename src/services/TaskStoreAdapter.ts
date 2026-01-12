import type { Task as StoreTask } from "../types/task.js";
import type { TaskStore } from "./TaskStore.js";

/**
 * BeadsCLI-compatible Task type.
 */
export interface BeadTask {
	id: string;
	title: string;
	description?: string;
	priority: number;
	status: string;
	labels: string[];
	dependencies: string[];
	custom?: {
		model?: string;
		agent?: string;
		acceptance_criteria?: string[];
	};
}

/**
 * Options for getting ready tasks.
 */
export interface GetReadyOptions {
	excludeLabels?: string[];
	includeLabels?: string[];
}

/**
 * Options for creating tasks.
 */
export interface TaskOptions {
	priority?: 1 | 2 | 3 | 4;
	labels?: string[];
	depends?: string[];
	model?: string;
	acceptanceCriteria?: string[];
}

/**
 * Adapter that wraps TaskStore with BeadsCLI-compatible interface.
 * Enables gradual migration from BeadsCLI to native TaskStore.
 */
export class TaskStoreAdapter {
	private store: TaskStore;

	constructor(store: TaskStore) {
		this.store = store;
	}

	/**
	 * Claim a task for an agent.
	 */
	async claimTask(id: string, _assignee: string): Promise<void> {
		this.store.claim(id);
	}

	/**
	 * Release a task back to ready state.
	 */
	async releaseTask(id: string): Promise<void> {
		this.store.release(id);
	}

	/**
	 * Get a task by ID.
	 */
	async getTask(id: string): Promise<BeadTask | null> {
		const task = this.store.get(id);
		if (!task) return null;
		return this.taskToBead(task);
	}

	/**
	 * Get ready tasks with optional filters.
	 */
	async getReadyTasks(options: GetReadyOptions = {}): Promise<BeadTask[]> {
		let tasks = this.store.ready();

		// Apply excludeLabels filter
		if (options.excludeLabels && options.excludeLabels.length > 0) {
			tasks = tasks.filter(
				(task) =>
					!task.tags.some((tag) => options.excludeLabels?.includes(tag)),
			);
		}

		// Apply includeLabels filter
		if (options.includeLabels && options.includeLabels.length > 0) {
			tasks = tasks.filter((task) =>
				task.tags.some((tag) => options.includeLabels?.includes(tag)),
			);
		}

		return tasks.map((t) => this.taskToBead(t));
	}

	/**
	 * Create a new task.
	 */
	async createTask(title: string, options: TaskOptions = {}): Promise<string> {
		const task = this.store.create({
			title,
			tags: options.labels ?? [],
			dependencies: options.depends ?? [],
			model: options.model,
			acceptanceCriteria: options.acceptanceCriteria,
		});
		return task.id;
	}

	/**
	 * Close (complete) a task.
	 */
	async closeTask(id: string, _comment?: string): Promise<void> {
		this.store.complete(id);
	}

	/**
	 * Reopen a closed task.
	 */
	async reopenTask(id: string): Promise<void> {
		this.store.reopen(id);
	}

	/**
	 * Get task status.
	 */
	async getTaskStatus(id: string): Promise<string | null> {
		const task = this.store.get(id);
		return task?.status ?? null;
	}

	/**
	 * Get in-progress tasks.
	 */
	async getInProgressTasks(): Promise<BeadTask[]> {
		return this.store.doing().map((t) => this.taskToBead(t));
	}

	/**
	 * Get closed tasks.
	 */
	async getClosedTasks(): Promise<BeadTask[]> {
		return this.store.done().map((t) => this.taskToBead(t));
	}

	/**
	 * Check if the adapter is available (always true for TaskStore).
	 */
	isAvailable(): boolean {
		return true;
	}

	/**
	 * Check if the store has been initialized.
	 */
	isInitialized(): boolean {
		return true;
	}

	/**
	 * Convert internal Task to BeadTask format.
	 */
	private taskToBead(task: StoreTask): BeadTask {
		return {
			id: task.id,
			title: task.title,
			description: task.description,
			priority: this.statusToPriority(task.status),
			status: this.statusToBeadStatus(task.status),
			labels: task.tags,
			dependencies: task.dependencies,
			custom: {
				model: task.model,
				acceptance_criteria: task.acceptanceCriteria,
			},
		};
	}

	/**
	 * Map TaskStore status to Bead status string.
	 */
	private statusToBeadStatus(status: StoreTask["status"]): string {
		const map: Record<StoreTask["status"], string> = {
			todo: "open",
			doing: "in_progress",
			done: "closed",
			failed: "closed",
			stuck: "blocked",
			later: "deferred",
			review: "in_progress",
		};
		return map[status] ?? "open";
	}

	/**
	 * Default priority value (Beads uses 1-4, lower is higher).
	 */
	private statusToPriority(_status: StoreTask["status"]): number {
		return 2; // Default to normal priority
	}
}
