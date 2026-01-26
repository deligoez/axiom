/**
 * Agent Metrics Type Definitions
 *
 * Types for tracking per-agent performance metrics.
 */

/**
 * Task completion statistics.
 */
export interface TaskStats {
	/** Number of tasks completed successfully */
	completed: number;
	/** Number of tasks that failed */
	failed: number;
	/** Success rate (0-1) */
	successRate: number;
}

/**
 * Iteration statistics.
 */
export interface IterationStats {
	/** Total iterations across all tasks */
	total: number;
	/** Average iterations per task */
	avgPerTask: number;
	/** Maximum iterations for a single task */
	maxPerTask: number;
}

/**
 * Timing statistics.
 */
export interface TimingStats {
	/** Average task duration in milliseconds */
	avgDurationMs: number;
	/** Total runtime in milliseconds */
	totalRuntimeMs: number;
}

/**
 * Token usage statistics.
 */
export interface TokenStats {
	/** Total input tokens used */
	input: number;
	/** Total output tokens used */
	output: number;
	/** Estimated cost in dollars */
	estimatedCost: number;
}

/**
 * Error counts by type.
 */
export interface ErrorStats {
	/** Number of timeout errors */
	timeout: number;
	/** Number of crash errors */
	crash: number;
	/** Number of quality check failures */
	qualityFail: number;
}

/**
 * Complete metrics for an agent.
 */
export interface AgentMetrics {
	/** Persona name */
	persona: string;
	/** Last updated timestamp */
	updated: string;
	/** Task completion statistics */
	tasks: TaskStats;
	/** Iteration statistics */
	iterations: IterationStats;
	/** Timing statistics */
	timing: TimingStats;
	/** Token usage statistics */
	tokens: TokenStats;
	/** Error counts by type */
	errors: ErrorStats;
}

/**
 * Create default metrics for a persona.
 */
export function createDefaultMetrics(persona: string): AgentMetrics {
	return {
		persona,
		updated: new Date().toISOString(),
		tasks: {
			completed: 0,
			failed: 0,
			successRate: 0,
		},
		iterations: {
			total: 0,
			avgPerTask: 0,
			maxPerTask: 0,
		},
		timing: {
			avgDurationMs: 0,
			totalRuntimeMs: 0,
		},
		tokens: {
			input: 0,
			output: 0,
			estimatedCost: 0,
		},
		errors: {
			timeout: 0,
			crash: 0,
			qualityFail: 0,
		},
	};
}
