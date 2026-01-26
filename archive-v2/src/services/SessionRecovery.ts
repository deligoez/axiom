import type {
	AgentState,
	ChorusState,
	MergeQueueItem,
} from "../types/state.js";

export interface RecoveryResult {
	recovered: boolean;
	restoredTasks: string[];
	cleanedWorktrees: string[];
	resumedMergeItems: number;
	errors: string[];
}

export interface CommandResult {
	success: boolean;
	output: string;
}

export interface StateProvider {
	load(): ChorusState | null;
	save(): void;
	getRunningAgents(): AgentState[];
	removeAgent(id: string): void;
}

export interface MergeQueueProvider {
	enqueue(item: MergeQueueItem): void;
}

export interface TaskReleaseProvider {
	releaseTask(taskId: string): Promise<void>;
}

export interface WorktreeManager {
	remove(path: string, options?: { force?: boolean }): Promise<void>;
}

export interface CommandRunner {
	run(command: string, cwd?: string): Promise<CommandResult>;
}

export class SessionRecovery {
	constructor(
		private stateProvider: StateProvider,
		private mergeQueueProvider: MergeQueueProvider,
		private taskProvider: TaskReleaseProvider,
		private worktreeManager: WorktreeManager,
		private commandRunner: CommandRunner,
	) {}

	/**
	 * Check if recovery is needed (agents with running status in state)
	 */
	async needsRecovery(): Promise<boolean> {
		const state = this.stateProvider.load();
		if (!state) return false;

		const runningAgents = this.stateProvider.getRunningAgents();
		return runningAgents.length > 0;
	}

	/**
	 * Recover from crash by cleaning up orphan processes and restoring state
	 */
	async recover(): Promise<RecoveryResult> {
		const state = this.stateProvider.load();
		const result: RecoveryResult = {
			recovered: false,
			restoredTasks: [],
			cleanedWorktrees: [],
			resumedMergeItems: 0,
			errors: [],
		};

		if (!state) {
			result.recovered = true;
			return result;
		}

		// 1. Handle running agents (orphan processes)
		const runningAgents = this.stateProvider.getRunningAgents();
		for (const agent of runningAgents) {
			try {
				const exists = await this.processExists(agent.pid);
				if (exists) {
					// Process still running - kill it
					await this.commandRunner.run(`kill ${agent.pid}`);
				}
				// Return task to pending
				await this.taskProvider.releaseTask(agent.taskId);
				result.restoredTasks.push(agent.taskId);
				this.stateProvider.removeAgent(agent.id);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				result.errors.push(`Failed to check/kill PID ${agent.pid}: ${message}`);
			}
		}

		// 2. Resume merge queue
		result.resumedMergeItems = await this.resumeMergeQueue();

		// 3. Save cleaned state
		this.stateProvider.save();
		result.recovered = true;

		return result;
	}

	/**
	 * Check if a process exists using kill -0
	 * @returns true if process exists, false if it doesn't
	 */
	async processExists(pid: number): Promise<boolean> {
		try {
			await this.commandRunner.run(`kill -0 ${pid}`);
			return true;
		} catch (error) {
			// Permission denied (EACCES) → treat as "process exists" (conservative)
			if (this.isPermissionDenied(error)) {
				return true;
			}
			// ESRCH (no such process) → treat as "process doesn't exist"
			return false;
		}
	}

	/**
	 * Re-enqueue pending items from state merge queue
	 */
	async resumeMergeQueue(): Promise<number> {
		const state = this.stateProvider.load();
		if (!state) return 0;

		let count = 0;
		for (const item of state.mergeQueue) {
			// Only re-enqueue items that were pending (not already being processed)
			if (item.status === "pending") {
				this.mergeQueueProvider.enqueue(item);
				count++;
			}
		}

		return count;
	}

	/**
	 * Handle a crashed agent - stash changes and return task to pending
	 */
	async handleAgentCrash(agentId: string): Promise<void> {
		const state = this.stateProvider.load();
		if (!state) return;

		const agent = state.agents[agentId];
		if (!agent) return;

		// Stash any uncommitted changes in worktree
		try {
			await this.commandRunner.run(
				"git stash --include-untracked",
				agent.worktree,
			);
		} catch {
			// Ignore stash errors
		}

		// Return task to pending
		await this.taskProvider.releaseTask(agent.taskId);

		// Remove from state
		this.stateProvider.removeAgent(agentId);
	}

	/**
	 * Handle a broken worktree - force remove
	 */
	async handleWorktreeBroken(worktreePath: string): Promise<void> {
		await this.worktreeManager.remove(worktreePath, { force: true });
	}

	/**
	 * Handle an orphaned worktree (not in state) - remove
	 */
	async handleOrphanedWorktree(worktreePath: string): Promise<void> {
		await this.worktreeManager.remove(worktreePath, { force: true });
	}

	private isPermissionDenied(error: unknown): boolean {
		if (error && typeof error === "object") {
			const e = error as Record<string, unknown>;
			if (e.code === "EACCES") return true;
			if (typeof e.message === "string" && e.message.includes("EACCES"))
				return true;
		}
		return false;
	}
}
