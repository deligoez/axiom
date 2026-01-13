/**
 * Agent Data Integration
 *
 * Orchestrates AgentLogService, AgentMetricsService, and AgentLearningsService
 * to provide a unified interface for agent lifecycle events.
 */

import type { PersonaName } from "../types/persona.js";
import { AgentLearningsService } from "./AgentLearningsService.js";
import { AgentLogService } from "./AgentLogService.js";
import { AgentMetricsService } from "./AgentMetricsService.js";

/**
 * Error types for task failures.
 */
export type ErrorType = "timeout" | "crash" | "qualityFail";

/**
 * Options for creating AgentDataIntegration.
 */
export interface AgentDataIntegrationConfig {
	projectDir: string;
}

/**
 * Orchestrates all agent data services for unified lifecycle management.
 */
export class AgentDataIntegration {
	private readonly logService: AgentLogService;
	private readonly metricsService: AgentMetricsService;
	private readonly learningsService: AgentLearningsService;

	/** Track active tasks for proper completion */
	private activeTasks: Map<
		string,
		{ persona: string; taskId: string; startTime: number; iterations: number }
	> = new Map();

	constructor(config: AgentDataIntegrationConfig) {
		this.logService = new AgentLogService(config.projectDir);
		this.metricsService = new AgentMetricsService(config.projectDir);
		this.learningsService = new AgentLearningsService(config.projectDir);
	}

	/**
	 * Called when an agent starts a task.
	 * Logs the start event.
	 */
	onAgentStart(persona: PersonaName | string, taskId: string): void {
		// Log start event
		this.logService.logStart(persona, taskId);

		// Track active task
		const key = this.getTaskKey(persona, taskId);
		this.activeTasks.set(key, {
			persona,
			taskId,
			startTime: Date.now(),
			iterations: 0,
		});
	}

	/**
	 * Called when an agent completes an iteration.
	 * Logs the iteration event.
	 */
	onIteration(
		persona: PersonaName | string,
		taskId: string,
		iteration: number,
		input: string,
		output: string,
	): void {
		// Log iteration
		this.logService.logIteration(persona, taskId, iteration, input, output);

		// Update iteration count
		const key = this.getTaskKey(persona, taskId);
		const task = this.activeTasks.get(key);
		if (task) {
			task.iterations = iteration;
		}
	}

	/**
	 * Called when an agent emits a signal.
	 * Logs the signal event.
	 */
	onSignal(
		persona: PersonaName | string,
		taskId: string,
		type: string,
		payload?: string,
	): void {
		this.logService.logSignal(persona, taskId, type, payload);
	}

	/**
	 * Called when an agent completes a task successfully.
	 * Logs completion, records metrics, and flushes all services.
	 */
	onComplete(persona: PersonaName | string, taskId: string): void {
		const key = this.getTaskKey(persona, taskId);
		const task = this.activeTasks.get(key);

		const durationMs = task ? Date.now() - task.startTime : 0;
		const iterations = task?.iterations ?? 0;

		// Log complete event
		this.logService.logComplete(persona, taskId, durationMs, iterations);

		// Record metrics
		this.metricsService.recordTaskComplete(persona, durationMs, iterations);

		// Flush metrics to disk
		this.metricsService.flush(persona);

		// Clean up active task
		this.activeTasks.delete(key);
	}

	/**
	 * Called when an agent encounters an error.
	 * Logs error, records failure metrics, and flushes all services.
	 */
	onError(
		persona: PersonaName | string,
		taskId: string,
		error: Error,
		errorType: ErrorType = "crash",
	): void {
		// Log error event
		this.logService.logError(persona, taskId, error);

		// Record failure metrics
		this.metricsService.recordTaskFail(persona, errorType);

		// Flush metrics to disk
		this.metricsService.flush(persona);

		// Clean up active task
		const key = this.getTaskKey(persona, taskId);
		this.activeTasks.delete(key);
	}

	/**
	 * Called when a learning is extracted from agent output.
	 * Adds the learning to the learnings service with deduplication.
	 */
	onLearning(
		persona: PersonaName | string,
		category: string,
		learning: string,
	): void {
		this.learningsService.add(persona, category, learning);
	}

	/**
	 * Record token usage for cost tracking.
	 */
	recordTokens(
		persona: PersonaName | string,
		inputTokens: number,
		outputTokens: number,
	): void {
		this.metricsService.recordTokens(persona, inputTokens, outputTokens);
	}

	/**
	 * Get the log service for direct access if needed.
	 */
	getLogService(): AgentLogService {
		return this.logService;
	}

	/**
	 * Get the metrics service for direct access if needed.
	 */
	getMetricsService(): AgentMetricsService {
		return this.metricsService;
	}

	/**
	 * Get the learnings service for direct access if needed.
	 */
	getLearningsService(): AgentLearningsService {
		return this.learningsService;
	}

	/**
	 * Generate a unique key for tracking active tasks.
	 */
	private getTaskKey(persona: string, taskId: string): string {
		return `${persona}:${taskId}`;
	}
}
