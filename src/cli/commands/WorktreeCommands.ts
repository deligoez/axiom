/**
 * WorktreeCommands - CLI commands for worktree management
 *
 * Commands:
 * - chorus worktree clean <task-id>
 * - chorus worktree clean --failed
 * - chorus worktree clean --all
 * - chorus worktree list
 * - chorus worktree list --orphaned
 */

import type { BeadsCLI } from "../../services/BeadsCLI.js";
import type {
	WorktreeInfo,
	WorktreeService,
} from "../../services/WorktreeService.js";

export interface OrphanedWorktree extends WorktreeInfo {
	suggestedAction: string;
}

export class WorktreeCommands {
	constructor(
		public readonly worktreeService: WorktreeService,
		public readonly beadsCLI: BeadsCLI,
	) {}

	/**
	 * Clean worktree for a specific task
	 * Usage: chorus worktree clean <task-id>
	 */
	async cleanTaskWorktree(taskId: string): Promise<string> {
		// Default agent type is "claude" for MVP
		await this.worktreeService.remove("claude", taskId, {
			force: true,
			deleteBranch: true,
		});
		return `Cleaned worktree for ${taskId}`;
	}

	/**
	 * Clean worktrees for failed/timeout tasks
	 * Usage: chorus worktree clean --failed
	 *
	 * Finds orphaned worktrees (worktrees without in_progress tasks)
	 * and removes them.
	 */
	async cleanFailedWorktrees(): Promise<string> {
		const worktrees = this.worktreeService.list();
		const inProgressTasks = await this.beadsCLI.getInProgressTasks();
		const inProgressTaskIds = new Set(inProgressTasks.map((t) => t.id));

		let cleanedCount = 0;

		for (const worktree of worktrees) {
			// If the worktree's task is not in_progress, it's orphaned/failed
			if (!inProgressTaskIds.has(worktree.taskId)) {
				await this.worktreeService.remove(worktree.agentType, worktree.taskId, {
					force: true,
					deleteBranch: true,
				});
				cleanedCount++;
			}
		}

		return `Cleaned ${cleanedCount} worktrees for failed/timeout tasks`;
	}

	/**
	 * Clean all worktrees
	 * Usage: chorus worktree clean --all [--yes]
	 */
	async cleanAllWorktrees(confirmed: boolean): Promise<string> {
		if (!confirmed) {
			return "Confirmation required. Use --yes to confirm.";
		}

		const worktrees = this.worktreeService.list();

		for (const worktree of worktrees) {
			await this.worktreeService.remove(worktree.agentType, worktree.taskId, {
				force: true,
				deleteBranch: true,
			});
		}

		await this.worktreeService.prune();

		return `Cleaned ${worktrees.length} worktrees`;
	}

	/**
	 * List all worktrees
	 * Usage: chorus worktree list
	 */
	async listWorktrees(): Promise<WorktreeInfo[]> {
		return this.worktreeService.list();
	}

	/**
	 * List orphaned worktrees (without matching in-progress task)
	 * Usage: chorus worktree list --orphaned
	 */
	async listOrphanedWorktrees(): Promise<OrphanedWorktree[]> {
		const worktrees = this.worktreeService.list();
		const inProgressTasks = await this.beadsCLI.getInProgressTasks();
		const inProgressTaskIds = new Set(inProgressTasks.map((t) => t.id));

		const orphaned: OrphanedWorktree[] = [];

		for (const worktree of worktrees) {
			if (!inProgressTaskIds.has(worktree.taskId)) {
				orphaned.push({
					...worktree,
					suggestedAction: `chorus worktree clean ${worktree.taskId}`,
				});
			}
		}

		return orphaned;
	}
}
