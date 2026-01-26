/**
 * Sprint target based on task count
 */
export interface TaskCountTarget {
	type: "taskCount";
	count: number;
}

/**
 * Sprint target based on duration
 */
export interface DurationTarget {
	type: "duration";
	minutes: number;
}

/**
 * Sprint target based on end time
 */
export interface UntilTimeTarget {
	type: "untilTime";
	endTime: Date;
}

/**
 * Sprint target until no tasks are ready
 */
export interface NoReadyTarget {
	type: "noReady";
}

/**
 * Sprint target discriminated union - determines when sprint ends
 */
export type SprintTarget =
	| TaskCountTarget
	| DurationTarget
	| UntilTimeTarget
	| NoReadyTarget;

/**
 * Iteration settings for agent work
 */
export interface IterationSettings {
	maxIterations: number;
	timeoutMinutes: number;
}

/**
 * Sprint configuration options
 */
export interface SprintConfig {
	target: SprintTarget;
	iterationSettings: IterationSettings;
	pauseOnStuck: boolean;
	pauseOnErrors: boolean;
}

/**
 * Review decision type for a task
 */
export type ReviewDecision = "approved" | "rejected" | "redo" | "skipped";

/**
 * Statistics for a single task during a sprint
 */
export interface TaskSprintStat {
	taskId: string;
	startedAt: Date;
	completedAt: Date | null;
	iterations: number;
	qualityPassed: boolean;
	reviewDecision: ReviewDecision;
}

/**
 * Sprint result counts
 */
export interface SprintCounts {
	completed: number;
	failed: number;
	skipped: number;
}

/**
 * Statistics for a completed sprint
 */
export interface SprintStats {
	id: string;
	startedAt: Date;
	endedAt: Date | null;
	counts: SprintCounts;
	taskStats: TaskSprintStat[];
	settings: SprintConfig;
}
