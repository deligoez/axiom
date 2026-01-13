import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlanReviewConfig } from "../types/config.js";
import type { TaskProvider } from "../types/task-provider.js";
import type { PlanReviewResult, TaskUpdate } from "./PlanReviewLoop.js";

/**
 * Interface for OrchestrationStore to check agent status
 */
interface OrchestrationStore {
	getAgentByTaskId(taskId: string): { id: string } | null;
}

/**
 * Result of applying task updates
 */
export interface ApplyResult {
	applied: TaskUpdate[];
	pending: TaskUpdate[];
	queued: TaskUpdate[];
	failed: { update: TaskUpdate; error: string }[];
}

/**
 * Minor fields that can be auto-applied with 'minor' setting
 */
const MINOR_FIELDS = new Set([
	"acceptance_criteria",
	"add_criteria",
	"notes",
	"labels",
]);

export interface TaskUpdaterOptions {
	taskProvider: Pick<TaskProvider, "updateTask" | "addLabel" | "closeTask">;
	orchestrationStore: OrchestrationStore;
	projectDir: string;
}

/**
 * Applies Plan Review changes to TaskStore tasks based on config approval settings.
 *
 * Handles:
 * - Auto-applying changes based on autoApply level
 * - Queuing changes requiring approval
 * - Queuing updates for in-progress tasks
 * - Marking tasks as redundant
 */
export class TaskUpdater {
	private readonly taskProvider: Pick<
		TaskProvider,
		"updateTask" | "addLabel" | "closeTask"
	>;
	private readonly orchestrationStore: OrchestrationStore;
	private readonly projectDir: string;
	private readonly pendingUpdatesPath: string;

	constructor(options: TaskUpdaterOptions) {
		this.taskProvider = options.taskProvider;
		this.orchestrationStore = options.orchestrationStore;
		this.projectDir = options.projectDir;
		this.pendingUpdatesPath = join(
			this.projectDir,
			".chorus",
			"pending-task-updates.json",
		);
	}

	/**
	 * Apply task updates based on review results and config
	 */
	async applyTaskUpdates(
		result: PlanReviewResult,
		config: PlanReviewConfig,
	): Promise<ApplyResult> {
		const summary: ApplyResult = {
			applied: [],
			pending: [],
			queued: [],
			failed: [],
		};

		// Process regular updates
		for (const update of result.totalUpdates) {
			await this.processUpdate(update, config, summary);
		}

		// Process redundant tasks
		for (const taskId of result.redundantTasks) {
			await this.processRedundant(taskId, config, summary);
		}

		return summary;
	}

	/**
	 * Process a single update based on config
	 */
	private async processUpdate(
		update: TaskUpdate,
		config: PlanReviewConfig,
		summary: ApplyResult,
	): Promise<void> {
		// Check if task is in progress
		if (await this.isTaskInProgress(update.taskId)) {
			await this.queueUpdate(update);
			summary.queued.push(update);
			return;
		}

		// Determine if we should auto-apply
		const shouldAutoApply = this.shouldAutoApply(update, config);

		if (shouldAutoApply) {
			try {
				await this.applyUpdate(update);
				summary.applied.push(update);
			} catch (error) {
				summary.failed.push({
					update,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		} else {
			summary.pending.push(update);
		}
	}

	/**
	 * Process a redundant task marking
	 */
	private async processRedundant(
		taskId: string,
		config: PlanReviewConfig,
		summary: ApplyResult,
	): Promise<void> {
		// Check if redundant marking requires approval
		if (config.requireApproval.includes("redundant")) {
			summary.pending.push({
				taskId,
				field: "_redundant",
				newValue: "true",
			});
			return;
		}

		try {
			await this.markRedundant(taskId);
			summary.applied.push({
				taskId,
				field: "_redundant",
				newValue: "true",
			});
		} catch (error) {
			summary.failed.push({
				update: { taskId, field: "_redundant", newValue: "true" },
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Check if an update should be auto-applied based on config
	 */
	private shouldAutoApply(
		update: TaskUpdate,
		config: PlanReviewConfig,
	): boolean {
		switch (config.autoApply) {
			case "all":
				return true;
			case "minor":
				return MINOR_FIELDS.has(update.field);
			default:
				return false;
		}
	}

	/**
	 * Apply an update to a task via TaskProvider
	 */
	private async applyUpdate(update: TaskUpdate): Promise<void> {
		await this.taskProvider.updateTask(
			update.taskId,
			update.field,
			update.newValue,
		);
	}

	/**
	 * Mark a task as redundant (add label and close)
	 */
	private async markRedundant(taskId: string): Promise<void> {
		await this.taskProvider.addLabel(taskId, "redundant");
		await this.taskProvider.closeTask(taskId);
	}

	/**
	 * Check if a task has a running agent
	 */
	async isTaskInProgress(taskId: string): Promise<boolean> {
		const agent = this.orchestrationStore.getAgentByTaskId(taskId);
		return agent !== null;
	}

	/**
	 * Queue an update for an in-progress task
	 */
	private async queueUpdate(update: TaskUpdate): Promise<void> {
		const pending = this.loadPendingUpdates();

		if (!pending[update.taskId]) {
			pending[update.taskId] = [];
		}

		pending[update.taskId].push(update);
		this.savePendingUpdates(pending);
	}

	/**
	 * Get queued updates for a specific task
	 */
	async getQueuedUpdates(taskId: string): Promise<TaskUpdate[]> {
		const pending = this.loadPendingUpdates();
		return pending[taskId] || [];
	}

	/**
	 * Load pending updates from file
	 */
	private loadPendingUpdates(): Record<string, TaskUpdate[]> {
		if (!existsSync(this.pendingUpdatesPath)) {
			return {};
		}

		try {
			const content = readFileSync(this.pendingUpdatesPath, "utf-8");
			return JSON.parse(content) as Record<string, TaskUpdate[]>;
		} catch {
			return {};
		}
	}

	/**
	 * Save pending updates to file
	 */
	private savePendingUpdates(pending: Record<string, TaskUpdate[]>): void {
		writeFileSync(this.pendingUpdatesPath, JSON.stringify(pending, null, 2));
	}
}
