import type { InterventionResult } from "../types/intervention.js";

interface StopResult {
	success: boolean;
	message: string;
}

interface AgentSlot {
	agentId: string;
	taskId: string;
	pid: number;
	worktreePath: string;
}

export interface AgentStopper {
	stopAgent(agentId: string): Promise<StopResult>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

export interface Orchestrator {
	spawnAgentForTask(agentId: string, taskId: string): Promise<void>;
}

export class TaskEditor {
	constructor(
		private agentStopper: AgentStopper,
		private orchestrator: Orchestrator,
	) {}

	/**
	 * Notify that a task was edited externally
	 * - Check if agent running via agentStopper.getAgentForTask()
	 * - If agent running, stop and restart with new prompt
	 * - If no agent, just return success
	 */
	async notifyTaskEdited(taskId: string): Promise<InterventionResult> {
		const agent = this.agentStopper.getAgentForTask(taskId);

		if (!agent) {
			return {
				success: true,
				type: "edit_task",
				message: `Task ${taskId} edited - no agent running`,
				affectedAgents: [],
				affectedTasks: [taskId],
			};
		}

		// Stop the agent
		await this.agentStopper.stopAgent(agent.agentId);

		// Restart the agent with the updated prompt
		await this.orchestrator.spawnAgentForTask(agent.agentId, taskId);

		return {
			success: true,
			type: "edit_task",
			message: `Task ${taskId} edited - restarted agent ${agent.agentId}`,
			affectedAgents: [agent.agentId],
			affectedTasks: [taskId],
		};
	}

	/**
	 * Check if an agent is working on a task
	 */
	hasAgentForTask(taskId: string): boolean {
		return this.agentStopper.getAgentForTask(taskId) !== null;
	}

	/**
	 * Get the agent ID working on a task (or null)
	 */
	getAgentIdForTask(taskId: string): string | null {
		const agent = this.agentStopper.getAgentForTask(taskId);
		return agent ? agent.agentId : null;
	}
}
