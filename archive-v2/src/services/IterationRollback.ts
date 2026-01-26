import type { RollbackResult } from "../types/rollback.js";
import type { IterationRecord } from "./StateService.js";

export interface GitResult {
	success: boolean;
	output: string;
}

export interface GitRunner {
	run(command: string, cwd?: string): Promise<GitResult>;
}

export interface StateProvider {
	getIterations(taskId: string): IterationRecord[];
}

export class IterationRollback {
	constructor(
		private stateProvider: StateProvider,
		private gitRunner: GitRunner,
	) {}

	/**
	 * Undo last N iterations for an agent
	 */
	async rollback(
		worktreePath: string,
		taskId: string,
		iterations = 1,
	): Promise<RollbackResult> {
		const boundaries = await this.getIterationBoundaries(taskId);

		if (boundaries.length === 0) {
			return {
				success: false,
				level: "iteration",
				revertedCommits: [],
				affectedTasks: [taskId],
				message: "No iteration boundaries found",
			};
		}

		// Calculate which iteration's start to reset to
		// Rollback N means undoing the last N iterations
		// Reset to the startCommit of the iteration we're rolling back to
		const targetIndex = boundaries.length - iterations;
		if (targetIndex < 0 || targetIndex >= boundaries.length) {
			return {
				success: false,
				level: "iteration",
				revertedCommits: [],
				affectedTasks: [taskId],
				message: "Not enough iterations to rollback",
			};
		}

		const targetCommit = boundaries[targetIndex].startCommit;

		// Get commits that will be reverted
		const commits = await this.findTaskCommits(worktreePath, taskId);

		// Run git reset --soft to keep changes staged
		await this.gitRunner.run(`git reset --soft ${targetCommit}`, worktreePath);

		return {
			success: true,
			level: "iteration",
			revertedCommits: commits,
			affectedTasks: [taskId],
			message: `Rolled back ${iterations} iteration(s)`,
		};
	}

	/**
	 * Count commits for specific task in worktree
	 */
	async getTaskCommitCount(
		worktreePath: string,
		taskId: string,
	): Promise<number> {
		const result = await this.gitRunner.run(
			`git log --grep="[${taskId}]" --format=%H`,
			worktreePath,
		);

		if (!result.output.trim()) {
			return 0;
		}

		return result.output.trim().split("\n").length;
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
	 * Get commits from specific iteration
	 */
	async findIterationCommits(
		worktreePath: string,
		taskId: string,
		iterationNumber: number,
	): Promise<string[]> {
		const boundaries = await this.getIterationBoundaries(taskId);
		const iteration = boundaries.find((b) => b.number === iterationNumber);

		if (!iteration) {
			return [];
		}

		// Get commits from this iteration's start to HEAD
		const result = await this.gitRunner.run(
			`git log ${iteration.startCommit}..HEAD --format=%H`,
			worktreePath,
		);

		if (!result.output.trim()) {
			return [];
		}

		return result.output.trim().split("\n");
	}

	/**
	 * Get iteration boundaries from state
	 */
	async getIterationBoundaries(
		taskId: string,
	): Promise<Array<{ number: number; startCommit: string }>> {
		return this.stateProvider.getIterations(taskId);
	}
}
