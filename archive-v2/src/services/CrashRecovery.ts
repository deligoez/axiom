import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type AuditEntry, readAuditLog } from "./AuditLog.js";
import type { TaskStore } from "./TaskStore.js";

/**
 * Result of crash recovery operation.
 */
export interface RecoveryResult {
	recoveredCount: number;
	recoveredIds: string[];
}

/**
 * Context for a recovered task.
 */
export interface RecoveryContext {
	retryCount: number;
	message: string;
	auditEntries?: AuditEntry[];
	hasWorktreeChanges?: boolean;
}

/**
 * Recover orphaned tasks after a crash.
 *
 * Finds all tasks in 'doing' status (orphaned without active agent)
 * and resets them to 'todo' status so they can be re-claimed.
 *
 * @param store - The TaskStore instance
 * @returns Recovery result with count and IDs
 */
export async function recoverOrphanedTasks(
	store: TaskStore,
): Promise<RecoveryResult> {
	const orphanedTasks = store.doing();
	const recoveredIds: string[] = [];

	for (const task of orphanedTasks) {
		// Get current execution stats
		const execution = task.execution ?? { iterations: 0, retryCount: 0 };

		// Update task to todo with incremented retryCount
		store.update(task.id, {
			status: "todo",
		});

		// Update execution directly (since update doesn't handle nested execution)
		const updated = store.get(task.id);
		if (updated) {
			// Use internal method pattern - store the updated execution
			(updated as { execution: typeof execution }).execution = {
				...execution,
				retryCount: (execution.retryCount ?? 0) + 1,
			};
		}

		// Log recovery event to audit
		store.audit(task.id, {
			type: "crash_recovery",
			action: "reset_to_todo",
			previousRetryCount: execution.retryCount ?? 0,
		});

		recoveredIds.push(task.id);
	}

	return {
		recoveredCount: recoveredIds.length,
		recoveredIds,
	};
}

/**
 * Get recovery context for a task.
 *
 * Returns undefined if the task has no previous attempts (retryCount = 0).
 * Otherwise returns context including audit log and worktree info.
 *
 * @param taskId - The task ID
 * @param store - The TaskStore instance
 * @param projectDir - The project directory
 * @returns RecoveryContext or undefined
 */
export function getRecoveryContext(
	taskId: string,
	store: TaskStore,
	projectDir: string,
): RecoveryContext | undefined {
	const task = store.get(taskId);
	if (!task) {
		return undefined;
	}

	const retryCount = task.execution?.retryCount ?? 0;
	if (retryCount === 0) {
		return undefined;
	}

	// Read audit log for context
	const auditEntries = readAuditLog(projectDir, taskId);

	// Check for worktree changes
	const worktreeDir = join(projectDir, ".worktrees", `claude-${taskId}`);
	const hasWorktreeChanges = checkWorktreeHasChanges(worktreeDir);

	// Build instruction message
	const message = buildRecoveryMessage(retryCount, hasWorktreeChanges);

	return {
		retryCount,
		message,
		auditEntries: auditEntries.length > 0 ? auditEntries : undefined,
		hasWorktreeChanges,
	};
}

/**
 * Check if worktree directory has any files (uncommitted changes).
 */
function checkWorktreeHasChanges(worktreeDir: string): boolean {
	if (!existsSync(worktreeDir)) {
		return false;
	}

	try {
		const files = readdirSync(worktreeDir);
		// Exclude .git directory
		return files.filter((f) => f !== ".git").length > 0;
	} catch {
		return false;
	}
}

/**
 * Build instruction message for recovered task.
 */
function buildRecoveryMessage(
	retryCount: number,
	hasWorktreeChanges: boolean,
): string {
	let message = `This is retry #${retryCount}. The previous attempt crashed or failed.`;

	if (hasWorktreeChanges) {
		message +=
			" There are uncommitted changes in the worktree from the previous attempt.";
	}

	message +=
		" Please review the audit log and continue from where you left off.";

	return message;
}
