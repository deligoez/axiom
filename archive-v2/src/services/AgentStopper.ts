import type { TaskProvider } from "../types/task-provider.js";

export interface AgentSlot {
	agentId: string;
	taskId: string;
	pid: number;
	worktreePath: string;
}

export interface AgentTracker {
	getAgent(agentId: string): AgentSlot | null;
	getAgentByTask(taskId: string): AgentSlot | null;
	getAllAgents(): AgentSlot[];
	removeAgent(agentId: string): void;
}

export interface ProcessKiller {
	kill(pid: number): void;
}

export interface CommandResult {
	success: boolean;
	output: string;
}

export interface CommandRunner {
	run(command: string, cwd: string): Promise<CommandResult>;
}

export interface StopResult {
	success: boolean;
	message: string;
}

export interface StopAllResult {
	success: boolean;
	affectedAgents: string[];
}

export class AgentStopper {
	constructor(
		private agentTracker: AgentTracker,
		private taskProvider: TaskProvider,
		private processKiller: ProcessKiller,
		private commandRunner: CommandRunner,
	) {}

	/**
	 * Stop an agent by ID - kill process, stash changes, release task
	 */
	async stopAgent(agentId: string): Promise<StopResult> {
		const slot = this.agentTracker.getAgent(agentId);
		if (!slot) {
			return {
				success: false,
				message: `Agent ${agentId} not found`,
			};
		}

		// Kill the process
		this.processKiller.kill(slot.pid);

		// Stash any uncommitted changes
		await this.stashWorktreeChanges(slot.worktreePath);

		// Release the task back to pending
		await this.taskProvider.releaseTask(slot.taskId);

		// Remove agent from tracker
		this.agentTracker.removeAgent(agentId);

		return {
			success: true,
			message: `Agent ${agentId} stopped`,
		};
	}

	/**
	 * Stop agent working on a specific task
	 * @returns null if no agent is working on the task
	 */
	async stopAgentByTask(taskId: string): Promise<StopResult | null> {
		const slot = this.agentTracker.getAgentByTask(taskId);
		if (!slot) {
			return null;
		}

		return this.stopAgent(slot.agentId);
	}

	/**
	 * Get the agent working on a specific task
	 */
	getAgentForTask(taskId: string): AgentSlot | null {
		return this.agentTracker.getAgentByTask(taskId);
	}

	/**
	 * Stop all running agents
	 */
	async stopAll(): Promise<StopAllResult> {
		const agents = this.agentTracker.getAllAgents();
		const affectedAgents: string[] = [];

		for (const agent of agents) {
			await this.stopAgent(agent.agentId);
			affectedAgents.push(agent.agentId);
		}

		return {
			success: true,
			affectedAgents,
		};
	}

	/**
	 * Stash uncommitted changes in a worktree
	 */
	async stashWorktreeChanges(worktreePath: string): Promise<void> {
		await this.commandRunner.run("git stash --include-untracked", worktreePath);
	}
}
