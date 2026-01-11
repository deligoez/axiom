/**
 * Rollback levels from least to most destructive
 */
export type RollbackLevel =
	| "iteration" // Level 1: Undo last N iterations
	| "task" // Level 2: Undo all commits for task
	| "task_chain" // Level 3: Task + dependents
	| "session"; // Level 4: Reset to checkpoint

/**
 * Checkpoint types
 */
export type CheckpointType = "autopilot_start" | "pre_merge" | "periodic";

/**
 * A saved checkpoint for rollback
 */
export interface Checkpoint {
	id: string;
	tag: string;
	timestamp: Date;
	type: CheckpointType;
	taskId?: string;
}

/**
 * Configuration for automatic checkpointing
 */
export interface CheckpointConfig {
	enabled: boolean;
	beforeAutopilot: boolean;
	beforeMerge: boolean;
	periodic: number; // Every N completed tasks (0 = disabled)
}

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
	success: boolean;
	level: RollbackLevel;
	revertedCommits: string[];
	affectedTasks: string[];
	message: string;
}
