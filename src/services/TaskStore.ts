import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
	CreateTaskInput,
	Task,
	TaskFilters,
	TaskJSONL,
	TaskStatus,
	TaskType,
	UpdateTaskInput,
} from "../types/task.js";

/**
 * TaskStore - In-memory task storage with CRUD operations and JSONL persistence.
 */
export class TaskStore {
	private tasks: Map<string, Task> = new Map();
	private deletedIds: Set<string> = new Set();
	private nextId = 1;
	private prefix = "ch"; // TODO: Make configurable in TS16a
	readonly projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
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

	// ─────────────────────────────────────────────────────────
	// Lifecycle Methods (TS04)
	// ─────────────────────────────────────────────────────────

	/**
	 * Claim a task: todo → doing
	 * @throws Error if task is not in 'todo' status
	 */
	claim(id: string): Task {
		const task = this.getOrThrow(id);
		if (task.status !== "todo") {
			throw new Error(
				`Cannot claim task ${id}: status is '${task.status}', expected 'todo'`,
			);
		}

		const now = new Date().toISOString();
		const execution = task.execution ?? { iterations: 0, retryCount: 0 };

		return (
			this.update(id, {
				status: "doing",
			} as Task & { execution: typeof execution & { startedAt: string } }) &&
			this.updateExecution(id, {
				...execution,
				startedAt: now,
			})
		);
	}

	/**
	 * Release a task: doing → todo
	 * @throws Error if task is not in 'doing' status
	 */
	release(id: string): Task {
		const task = this.getOrThrow(id);
		if (task.status !== "doing") {
			throw new Error(
				`Cannot release task ${id}: status is '${task.status}', expected 'doing'`,
			);
		}

		return this.update(id, { status: "todo" });
	}

	/**
	 * Complete a task: doing → done
	 * @throws Error if task is not in 'doing' status
	 */
	complete(id: string, _reason?: string): Task {
		const task = this.getOrThrow(id);
		if (task.status !== "doing") {
			throw new Error(
				`Cannot complete task ${id}: status is '${task.status}', expected 'doing'`,
			);
		}

		const now = new Date().toISOString();
		const execution = task.execution ?? { iterations: 0, retryCount: 0 };

		return (
			this.updateExecution(id, {
				...execution,
				completedAt: now,
			}) && this.update(id, { status: "done" })
		);
	}

	/**
	 * Fail a task: doing → failed
	 * @throws Error if task is not in 'doing' status
	 */
	fail(id: string, reason?: string): Task {
		const task = this.getOrThrow(id);
		if (task.status !== "doing") {
			throw new Error(
				`Cannot fail task ${id}: status is '${task.status}', expected 'doing'`,
			);
		}

		const now = new Date().toISOString();
		const execution = task.execution ?? { iterations: 0, retryCount: 0 };

		return (
			this.updateExecution(id, {
				...execution,
				lastError: reason,
				failedAt: now,
			}) && this.update(id, { status: "failed" })
		);
	}

	/**
	 * Defer a task: any → later
	 */
	defer(id: string): Task {
		this.getOrThrow(id);
		return this.update(id, { status: "later" });
	}

	/**
	 * Reopen a task: done/failed → todo
	 * @throws Error if task is not in 'done' or 'failed' status
	 */
	reopen(id: string): Task {
		const task = this.getOrThrow(id);
		if (task.status !== "done" && task.status !== "failed") {
			throw new Error(
				`Cannot reopen task ${id}: status is '${task.status}', expected 'done' or 'failed'`,
			);
		}

		return this.update(id, { status: "todo" });
	}

	/**
	 * Get task or throw if not found.
	 */
	private getOrThrow(id: string): Task {
		const task = this.get(id);
		if (!task) {
			throw new Error(`Task not found: ${id}`);
		}
		return task;
	}

