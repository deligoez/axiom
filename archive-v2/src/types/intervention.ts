/**
 * Types of human interventions available
 */
export type InterventionType =
	| "pause"
	| "stop_agent"
	| "redirect_agent"
	| "edit_task"
	| "kill_all"
	| "rollback"
	| "block_task"
	| "approve_merge";

/**
 * Current intervention state
 */
export interface InterventionState {
	paused: boolean;
	pausedAt: Date | null;
	pendingInterventions: Intervention[];
}

/**
 * An intervention request
 */
export interface Intervention {
	type: InterventionType;
	targetAgentId?: string;
	targetTaskId?: string;
	timestamp: Date;
	reason?: string;
}

/**
 * Result of executing an intervention
 */
export interface InterventionResult {
	success: boolean;
	type: InterventionType;
	message: string;
	affectedAgents?: string[];
	affectedTasks?: string[];
}
