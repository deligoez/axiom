import { execSync } from "node:child_process";
import type { MergeQueue } from "../services/MergeQueue.js";

export interface MergeUserOptions {
	branch: string;
	priority?: 0 | 1 | 2 | 3 | 4;
	queue: MergeQueue;
}

export interface MergeUserResult {
	success: boolean;
	error?: string;
	position?: number;
	commitCount?: number;
}

/**
 * Add a user branch to the merge queue.
 *
 * Validates the branch exists and has commits ahead of main,
 * then adds it to the merge queue with the specified priority.
 */
export async function mergeUserCommand(
	options: MergeUserOptions,
): Promise<MergeUserResult> {
	const { branch, priority = 2, queue } = options;

	// 1. Validate branch exists
	try {
		execSync(`git rev-parse --verify ${branch}`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		return {
			success: false,
			error: `Branch '${branch}' does not exist`,
		};
	}

	// 2. Validate branch has commits ahead of main
	let commitCount: number;
	try {
		const countOutput = execSync(`git rev-list main..${branch} --count`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		commitCount = Number.parseInt(countOutput.trim(), 10);
	} catch {
		commitCount = 0;
	}

	if (commitCount === 0) {
		return {
			success: false,
			error: `Branch '${branch}' has no commits ahead of main`,
		};
	}

	// 3. Check if branch is already in queue
	const existingItems = queue.getItems?.() ?? [];
	const alreadyInQueue = existingItems.some(
		(item: { branch: string }) => item.branch === branch,
	);
	if (alreadyInQueue) {
		return {
			success: false,
			error: `Branch '${branch}' is already in queue`,
		};
	}

	// 4. Add to merge queue
	const taskId = `user-${branch}-${Date.now()}`;
	queue.enqueue({
		taskId,
		branch,
		worktree: branch, // User worktrees use branch name
		priority,
		dependencies: [], // User branches have no dependencies
	});

	// 5. Calculate position (items count after enqueue)
	const position = (queue.getItems?.()?.length ?? 0) + 1;

	return {
		success: true,
		position,
		commitCount,
	};
}
