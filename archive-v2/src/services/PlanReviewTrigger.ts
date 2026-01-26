import type { PlanReviewConfig } from "../types/config.js";
import type { Learning, LearningScope } from "../types/learning.js";

interface Logger {
	log: (message: string) => void;
}

/**
 * Maps learning scope (hyphenated) to config triggerOn format (underscored)
 */
const SCOPE_TO_CONFIG_MAP: Record<LearningScope, string> = {
	local: "local",
	"cross-cutting": "cross_cutting",
	architectural: "architectural",
};

export class PlanReviewTrigger {
	constructor(private readonly logger: Logger) {}

	/**
	 * Determine if a learning should trigger Plan Review
	 * @param learning The categorized learning to check
	 * @param config Plan review configuration
	 * @returns true if review should be triggered
	 */
	shouldTriggerReview(learning: Learning, config: PlanReviewConfig): boolean {
		// Check if plan review is enabled
		if (!config.enabled) {
			this.logger.log(
				`Plan review trigger: SKIPPED (disabled) for learning ${learning.id}`,
			);
			return false;
		}

		// Local learnings never trigger review
		if (learning.scope === "local") {
			this.logger.log(
				`Plan review trigger: SKIPPED (local scope) for learning ${learning.id}`,
			);
			return false;
		}

		// Map learning scope to config format
		const configScope = SCOPE_TO_CONFIG_MAP[learning.scope];

		// Check if scope is in triggerOn list
		const shouldTrigger = config.triggerOn.includes(configScope);

		if (shouldTrigger) {
			this.logger.log(
				`Plan review trigger: TRIGGERED (${learning.scope}) for learning ${learning.id}`,
			);
		} else {
			this.logger.log(
				`Plan review trigger: SKIPPED (${learning.scope} not in triggerOn) for learning ${learning.id}`,
			);
		}

		return shouldTrigger;
	}
}
