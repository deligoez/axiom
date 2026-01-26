import type { PlanReviewConfig } from "../types/config.js";
import type { AgentType, Learning } from "../types/learning.js";
import type { LearningCategorizer } from "./LearningCategorizer.js";
import type { LearningExtractor } from "./LearningExtractor.js";
import type { PlanReviewLoop, PlanReviewResult } from "./PlanReviewLoop.js";
import type { PlanReviewTrigger } from "./PlanReviewTrigger.js";
import type { SessionLogger } from "./SessionLogger.js";
import type { ApplyResult, TaskUpdater } from "./TaskUpdater.js";

/**
 * Error that occurred during plan review integration
 */
export interface PlanReviewIntegrationError {
	stage: "extraction" | "categorization" | "trigger" | "review" | "apply";
	message: string;
	learningId?: string;
}

/**
 * Result of plan review integration for a completed task
 */
export interface PlanReviewIntegrationResult {
	learningsExtracted: number;
	reviewTriggered: boolean;
	updatesApplied: ApplyResult | null;
	errors: PlanReviewIntegrationError[];
}

export interface PlanReviewIntegrationOptions {
	learningExtractor: LearningExtractor;
	learningCategorizer: LearningCategorizer;
	planReviewTrigger: PlanReviewTrigger;
	planReviewLoop: PlanReviewLoop;
	taskUpdater: TaskUpdater;
	sessionLogger: SessionLogger;
}

/**
 * Integrates Plan Review into post-task-complete flow.
 *
 * When a task completes:
 * 1. Extracts learnings from task output
 * 2. Categorizes each learning (local, cross-cutting, architectural)
 * 3. Checks if review should trigger based on config
 * 4. Runs review loop if triggered
 * 5. Applies updates via TaskUpdater
 * 6. Logs complete pipeline to session log
 */
export class PlanReviewIntegration {
	private readonly learningExtractor: LearningExtractor;
	private readonly learningCategorizer: LearningCategorizer;
	private readonly planReviewTrigger: PlanReviewTrigger;
	private readonly planReviewLoop: PlanReviewLoop;
	private readonly taskUpdater: TaskUpdater;
	private readonly sessionLogger: SessionLogger;

	constructor(options: PlanReviewIntegrationOptions) {
		this.learningExtractor = options.learningExtractor;
		this.learningCategorizer = options.learningCategorizer;
		this.planReviewTrigger = options.planReviewTrigger;
		this.planReviewLoop = options.planReviewLoop;
		this.taskUpdater = options.taskUpdater;
		this.sessionLogger = options.sessionLogger;
	}

	/**
	 * Handle task completion by running the plan review pipeline
	 *
	 * @param taskId The completed task ID
	 * @param output The task output/scratchpad content
	 * @param agentType The agent type that completed the task
	 * @param config Plan review configuration
	 * @returns Result of the plan review integration
	 */
	async onTaskComplete(
		taskId: string,
		output: string,
		agentType: AgentType,
		config: PlanReviewConfig,
	): Promise<PlanReviewIntegrationResult> {
		const result: PlanReviewIntegrationResult = {
			learningsExtracted: 0,
			reviewTriggered: false,
			updatesApplied: null,
			errors: [],
		};

		// Step 1: Extract learnings
		let learnings: Learning[] = [];
		try {
			learnings = this.learningExtractor.parse(output, taskId, agentType);
			result.learningsExtracted = learnings.length;
		} catch (error) {
			result.errors.push({
				stage: "extraction",
				message: error instanceof Error ? error.message : String(error),
			});
			this.logResult(taskId, result);
			return result;
		}

		if (learnings.length === 0) {
			this.logResult(taskId, result);
			return result;
		}

		// Step 2: Categorize learnings and check for triggers
		const categorizedLearnings: Learning[] = [];
		for (const learning of learnings) {
			try {
				const categorization = this.learningCategorizer.categorize(
					learning.content,
				);
				// Update learning scope if heuristic found a better match
				if (
					categorization.confidence === "heuristic" &&
					learning.scope === "local"
				) {
					learning.scope = categorization.scope;
				}
				categorizedLearnings.push(learning);
			} catch (error) {
				result.errors.push({
					stage: "categorization",
					message: error instanceof Error ? error.message : String(error),
					learningId: learning.id,
				});
			}
		}

		// Step 3: Check if review should trigger
		let shouldTrigger = false;
		for (const learning of categorizedLearnings) {
			try {
				if (this.planReviewTrigger.shouldTriggerReview(learning, config)) {
					shouldTrigger = true;
					break;
				}
			} catch (error) {
				result.errors.push({
					stage: "trigger",
					message: error instanceof Error ? error.message : String(error),
					learningId: learning.id,
				});
			}
		}

		result.reviewTriggered = shouldTrigger;

		if (!shouldTrigger) {
			this.logResult(taskId, result);
			return result;
		}

		// Step 4: Run review loop for triggering learnings
		let reviewResult: PlanReviewResult | null = null;
		for (const learning of categorizedLearnings) {
			if (this.planReviewTrigger.shouldTriggerReview(learning, config)) {
				try {
					reviewResult = await this.planReviewLoop.runPlanReviewLoop(
						learning,
						config,
					);
					// Only run for first triggering learning
					break;
				} catch (error) {
					result.errors.push({
						stage: "review",
						message: error instanceof Error ? error.message : String(error),
						learningId: learning.id,
					});
				}
			}
		}

		// Step 5: Apply updates
		if (reviewResult) {
			try {
				result.updatesApplied = await this.taskUpdater.applyTaskUpdates(
					reviewResult,
					config,
				);
			} catch (error) {
				result.errors.push({
					stage: "apply",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Step 6: Log result
		this.logResult(taskId, result);

		return result;
	}

	/**
	 * Log the plan review result to session log
	 */
	private logResult(taskId: string, result: PlanReviewIntegrationResult): void {
		this.sessionLogger.log({
			mode: "plan_review",
			eventType: "plan_review_complete",
			details: {
				taskId,
				learningsExtracted: result.learningsExtracted,
				reviewTriggered: result.reviewTriggered,
				updatesApplied: result.updatesApplied?.applied.length ?? 0,
				updatesPending: result.updatesApplied?.pending.length ?? 0,
				updatesQueued: result.updatesApplied?.queued.length ?? 0,
				updatesFailed: result.updatesApplied?.failed.length ?? 0,
				errorsCount: result.errors.length,
			},
		});
	}
}
