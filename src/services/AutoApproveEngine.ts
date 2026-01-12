import type {
	AutoApproveSettings,
	TaskCompletionResult,
} from "../types/review.js";

/**
 * Evaluates if a task completion can be auto-approved based on config and labels.
 *
 * @param result - The task completion result
 * @param config - Auto-approve settings from config
 * @param taskLabels - Optional task labels to check for review rules
 * @returns true if the task can be auto-approved
 */
export function canAutoApprove(
	result: TaskCompletionResult,
	config: AutoApproveSettings,
	taskLabels: string[] = [],
): boolean {
	// Check if auto-approve is enabled
	if (!config.enabled) {
		return false;
	}

	// Check for review:skip label - bypasses all checks
	if (taskLabels.includes("review:skip")) {
		return true;
	}

	// Check for review:per-task label - forces manual review
	if (taskLabels.includes("review:per-task")) {
		return false;
	}

	// Check signal is COMPLETE
	if (!result.signal || result.signal.type !== "COMPLETE") {
		return false;
	}

	// Check iterations are within limit
	if (result.iterations > config.maxIterations) {
		return false;
	}

	// Check quality passed (if required)
	if (config.requireQualityPass) {
		const allQualityPassed = result.quality.every((q) => q.passed);
		if (!allQualityPassed) {
			return false;
		}
	}

	return true;
}
