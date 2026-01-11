import type { AgentType } from "./config.js";

export interface AssignmentResult {
	success: boolean;
	agentId?: string;
	taskId?: string;
	worktree?: string;
	error?: string;
}

export interface TaskAssignment {
	taskId: string;
	agentType?: AgentType;
	modelOverride?: string;
}

export interface CanAssignResult {
	can: boolean;
	reason?: string;
}
