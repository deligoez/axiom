import type {
	CreateTaskInput,
	Task,
	TaskStatus,
	UpdateTaskInput,
} from "../types/task.js";

/**
 * TaskStore - In-memory task storage with CRUD operations.
 * Phase 1: Basic CRUD without persistence (TS02)
 */
export class TaskStore {
	private tasks: Map<string, Task> = new Map();
	private deletedIds: Set<string> = new Set();
	private nextId = 1;
	private prefix = "ch"; // TODO: Make configurable in TS16a
	readonly projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
		// Note: Persistence (load/flush) will be added in TS03
	}

	/**
	 * Create a new task with sequential ID.
	 */
	create(input: CreateTaskInput): Task {
		const now = new Date().toISOString();
		const id = this.generateId();

		const task: Task = {
			id,
			title: input.title,
			description: input.description,
			status: "todo" as TaskStatus,
			type: input.type ?? "task",
			tags: input.tags ?? [],
			dependencies: input.dependencies ?? [],
			model: input.model,
			acceptanceCriteria: input.acceptanceCriteria,
			createdAt: now,
			updatedAt: now,
			reviewCount: 0,
			learningsCount: 0,
			hasLearnings: false,
		};

		this.tasks.set(id, task);
		return task;
	}

	/**
	 * Get a task by ID.
	 * Returns undefined if not found or deleted.
	 */
	get(id: string): Task | undefined {
		if (this.deletedIds.has(id)) {
			return undefined;
		}
		return this.tasks.get(id);
	}

	/**
	 * Update a task.
	 * @throws Error if task not found
	 */
	update(id: string, changes: UpdateTaskInput): Task {
		const task = this.tasks.get(id);
		if (!task || this.deletedIds.has(id)) {
			throw new Error(`Task not found: ${id}`);
		}

		const updated: Task = {
			...task,
			...changes,
			updatedAt: new Date().toISOString(),
		};

		this.tasks.set(id, updated);
		return updated;
	}

	/**
	 * Soft-delete a task.
	 * Task is marked as deleted but kept in storage for history.
	 */
	delete(id: string): void {
		if (!this.tasks.has(id)) {
			throw new Error(`Task not found: ${id}`);
		}
		this.deletedIds.add(id);
	}

	/**
	 * Generate next sequential task ID.
	 */
	private generateId(): string {
		const id = `${this.prefix}-${this.nextId}`;
		this.nextId++;
		return id;
	}

	/**
	 * Initialize nextId from existing tasks.
	 * Called when loading from storage to continue sequence.
	 */
	protected initNextId(): void {
		let maxId = 0;
		for (const id of this.tasks.keys()) {
			const match = id.match(/^[a-z]+-(\d+)$/);
			if (match) {
				const num = Number.parseInt(match[1], 10);
				if (num > maxId) {
					maxId = num;
				}
			}
		}
		this.nextId = maxId + 1;
	}

	/**
	 * Get all task IDs (excluding deleted).
	 * Used for testing and debugging.
	 */
	getAllIds(): string[] {
		return Array.from(this.tasks.keys()).filter(
			(id) => !this.deletedIds.has(id),
		);
	}
}
