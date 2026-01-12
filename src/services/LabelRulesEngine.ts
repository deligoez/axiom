import type { ReviewConfig, ReviewMode } from "../types/review.js";

/**
 * Map from review label shorthand to ReviewMode
 */
const REVIEW_LABEL_MAP: Record<string, ReviewMode> = {
	"review:per-task": "per-task",
	"review:batch": "batch",
	"review:auto": "auto-approve",
	"review:skip": "skip",
};

/**
 * Determines the review mode for a task based on its labels and config rules.
 *
 * @param taskLabels - Labels assigned to the task
 * @param config - Review configuration with label rules
 * @returns The review mode to use for this task
 */
export function getReviewMode(
	taskLabels: string[],
	config: ReviewConfig,
): ReviewMode {
	// First, check for explicit review:* labels (highest priority)
	for (const label of taskLabels) {
		const mode = REVIEW_LABEL_MAP[label];
		if (mode) {
			return mode;
		}
	}

	// Second, check config.labelRules overrides
	for (const rule of config.labelRules) {
		if (taskLabels.includes(rule.label)) {
			return rule.mode;
		}
	}

	// Default to config.defaultMode
	return config.defaultMode;
}
