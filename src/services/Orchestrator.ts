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
import type { AgentSpawner } from "./AgentSpawner.js";
import type { BeadsCLI, Task } from "./BeadsCLI.js";
import type { PromptBuilder, PromptContext } from "./PromptBuilder.js";
import type { WorktreeService } from "./WorktreeService.js";

export interface OrchestratorDeps {
	projectDir: string;
	config: ChorusConfig;
	worktreeService: WorktreeService;
	beadsCLI: BeadsCLI;
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

export class Orchestrator {
	private activeAgents: Map<string, ActiveAgent> = new Map();

	constructor(private deps: OrchestratorDeps) {}

	async assignTask(assignment: TaskAssignment): Promise<AssignmentResult> {
		const { taskId, modelOverride: _modelOverride } = assignment;

		// Get task
		const task = await this.deps.beadsCLI.getTask(taskId);
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
		await this.deps.beadsCLI.claimTask(taskId, agentId);

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
		const task = await this.deps.beadsCLI.getTask(taskId);
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
			const readyTasks = await this.deps.beadsCLI.getReadyTasks({
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
		const task = await this.deps.beadsCLI.getTask(taskId);
		if (task?.custom?.agent) {
			return task.custom.agent as AgentType;
		}
		return this.deps.config.agents.default;
	}

	async getTask(taskId: string): Promise<Task | null> {
		return this.deps.beadsCLI.getTask(taskId);
	}

	async getReadyTasks(): Promise<Task[]> {
		return this.deps.beadsCLI.getReadyTasks({ excludeLabels: ["deferred"] });
	}

	getAgentConfig(agentType: AgentType): AgentTypeConfig | undefined {
		return this.deps.config.agents.available[agentType];
	}

	getActiveAgentCount(): number {
		return this.activeAgents.size;
	}
}
