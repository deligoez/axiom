import type { InterventionResult } from "../types/intervention.js";

export interface OrchestratorControl {
	setPaused(paused: boolean): void;
}

export class PauseHandler {
	private paused = false;
	private pausedAt: Date | null = null;

	constructor(private orchestrator: OrchestratorControl) {}

	/**
	 * Pause orchestration
	 * - Stop spawning new agents
	 * - Current agents continue to next checkpoint
	 * - Preserve all state
	 */
	async pause(): Promise<InterventionResult> {
		this.paused = true;
		this.pausedAt = new Date();
		this.orchestrator.setPaused(true);

		return {
			success: true,
			type: "pause",
			message: "Orchestration paused",
		};
	}

	/**
	 * Resume orchestration
	 * - Enable spawning new agents
	 * - Continue from paused state
	 */
	async resume(): Promise<InterventionResult> {
		this.paused = false;
		this.pausedAt = null;
		this.orchestrator.setPaused(false);

		return {
			success: true,
			type: "pause",
			message: "Orchestration resumed",
		};
	}

	/**
	 * Check if orchestration is paused
	 */
	isPaused(): boolean {
		return this.paused;
	}

	/**
	 * Get pause duration if paused
	 * @returns milliseconds since pause or null if not paused
	 */
	getPauseDuration(): number | null {
		if (!this.pausedAt) {
			return null;
		}
		return Date.now() - this.pausedAt.getTime();
	}
}