	/**
	 * Update execution stats for a task.
	 */
	private updateExecution(id: string, execution: Task["execution"]): Task {
		const task = this.getOrThrow(id);
		const updated: Task = {
			...task,
			execution,
			updatedAt: new Date().toISOString(),
		};
		this.tasks.set(id, updated);
		return updated;
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

	/**
	 * List tasks with optional filters.
	 * Excludes deleted tasks by default.
	 */
	list(filters?: TaskFilters): Task[] {
		const result: Task[] = [];

		for (const task of this.tasks.values()) {
			// Skip deleted tasks
			if (this.deletedIds.has(task.id)) {
				continue;
			}

			// Apply status filter
			if (filters?.status !== undefined) {
				const statuses = Array.isArray(filters.status)
					? filters.status
					: [filters.status];
				if (!statuses.includes(task.status)) {
					continue;
				}
			}

			// Apply type filter
			if (filters?.type !== undefined) {
				const types = Array.isArray(filters.type)
					? filters.type
					: [filters.type];
				if (!types.includes(task.type)) {
					continue;
				}
			}

			// Apply tags filter (match ANY)
			if (filters?.tags !== undefined && filters.tags.length > 0) {
				const hasMatchingTag = filters.tags.some((tag) =>
					task.tags.includes(tag),
				);
				if (!hasMatchingTag) {
					continue;
				}
			}

			// Apply excludeTags filter (exclude if ANY)
			if (
				filters?.excludeTags !== undefined &&
				filters.excludeTags.length > 0
			) {
				const hasExcludedTag = filters.excludeTags.some((tag) =>
					task.tags.includes(tag),
				);
				if (hasExcludedTag) {
					continue;
				}
			}

			result.push(task);
		}

		return result;
	}

	// ─────────────────────────────────────────────────────────
	// Convenience Queries (TS05b)
	// ─────────────────────────────────────────────────────────

	/**
	 * Get tasks that are ready to work on.
	 * Returns todo tasks with no unmet dependencies.
	 */
	ready(): Task[] {
		return this.list({ status: "todo" }).filter((task) => {
			// A task is ready if it has no dependencies or all dependencies are done
			if (task.dependencies.length === 0) {
				return true;
			}
			return task.dependencies.every((depId) => {
				const dep = this.get(depId);
				return dep?.status === "done";
			});
		});
	}

	/**
	 * Get tasks currently being worked on.
	 */
	doing(): Task[] {
		return this.list({ status: "doing" });
	}

	/**
	 * Get completed tasks.
	 */
	done(): Task[] {
		return this.list({ status: "done" });
	}

	/**
	 * Get tasks with unmet dependencies.
	 */
	stuck(): Task[] {
		return this.list({ status: "todo" }).filter((task) => {
			// A task is stuck if it has dependencies that are not done
			if (task.dependencies.length === 0) {
				return false;
			}
			return task.dependencies.some((depId) => {
				const dep = this.get(depId);
				return !dep || dep.status !== "done";
			});
		});
	}

	/**
	 * Get deferred tasks.
	 */
	later(): Task[] {
		return this.list({ status: "later" });
	}

	/**
	 * Get stats by status.
	 */
	getStats(): Record<TaskStatus, number> {
		const stats: Record<TaskStatus, number> = {
			todo: 0,
			doing: 0,
			done: 0,
			stuck: 0,
			later: 0,
			failed: 0,
			review: 0,
		};

		for (const task of this.list()) {
			stats[task.status]++;
		}

		return stats;
	}

	// ─────────────────────────────────────────────────────────
	// Persistence (TS03)
	// ─────────────────────────────────────────────────────────

	/**
	 * Path to the .chorus directory.
	 */
	private get chorusDir(): string {
		return join(this.projectDir, ".chorus");
	}

	/**
	 * Path to the tasks JSONL file.
	 */
	private get tasksPath(): string {
		return join(this.chorusDir, "tasks.jsonl");
	}

	/**
	 * Load tasks from JSONL file.
	 * Creates empty store if file doesn't exist.
	 */
	async load(): Promise<void> {
		if (!existsSync(this.tasksPath)) {
			return;
		}

		const content = readFileSync(this.tasksPath, "utf-8");
		const lines = content.trim().split("\n").filter(Boolean);

		for (const line of lines) {
			const jsonl = JSON.parse(line) as TaskJSONL;
			const task = this.fromJSONL(jsonl);
			this.tasks.set(task.id, task);
		}

		this.initNextId();
	}

	/**
	 * Flush all tasks to JSONL file.
	 * Uses atomic write (temp file → rename).
	 */
	async flush(): Promise<void> {
		// Ensure .chorus directory exists
		if (!existsSync(this.chorusDir)) {
			mkdirSync(this.chorusDir, { recursive: true });
		}

		// Build JSONL content
		const lines: string[] = [];
		for (const task of this.tasks.values()) {
			if (!this.deletedIds.has(task.id)) {
				lines.push(JSON.stringify(this.toJSONL(task)));
			}
		}

		const content = lines.join("\n") + (lines.length > 0 ? "\n" : "");

		// Atomic write: temp file → rename
		const tempPath = `${this.tasksPath}.tmp`;
		writeFileSync(tempPath, content, "utf-8");
		renameSync(tempPath, this.tasksPath);
	}

	/**
	 * Convert Task to JSONL format (camelCase → snake_case).
	 */
	private toJSONL(task: Task): TaskJSONL {
		return {
			id: task.id,
			title: task.title,
			description: task.description,
			status: task.status,
			type: task.type,
			tags: task.tags.length > 0 ? task.tags : undefined,
			dependencies:
				task.dependencies.length > 0 ? task.dependencies : undefined,
			assignee: task.assignee,
			model: task.model,
			acceptance_criteria: task.acceptanceCriteria,
			created_at: task.createdAt,
			updated_at: task.updatedAt,
			execution: task.execution
				? {
						started_at: task.execution.startedAt,
						completed_at: task.execution.completedAt,
						duration_ms: task.execution.durationMs,
						iterations: task.execution.iterations,
						retry_count: task.execution.retryCount,
						worktree: task.execution.worktree,
						branch: task.execution.branch,
						final_commit: task.execution.finalCommit,
						tests_passed: task.execution.testsPassed,
						tests_total: task.execution.testsTotal,
						quality_passed: task.execution.qualityPassed,
						code_changes: task.execution.codeChanges
							? {
									files_changed: task.execution.codeChanges.filesChanged,
									lines_added: task.execution.codeChanges.linesAdded,
									lines_removed: task.execution.codeChanges.linesRemoved,
								}
							: undefined,
						last_error: task.execution.lastError,
						failed_at: task.execution.failedAt,
						signals: task.execution.signals,
					}
				: undefined,
			review_count: task.reviewCount,
			last_reviewed_at: task.lastReviewedAt,
			review_result: task.reviewResult,
			learnings_count: task.learningsCount,
			has_learnings: task.hasLearnings,
		};
	}

	/**
	 * Convert JSONL to Task format (snake_case → camelCase).
	 */
	private fromJSONL(jsonl: TaskJSONL): Task {
		return {
			id: jsonl.id,
			title: jsonl.title,
			description: jsonl.description,
			status: jsonl.status as TaskStatus,
			type: (jsonl.type as TaskType) ?? "task",
			tags: jsonl.tags ?? [],
			dependencies: jsonl.dependencies ?? [],
			assignee: jsonl.assignee,
			model: jsonl.model,
			acceptanceCriteria: jsonl.acceptance_criteria,
			createdAt: jsonl.created_at,
			updatedAt: jsonl.updated_at,
			execution: jsonl.execution
				? {
						startedAt: jsonl.execution.started_at,
						completedAt: jsonl.execution.completed_at,
						durationMs: jsonl.execution.duration_ms,
						iterations: jsonl.execution.iterations,
						retryCount: jsonl.execution.retry_count,
						worktree: jsonl.execution.worktree,
						branch: jsonl.execution.branch,
						finalCommit: jsonl.execution.final_commit,
						testsPassed: jsonl.execution.tests_passed,
						testsTotal: jsonl.execution.tests_total,
						qualityPassed: jsonl.execution.quality_passed,
						codeChanges: jsonl.execution.code_changes
							? {
									filesChanged: jsonl.execution.code_changes.files_changed,
									linesAdded: jsonl.execution.code_changes.lines_added,
									linesRemoved: jsonl.execution.code_changes.lines_removed,
								}
							: undefined,
						lastError: jsonl.execution.last_error,
						failedAt: jsonl.execution.failed_at,
						signals: jsonl.execution.signals,
					}
				: undefined,
			reviewCount: jsonl.review_count,
			lastReviewedAt: jsonl.last_reviewed_at,
			reviewResult: jsonl.review_result as Task["reviewResult"],
			learningsCount: jsonl.learnings_count,
			hasLearnings: jsonl.has_learnings,
		};
	}
}
