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
	 * Update task status.
	 */
	async updateStatus(id: string, status: string): Promise<void> {
		// Map Bead-style status to TaskStore status
		const statusMap: Record<string, string> = {
			open: "todo",
			in_progress: "doing",
			closed: "done",
			blocked: "stuck",
			reviewing: "review",
			failed: "failed",
			deferred: "later",
		};

		const taskStatus = statusMap[status] ?? status;
		this.store.update(id, {
			status: taskStatus as
				| "todo"
				| "doing"
				| "done"
				| "stuck"
				| "later"
				| "failed"
				| "review",
		});
	}

	/**
	 * Get task labels/tags.
	 */
	async getTaskLabels(id: string): Promise<string[]> {
		const task = this.store.get(id);
		return task?.tags ?? [];
	}

	/**
	 * Add a label/tag to a task.
	 */
	async addLabel(id: string, label: string): Promise<void> {
		const task = this.store.get(id);
		if (!task) return;
		const tags = [...task.tags];
		if (!tags.includes(label)) {
			tags.push(label);
			this.store.update(id, { tags });
		}
	}

	/**
	 * Remove a label/tag from a task.
	 */
	async removeLabel(id: string, label: string): Promise<void> {
		const task = this.store.get(id);
		if (!task) return;
		const tags = task.tags.filter((t) => t !== label);
		this.store.update(id, { tags });
	}

	/**
	 * Add a note to a task (appends to description).
	 */
	async addNote(id: string, note: string): Promise<void> {
		const task = this.store.get(id);
		if (!task) return;
		const description = task.description
			? `${task.description}\n\n${note}`
			: note;
		this.store.update(id, { description });
	}

	/**
	 * Update a task field (generic field update).
	 */
	async updateTask(id: string, field: string, value: string): Promise<void> {
		const task = this.store.get(id);
		if (!task) return;

		// Map common field names to TaskStore fields
		switch (field) {
			case "title":
				this.store.update(id, { title: value });
				break;
			case "description":
				this.store.update(id, { description: value });
				break;
			case "status":
				await this.updateStatus(id, value);
				break;
			case "acceptance_criteria":
			case "add_criteria": {
				const criteria = task.acceptanceCriteria ?? [];
				criteria.push(value);
				this.store.update(id, { acceptanceCriteria: criteria });
				break;
			}
			case "labels": {
				const tags = value.split(",").map((l) => l.trim());
				this.store.update(id, { tags });
				break;
			}
			case "notes":
				await this.addNote(id, value);
				break;
			default:
				// For unknown fields, try to set them directly if supported
				// This provides forward compatibility
				break;
		}
	}

	/**
	 * Update a custom field on a task.
	 * For native TaskStore, maps known fields to store fields.
	 */
	async updateCustomField(
		id: string,
		key: string,
		value: string,
	): Promise<void> {
		const task = this.store.get(id);
		if (!task) return;

		// Handle known custom fields
		switch (key) {
			case "failed":
				// Clearing failed flag means setting status back to doing
				if (value === "" && task.status === "failed") {
					this.store.update(id, { status: "doing" });
				}
				break;
			case "timeout":
				// Timeout is tracked separately - clearing it has no direct mapping
				// This is a no-op for native TaskStore
				break;
			case "maxIterations":
				// Max iterations could be stored in metadata
				// For now, no-op
				break;
			case "model":
				this.store.update(id, { model: value || undefined });
				break;
			case "agent":
				// Agent type - no direct mapping
				break;
			default:
				// Unknown custom fields are ignored
				break;
		}
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
