import type { InterventionResult } from "../types/intervention.js";
import type { TaskProviderTask } from "../types/task-provider.js";

interface StopResult {
	success: boolean;
	message: string;
}

interface AgentSlot {
	agentId: string;
	taskId: string;
	pid: number;
	worktreePath: string;
	status: "running" | "idle" | "stopped";
}

export interface AgentStopper {
	stopAgent(agentId: string): Promise<StopResult>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

interface RedirectorTask extends TaskProviderTask {
	blockedBy: string[];
}

export interface RedirectorTaskProvider {
	getTask(taskId: string): Promise<RedirectorTask | null>;
	claimTask(taskId: string, assignee: string): Promise<void>;
}

export interface Orchestrator {
	spawnAgentForTask(agentId: string, taskId: string): Promise<void>;
	getAgent(agentId: string): AgentSlot | null;
}

export class AgentRedirector {
	constructor(
		private agentStopper: AgentStopper,
		private taskProvider: RedirectorTaskProvider,
		private orchestrator: Orchestrator,
	) {}

	/**
	 * Redirect agent to new task
	 * - Stop current work via AgentStopper (stash changes, release task)
	 * - Claim new task via TaskProvider.claimTask()
	 * - Restart agent with new task via Orchestrator.spawnAgentForTask()
	 * - REUSES the same agent slot (does NOT spawn fresh agent)
	 */
	async redirect(
		agentId: string,
		newTaskId: string,
	): Promise<InterventionResult> {
		// Get current agent info
		const agent = this.orchestrator.getAgent(agentId);
		if (!agent) {
			return {
				success: false,
				type: "redirect_agent",
				message: `Agent ${agentId} not found`,
			};
		}

		const oldTaskId = agent.taskId;

		// Validate new task is suitable
		const task = await this.taskProvider.getTask(newTaskId);
		if (!task) {
			return {
				success: false,
				type: "redirect_agent",
				message: `Task ${newTaskId} not found`,
			};
		}

		if (task.status !== "open") {
			return {
				success: false,
				type: "redirect_agent",
				message: `Task ${newTaskId} is not open (status: ${task.status})`,
			};
		}

		if (task.blockedBy && task.blockedBy.length > 0) {
			return {
				success: false,
				type: "redirect_agent",
				message: `Task ${newTaskId} is blocked by dependencies`,
			};
		}

		if (task.labels.includes("deferred")) {
			return {
				success: false,
				type: "redirect_agent",
				message: `Task ${newTaskId} is deferred`,
			};
		}

		// Stop current work (stash changes, release task)
		await this.agentStopper.stopAgent(agentId);

		// Claim new task
		await this.taskProvider.claimTask(newTaskId, agentId);

		// Spawn agent for new task (reusing same agent slot)
		await this.orchestrator.spawnAgentForTask(agentId, newTaskId);

		return {
			success: true,
			type: "redirect_agent",
			message: `Redirected agent ${agentId} from ${oldTaskId} to ${newTaskId}`,
			affectedAgents: [agentId],
			affectedTasks: [oldTaskId, newTaskId],
		};
	}

	/**
	 * Validate redirect is possible
	 * Checks:
	 * 1. Agent exists and is running
	 * 2. New task status is "open"
	 * 3. New task has no unsatisfied blocking dependencies
	 * 4. New task does NOT have "deferred" label
	 */
	async canRedirect(agentId: string, newTaskId: string): Promise<boolean> {
		// Check agent exists and is running
		const agent = this.orchestrator.getAgent(agentId);
		if (!agent) {
			return false;
		}

		if (agent.status !== "running") {
			return false;
		}

		// Check task is suitable
		const task = await this.taskProvider.getTask(newTaskId);
		if (!task) {
			return false;
		}

		if (task.status !== "open") {
			return false;
		}

		if (task.labels.includes("deferred")) {
			return false;
		}

		return true;
	}
}
