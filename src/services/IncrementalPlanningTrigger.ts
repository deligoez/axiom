import type { EventEmitter } from "node:events";
import type { BeadsCLI } from "./BeadsCLI.js";
import type { ExtractedTask, PlanAgent } from "./PlanAgent.js";
import type { PlanningHorizonManager } from "./PlanningHorizonManager.js";
import type { SpecEvolutionTracker } from "./SpecEvolutionTracker.js";

export interface IncrementalPlanningTriggerDeps {
	beadsCLI: BeadsCLI;
	horizonManager: PlanningHorizonManager;
	specTracker: SpecEvolutionTracker;
	planAgent: PlanAgent;
	eventEmitter: EventEmitter;
}

export class IncrementalPlanningTrigger {
	private deps: IncrementalPlanningTriggerDeps;

	constructor(deps: IncrementalPlanningTriggerDeps) {
		this.deps = deps;
	}

	/**
	 * Check if planning should be triggered based on ready task count.
	 * Returns true if ready count < minReadyTasks.
	 */
	async checkTriggerCondition(): Promise<boolean> {
		const readyCount = await this.getReadyTaskCount();
		const config = this.deps.horizonManager.getHorizonConfig();
		return readyCount < config.minReadyTasks;
	}

	/**
	 * Get the current count of ready tasks (excluding deferred).
	 */
	async getReadyTaskCount(): Promise<number> {
		const tasks = await this.deps.beadsCLI.getReadyTasks({
			excludeLabels: ["deferred"],
		});
		return tasks.length;
	}

	/**
	 * Trigger planning for the next spec section.
	 * Returns false if spec is complete or planning should be stopped.
	 */
	async triggerPlanning(): Promise<boolean> {
		// Check if spec is complete
		if (this.deps.specTracker.isSpecComplete()) {
			return false;
		}

		// Check stop conditions
		if (this.deps.horizonManager.shouldStopPlanning("specComplete")) {
			return false;
		}

		// Get next section to plan
		const section = this.deps.specTracker.getNextPlanningSection();
		if (!section) {
			return false;
		}

		// Emit planning:triggered event
		this.deps.eventEmitter.emit("planning:triggered", { section });

		// Start Plan Agent
		await this.deps.planAgent.start();

		// Send section content to Plan Agent
		await this.deps.planAgent.send(`Plan tasks for section: ${section}`);

		// Extract tasks from response
		const tasks: ExtractedTask[] = this.deps.planAgent.extractTasks();

		// Mark section as tasked
		this.deps.specTracker.markSectionTasked(
			section,
			tasks.map((t) => t.title),
		);

		// Emit planning:complete event
		this.deps.eventEmitter.emit("planning:complete", {
			section,
			taskCount: tasks.length,
		});

		return true;
	}

	/**
	 * Hook called when a task is completed.
	 * Checks if planning should be triggered.
	 */
	async onTaskComplete(_taskId: string): Promise<void> {
		const shouldTrigger = await this.checkTriggerCondition();

		if (shouldTrigger && !this.deps.specTracker.isSpecComplete()) {
			await this.triggerPlanning();
		}
	}
}
