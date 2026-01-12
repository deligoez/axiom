import type { EventEmitter } from "node:events";
import type {
	AgentType,
	AgentTypeConfig,
	ChorusConfig,
} from "../types/config.js";
import type {
	AssignmentResult,
	CanAssignResult,
	TaskAssignment,
} from "../types/orchestration.js";
import type { TaskProvider, TaskProviderTask } from "../types/task-provider.js";
import type { AgentSpawner } from "./AgentSpawner.js";
import type { PromptBuilder, PromptContext } from "./PromptBuilder.js";
import type { WorktreeService } from "./WorktreeService.js";

export interface OrchestratorDeps {
	projectDir: string;
	config: ChorusConfig;
	worktreeService: WorktreeService;
	taskProvider: TaskProvider;
	promptBuilder: PromptBuilder;
	agentSpawner: AgentSpawner;
	eventEmitter: EventEmitter;
}

interface ActiveAgent {
	agentId: string;
	taskId: string;
	worktree: string;
	pid: number;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class Orchestrator {
	private activeAgents: Map<string, ActiveAgent> = new Map();
	private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();

	constructor(private deps: OrchestratorDeps) {}

	async assignTask(assignment: TaskAssignment): Promise<AssignmentResult> {
		const { taskId, modelOverride: _modelOverride } = assignment;

		// Get task
		const task = await this.deps.taskProvider.getTask(taskId);
		if (!task) {
			return { success: false, error: `Task not found: ${taskId}` };
		}

		// Check if already assigned
		if (task.status === "in_progress") {
			return { success: false, error: `Task already assigned: ${taskId}` };
		}

		// Get agent type
		const agentType = await this.getAgentType(taskId);
		const agentId = `${agentType}-${taskId}`;

		// Create worktree
		const worktreeInfo = await this.deps.worktreeService.create(
			agentType,
			taskId,
		);

		// Claim task
		await this.deps.taskProvider.claimTask(taskId, agentId);

		// Build prompt
		const promptContext: PromptContext = {
			task: {
				id: task.id,
				title: task.title,
				description: task.description,
				status: task.status as "open",
				priority: task.priority as 0 | 1 | 2 | 3 | 4,
				type: "task",
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
			},
			branch: worktreeInfo.branch,
			taskId,
			config: this.deps.config,
			projectDir: this.deps.projectDir,
		};
		const prompt = await this.deps.promptBuilder.build(promptContext);

		// Spawn agent
		const agentProcess = await this.deps.agentSpawner.spawn({
			prompt,
			cwd: worktreeInfo.path,
		});

		// Track active agent
		const activeAgent: ActiveAgent = {
			agentId,
			taskId,
			worktree: worktreeInfo.path,
			pid: agentProcess.pid,
		};
		this.activeAgents.set(agentId, activeAgent);

		// Start timeout timer
		this.startTimeout(agentId, taskId);

		// Emit event
		this.deps.eventEmitter.emit("assigned", {
			taskId,
			agentId,
			worktree: worktreeInfo.path,
		});

		return {
			success: true,
			taskId,
			agentId,
			worktree: worktreeInfo.path,
		};
	}

	async canAssign(taskId: string): Promise<CanAssignResult> {
		// Get task
		const task = await this.deps.taskProvider.getTask(taskId);
		if (!task) {
			return { can: false, reason: "Task not found" };
		}

		// Check status
		if (task.status === "in_progress") {
			return { can: false, reason: "Task is in_progress" };
		}
		if (task.status === "closed") {
			return { can: false, reason: "Task is closed" };
		}

		// Check max agents
		const maxParallel = this.deps.config.agents.maxParallel;
		if (this.activeAgents.size >= maxParallel) {
			return { can: false, reason: "Max parallel agents reached" };
		}

		// Check dependencies
		if (task.dependencies && task.dependencies.length > 0) {
			const readyTasks = await this.deps.taskProvider.getReadyTasks({
				excludeLabels: ["deferred"],
			});
			const isReady = readyTasks.some((t) => t.id === taskId);
			if (!isReady) {
				return { can: false, reason: "Task has unmet dependencies" };
			}
		}

		return { can: true };
	}

	async getAgentType(taskId: string): Promise<AgentType> {
		const task = await this.deps.taskProvider.getTask(taskId);
		if (task?.custom?.agent) {
			return task.custom.agent as AgentType;
		}
		return this.deps.config.agents.default;
	}

	async getTask(taskId: string): Promise<TaskProviderTask | null> {
		return this.deps.taskProvider.getTask(taskId);
	}

	async getReadyTasks(): Promise<TaskProviderTask[]> {
		return this.deps.taskProvider.getReadyTasks({
			excludeLabels: ["deferred"],
		});
	}

	getAgentConfig(agentType: AgentType): AgentTypeConfig | undefined {
		return this.deps.config.agents.available[agentType];
	}

	getActiveAgentCount(): number {
		return this.activeAgents.size;
	}

	// Timeout management
	startTimeout(agentId: string, taskId: string): void {
		const timeoutMs =
			this.deps.config.completion?.taskTimeout ?? DEFAULT_TIMEOUT_MS;

		const timer = setTimeout(() => {
			void this.handleTimeout(agentId, taskId);
		}, timeoutMs);

		this.timeoutTimers.set(agentId, timer);
	}

	clearTimeout(agentId: string): void {
		const timer = this.timeoutTimers.get(agentId);
		if (timer) {
			clearTimeout(timer);
			this.timeoutTimers.delete(agentId);
		}
	}

	async handleTimeout(agentId: string, taskId: string): Promise<void> {
		// Clear the timer
		this.timeoutTimers.delete(agentId);

		// Kill the agent process
		const agent = this.activeAgents.get(agentId);
		if (agent) {
			await this.deps.agentSpawner.kill(agent.pid);
			this.activeAgents.delete(agentId);
		}

		// Release the task back to pending
		await this.deps.taskProvider.releaseTask(taskId);

		// Emit timeout event
		this.deps.eventEmitter.emit("timeout", { agentId, taskId });
	}
}
