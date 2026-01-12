import { useInput } from "ink";
import type { Task } from "../services/BeadsCLI.js";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseRecoveryKeysOptions {
	selectedTask: Task | null;
	beadsCLI: {
		runBdCommand: (args: string[]) => Promise<void>;
	};
	iterationRollback: {
		rollback: (
			worktreePath: string,
			taskId: string,
		) => Promise<{ success: boolean; revertedCommits: string[] }>;
		getTaskCommitCount: (
			worktreePath: string,
			taskId: string,
		) => Promise<number>;
	};
	worktreeService: {
		remove: (
			agentType: string,
			taskId: string,
			options?: { force: boolean },
		) => Promise<void>;
		exists: (agentType: string, taskId: string) => boolean;
	};
	onToast?: (message: string) => void;
	onIterationUpdate?: (taskId: string, maxIterations: number) => void;
}

const DEFAULT_MAX_ITERATIONS = 10;
const ITERATION_INCREMENT = 5;
const DEFAULT_AGENT_TYPE = "claude";

/**
 * useRecoveryKeys - Hook for handling task recovery keyboard shortcuts
 *
 * Handles:
 * - r: Retry task (clear failure state, return to PENDING)
 * - R: Rollback task (revert commits, return to PENDING)
 * - X: Cleanup worktree (remove worktree, keep FAILED status)
 * - +: Increase maxIterations for selected task
 */
export function useRecoveryKeys({
	selectedTask,
	beadsCLI,
	iterationRollback,
	worktreeService,
	onToast,
	onIterationUpdate,
}: UseRecoveryKeysOptions): void {
	// Handle keyboard input
	useInput(
		(input) => {
			// Skip if no task selected
			if (!selectedTask) {
				return;
			}

			// Custom fields can include failed, timeout, maxIterations
			const custom = selectedTask.custom as Record<string, string> | undefined;
			const isFailed = custom?.failed === "true";
			const isTimeout = custom?.timeout === "true";
			const taskId = selectedTask.id;

			// r: Retry task (clear flags)
			if (input === "r" && (isFailed || isTimeout)) {
				handleRetry(taskId);
				return;
			}

			// R (Shift+r): Rollback task
			if (input === "R" && isFailed) {
				handleRollback(taskId);
				return;
			}

			// X (Shift+x): Cleanup worktree
			if (input === "X" && (isFailed || isTimeout)) {
				handleCleanup(taskId);
				return;
			}

			// +: Increase maxIterations
			if (input === "+" && isTimeout) {
				handleIncreaseIterations(taskId);
				return;
			}
		},
		{ isActive: getIsTTY() },
	);

	// Helper functions
	async function handleRetry(taskId: string) {
		try {
			// Clear failed and timeout flags
			await beadsCLI.runBdCommand([
				"update",
				taskId,
				"--custom",
				"failed=",
				"--custom",
				"timeout=",
			]);
			onToast?.(`Task ${taskId} returned to pending`);
		} catch (error) {
			onToast?.(`Failed to retry task: ${error}`);
		}
	}

	async function handleRollback(taskId: string) {
		try {
			// Check if task has commits
			const worktreePath = `.worktrees/${DEFAULT_AGENT_TYPE}-${taskId}`;
			const commitCount = await iterationRollback.getTaskCommitCount(
				worktreePath,
				taskId,
			);

			if (commitCount === 0) {
				onToast?.("No commits to rollback");
				return;
			}

			// Perform rollback
			const result = await iterationRollback.rollback(worktreePath, taskId);

			if (result.success) {
				// Clear flags after successful rollback
				await beadsCLI.runBdCommand([
					"update",
					taskId,
					"--custom",
					"failed=",
					"--custom",
					"timeout=",
				]);
				onToast?.(
					`Rolled back ${result.revertedCommits.length} commits for ${taskId}`,
				);
			} else {
				onToast?.("Rollback failed");
			}
		} catch (error) {
			onToast?.(`Failed to rollback: ${error}`);
		}
	}

	async function handleCleanup(taskId: string) {
		try {
			// Check if worktree exists
			if (!worktreeService.exists(DEFAULT_AGENT_TYPE, taskId)) {
				onToast?.("No worktree to clean");
				return;
			}

			// Remove worktree with force
			await worktreeService.remove(DEFAULT_AGENT_TYPE, taskId, { force: true });
			onToast?.(`Worktree cleaned for ${taskId}`);
		} catch (error) {
			onToast?.(`Failed to cleanup worktree: ${error}`);
		}
	}

	function handleIncreaseIterations(taskId: string) {
		// Get current maxIterations or use default
		const custom = selectedTask?.custom as Record<string, string> | undefined;
		const currentMax = Number(custom?.maxIterations) || DEFAULT_MAX_ITERATIONS;
		const newMax = currentMax + ITERATION_INCREMENT;

		onIterationUpdate?.(taskId, newMax);
		onToast?.(`Max iterations increased to ${newMax} for ${taskId}`);
	}
}
