/**
 * Agent Metrics Service
 *
 * Tracks and persists per-agent performance metrics.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	type AgentMetrics,
	createDefaultMetrics,
} from "../types/agent-metrics.js";
import type { PersonaName } from "../types/persona.js";

/** Claude pricing: $3/1M input, $15/1M output */
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

/**
 * Service to track and persist per-agent performance metrics.
 */
export class AgentMetricsService {
	private projectDir: string;
	/** In-memory cache of metrics per persona */
	private metricsCache: Map<string, AgentMetrics> = new Map();

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Get the metrics file path for a persona.
	 */
	private getMetricsPath(persona: PersonaName | string): string {
		return join(this.projectDir, ".chorus", "agents", persona, "metrics.json");
	}

	/**
	 * Load metrics for a persona.
	 * Returns default metrics if file doesn't exist.
	 */
	load(persona: PersonaName | string): AgentMetrics {
		// Check cache first
		const cached = this.metricsCache.get(persona);
		if (cached) {
			return cached;
		}

		const metricsPath = this.getMetricsPath(persona);

		if (!existsSync(metricsPath)) {
			const defaults = createDefaultMetrics(persona);
			this.metricsCache.set(persona, defaults);
			return defaults;
		}

		try {
			const content = readFileSync(metricsPath, "utf-8");
			const metrics = JSON.parse(content) as AgentMetrics;
			this.metricsCache.set(persona, metrics);
			return metrics;
		} catch {
			const defaults = createDefaultMetrics(persona);
			this.metricsCache.set(persona, defaults);
			return defaults;
		}
	}

	/**
	 * Get or create metrics for a persona.
	 */
	private getOrCreate(persona: PersonaName | string): AgentMetrics {
		const cached = this.metricsCache.get(persona);
		if (cached) {
			return cached;
		}
		return this.load(persona);
	}

	/**
	 * Record a completed task.
	 */
	recordTaskComplete(
		persona: PersonaName | string,
		durationMs: number,
		iterations: number,
	): void {
		const metrics = this.getOrCreate(persona);

		// Update task stats
		metrics.tasks.completed += 1;
		this.updateSuccessRate(metrics);

		// Update iteration stats
		metrics.iterations.total += iterations;
		const totalTasks = metrics.tasks.completed + metrics.tasks.failed;
		metrics.iterations.avgPerTask = metrics.iterations.total / totalTasks;
		metrics.iterations.maxPerTask = Math.max(
			metrics.iterations.maxPerTask,
			iterations,
		);

		// Update timing stats
		metrics.timing.totalRuntimeMs += durationMs;
		metrics.timing.avgDurationMs =
			metrics.timing.totalRuntimeMs / metrics.tasks.completed;

		// Update timestamp
		metrics.updated = new Date().toISOString();

		this.metricsCache.set(persona, metrics);
	}

	/**
	 * Record a failed task.
	 */
	recordTaskFail(
		persona: PersonaName | string,
		errorType: "timeout" | "crash" | "qualityFail",
	): void {
		const metrics = this.getOrCreate(persona);

		// Update task stats
		metrics.tasks.failed += 1;
		this.updateSuccessRate(metrics);

		// Update error stats
		metrics.errors[errorType] += 1;

		// Update timestamp
		metrics.updated = new Date().toISOString();

		this.metricsCache.set(persona, metrics);
	}

	/**
	 * Record token usage.
	 */
	recordTokens(
		persona: PersonaName | string,
		input: number,
		output: number,
	): void {
		const metrics = this.getOrCreate(persona);

		// Update token stats
		metrics.tokens.input += input;
		metrics.tokens.output += output;

		// Calculate estimated cost
		metrics.tokens.estimatedCost =
			metrics.tokens.input * INPUT_COST_PER_TOKEN +
			metrics.tokens.output * OUTPUT_COST_PER_TOKEN;

		// Update timestamp
		metrics.updated = new Date().toISOString();

		this.metricsCache.set(persona, metrics);
	}

	/**
	 * Persist metrics to disk (atomic write).
	 */
	flush(persona: PersonaName | string): void {
		const metrics = this.metricsCache.get(persona);
		if (!metrics) {
			return;
		}

		const metricsPath = this.getMetricsPath(persona);
		const metricsDir = dirname(metricsPath);

		if (!existsSync(metricsDir)) {
			mkdirSync(metricsDir, { recursive: true });
		}

		// Atomic write: write to temp file then rename
		const tempPath = `${metricsPath}.tmp`;
		writeFileSync(tempPath, JSON.stringify(metrics, null, 2));

		// Rename for atomic update
		const { renameSync } = require("node:fs");
		renameSync(tempPath, metricsPath);
	}

	/**
	 * Update success rate based on current task counts.
	 */
	private updateSuccessRate(metrics: AgentMetrics): void {
		const total = metrics.tasks.completed + metrics.tasks.failed;
		if (total === 0) {
			metrics.tasks.successRate = 0;
		} else {
			metrics.tasks.successRate = metrics.tasks.completed / total;
		}
	}
}
