import type { InterventionResult } from "../types/intervention.js";
import type { TaskProvider } from "../types/task-provider.js";

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
	stopAgentByTask(taskId: string): Promise<StopResult | null>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

export class TaskBlocker {
	constructor(
		private agentStopper: AgentStopper,
		private taskProvider: TaskProvider,
	) {}

	/**
	 * Block a task manually
	 * - If agent running on task, stop it via agentStopper.stopAgentByTask()
	 * - Add "blocked" label via beadsCLI.addLabel(taskId, 'blocked')
	 * - Set task status to "open" if was in_progress
	 * - Record block reason in task notes
	 */
	async blockTask(taskId: string, reason: string): Promise<InterventionResult> {
		const affectedAgents: string[] = [];

		// Check if there's an agent working on this task
		const agent = this.agentStopper.getAgentForTask(taskId);
		if (agent) {
			affectedAgents.push(agent.agentId);
		}

		// Stop any running agent on this task
		await this.agentStopper.stopAgentByTask(taskId);

		// Get task info
		const task = await this.taskProvider.getTask(taskId);

		// Update status to open if was in_progress
		if (task && task.status === "in_progress") {
			await this.taskProvider.updateStatus(taskId, "open");
		}

		// Add blocked label
		await this.taskProvider.addLabel(taskId, "blocked");

		// Record reason in task notes
		await this.taskProvider.addNote(
			taskId,
			`Blocked: ${reason} (${new Date().toISOString()})`,
		);

		return {
			success: true,
			type: "block_task",
			message: `Task ${taskId} blocked: ${reason}`,
			affectedAgents,
			affectedTasks: [taskId],
		};
	}

	/**
	 * Unblock a task
	 * - Remove "blocked" label via beadsCLI.removeLabel(taskId, 'blocked')
	 * - Task remains open, now appears in getReadyTasks()
	 */
	async unblockTask(taskId: string): Promise<InterventionResult> {
		// Remove blocked label
		await this.taskProvider.removeLabel(taskId, "blocked");

		return {
			success: true,
			type: "block_task",
			message: `Task ${taskId} unblocked`,
			affectedTasks: [taskId],
		};
	}

	/**
	 * Check if task is manually blocked
	 * - Checks for "blocked" label in task.labels
	 */
	async isBlocked(taskId: string): Promise<boolean> {
		const task = await this.taskProvider.getTask(taskId);
		if (!task) {
			return false;
		}
		return task.labels.includes("blocked");
	}
}
