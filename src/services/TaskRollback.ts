import type { RollbackResult } from "../types/rollback.js";

export interface GitResult {
	success: boolean;
	output: string;
}

export interface GitRunner {
	run(command: string, cwd?: string): Promise<GitResult>;
}

export interface TaskStatusUpdater {
	setPending(taskId: string): Promise<void>;
}

export interface DependentProvider {
	getDependents(taskId: string): Promise<string[]>;
}

export class TaskRollback {
	constructor(
		private gitRunner: GitRunner,
		private statusUpdater: TaskStatusUpdater,
		private dependentProvider: DependentProvider,
	) {}

	/**
	 * Level 2: Revert all commits for a single task
	 * Uses git revert for each commit with [task-id] in message
	 */
	async rollback(
		worktreePath: string,
		taskId: string,
	): Promise<RollbackResult> {
		const commits = await this.findTaskCommits(worktreePath, taskId);

		// Revert commits in order (git log returns most recent first)
		for (const commit of commits) {
			await this.gitRunner.run(
				`git revert --no-commit ${commit}`,
				worktreePath,
			);
		}

		// Set task to pending
		await this.statusUpdater.setPending(taskId);

		return {
			success: true,
			level: "task",
			revertedCommits: commits,
			affectedTasks: [taskId],
			message: `Reverted ${commits.length} commit(s) for task ${taskId}`,
		};
	}

	/**
	 * Level 3: Rollback task and all dependent tasks
	 * 1. Get all dependents recursively
	 * 2. Order: leaves first, root last
	 * 3. Rollback each in order
	 */
	async rollbackWithDependents(
		worktreePath: string,
		taskId: string,
	): Promise<RollbackResult> {
		const order = await this.getRollbackOrder(taskId);
		const allRevertedCommits: string[] = [];

		// Rollback each task in order (leaves first)
		for (const tid of order) {
			const commits = await this.findTaskCommits(worktreePath, tid);
			for (const commit of commits) {
				await this.gitRunner.run(
					`git revert --no-commit ${commit}`,
					worktreePath,
				);
			}
			allRevertedCommits.push(...commits);
			await this.statusUpdater.setPending(tid);
		}

		return {
			success: true,
			level: "task_chain",
			revertedCommits: allRevertedCommits,
			affectedTasks: order,
			message: `Rolled back ${order.length} task(s) with ${allRevertedCommits.length} commit(s)`,
		};
	}

	/**
	 * Find commits belonging to a task
	 */
	async findTaskCommits(
		worktreePath: string,
		taskId: string,
	): Promise<string[]> {
		const result = await this.gitRunner.run(
			`git log --grep="[${taskId}]" --format=%H`,
			worktreePath,
		);

		if (!result.output.trim()) {
			return [];
		}

		return result.output.trim().split("\n");
	}

	/**
	 * Get tasks in rollback order (leaves first, root last)
	 * Uses post-order traversal of dependency tree
	 */
	async getRollbackOrder(taskId: string): Promise<string[]> {
		const visited = new Set<string>();
		const result: string[] = [];

		const visit = async (tid: string): Promise<void> => {
			if (visited.has(tid)) return;
			visited.add(tid);

			// Get dependents (tasks that depend on this task)
			const dependents = await this.dependentProvider.getDependents(tid);

			// Visit all dependents first (depth-first)
			for (const depId of dependents) {
				await visit(depId);
			}

			// Add this task after its dependents (post-order)
			result.push(tid);
		};

		await visit(taskId);
		return result;
	}
}
