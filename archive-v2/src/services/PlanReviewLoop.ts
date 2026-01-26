import type { PlanReviewConfig } from "../types/config.js";
import type { Learning } from "../types/learning.js";
import type { Task } from "../types/task.js";
import type { PlanAgent } from "./PlanAgent.js";
import type { SessionLogger } from "./SessionLogger.js";

/**
 * Represents a task update proposed by Plan Agent
 */
export interface TaskUpdate {
	taskId: string;
	field: string;
	oldValue?: string;
	newValue: string;
}

/**
 * Response structure from Plan Agent review
 */
interface PlanAgentReviewResponse {
	updates: TaskUpdate[];
	redundant: string[];
	unchanged: string[];
}

/**
 * Result of the Plan Review Loop execution
 */
export interface PlanReviewResult {
	iterations: number;
	totalUpdates: TaskUpdate[];
	redundantTasks: string[];
	earlyStop: boolean;
}

/**
 * Interface for task listing operations
 */
export interface TaskLister {
	listAll(): Promise<Task[]>;
}

export interface PlanReviewLoopOptions {
	planAgent: PlanAgent;
	sessionLogger: SessionLogger;
	taskLister: TaskLister;
}

/**
 * Executes Plan Agent review loop with early termination when no changes detected.
 *
 * The loop:
 * 1. Spawns Plan Agent with review prompt (learning + non-closed tasks)
 * 2. Parses JSON response for updates
 * 3. Continues until no updates or maxIterations reached
 * 4. Returns aggregated results
 */
export class PlanReviewLoop {
	private readonly planAgent: PlanAgent;
	private readonly sessionLogger: SessionLogger;
	private readonly taskLister: TaskLister;

	constructor(options: PlanReviewLoopOptions) {
		this.planAgent = options.planAgent;
		this.sessionLogger = options.sessionLogger;
		this.taskLister = options.taskLister;
	}

	/**
	 * Execute the Plan Review Loop
	 *
	 * @param learning The categorized learning that triggered the review
	 * @param config Plan review configuration
	 * @returns Aggregated results from all iterations
	 */
	async runPlanReviewLoop(
		learning: Learning,
		config: PlanReviewConfig,
	): Promise<PlanReviewResult> {
		const result: PlanReviewResult = {
			iterations: 0,
			totalUpdates: [],
			redundantTasks: [],
			earlyStop: false,
		};

		try {
			// Start Plan Agent
			await this.planAgent.start();

			// Get non-closed tasks
			const allTasks = await this.taskLister.listAll();
			const nonClosedTasks = allTasks.filter((task) => task.status !== "done");

			// Run iterations
			for (let i = 0; i < config.maxIterations; i++) {
				result.iterations++;

				// Build review prompt
				const prompt = this.buildReviewPrompt(learning, nonClosedTasks);

				// Send to Plan Agent and get response
				const responseText = await this.planAgent.send(prompt);

				// Parse response
				const response = this.parseResponse(responseText);

				// Log iteration
				this.sessionLogger.log({
					mode: "plan_review",
					eventType: "plan_review_iteration",
					details: {
						iteration: result.iterations,
						changesCount: response.updates.length,
						redundantCount: response.redundant.length,
					},
				});

				// Aggregate results
				result.totalUpdates.push(...response.updates);
				result.redundantTasks.push(...response.redundant);

				// Check for early termination
				if (response.updates.length === 0) {
					result.earlyStop = true;
					break;
				}
			}
		} finally {
			// Always stop Plan Agent
			await this.planAgent.stop();
		}

		return result;
	}

	/**
	 * Build the review prompt for Plan Agent
	 */
	private buildReviewPrompt(learning: Learning, tasks: Task[]): string {
		const taskList = tasks
			.map(
				(t) =>
					`- ${t.id}: ${t.title} (${t.status})${t.description ? `\n  ${t.description}` : ""}`,
			)
			.join("\n");

		return `## Learning to Review

${learning.content}

Scope: ${learning.scope}
Category: ${learning.category}
Source Task: ${learning.source.taskId}

## Current Tasks (Non-Closed)

${taskList}

## Instructions

Review the learning and determine which tasks need updates based on this new information.

Respond with JSON:
\`\`\`json
{
  "updates": [
    { "taskId": "ch-xxx", "field": "description", "oldValue": "...", "newValue": "..." }
  ],
  "redundant": ["ch-yyy"],
  "unchanged": ["ch-zzz"]
}
\`\`\`

- updates: Tasks that need modifications
- redundant: Tasks that are now obsolete
- unchanged: Tasks that don't need changes`;
	}

	/**
	 * Parse Plan Agent response JSON
	 */
	private parseResponse(responseText: string): PlanAgentReviewResponse {
		try {
			// Try to parse directly
			const parsed = JSON.parse(responseText);
			return this.validateResponse(parsed);
		} catch {
			// Try to extract JSON from markdown code block
			const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
			if (jsonMatch) {
				try {
					const parsed = JSON.parse(jsonMatch[1]);
					return this.validateResponse(parsed);
				} catch {
					// Fall through to default
				}
			}

			// Return empty response on parse failure
			return { updates: [], redundant: [], unchanged: [] };
		}
	}

	/**
	 * Validate and normalize response structure
	 */
	private validateResponse(data: unknown): PlanAgentReviewResponse {
		if (typeof data !== "object" || data === null) {
			return { updates: [], redundant: [], unchanged: [] };
		}

		const obj = data as Record<string, unknown>;

		return {
			updates: Array.isArray(obj.updates) ? (obj.updates as TaskUpdate[]) : [],
			redundant: Array.isArray(obj.redundant)
				? (obj.redundant as string[])
				: [],
			unchanged: Array.isArray(obj.unchanged)
				? (obj.unchanged as string[])
				: [],
		};
	}
}
