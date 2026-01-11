import type { EventEmitter } from "node:events";
import type { AgentType } from "../types/learning.js";
import type { BeadsCLI } from "./BeadsCLI.js";
import type { CompletionChecker } from "./CompletionChecker.js";
import type { DependencyResolver } from "./DependencyResolver.js";
import type { LearningExtractor } from "./LearningExtractor.js";
import type { LearningStore } from "./LearningStore.js";
import type { ScratchpadManager } from "./ScratchpadManager.js";

export interface CompletionHandlerDeps {
	completionChecker: CompletionChecker;
	beadsCLI: BeadsCLI;
	dependencyResolver: DependencyResolver;
	scratchpadManager: ScratchpadManager;
	learningExtractor: LearningExtractor;
	learningStore: LearningStore;
	eventEmitter: EventEmitter;
}

export interface AgentExitParams {
	taskId: string;
	agentId: string;
	output: string;
	worktreePath: string;
	branch: string;
	agentType: AgentType;
}

export interface TaskCompletionResult {
	taskId: string;
	agentId: string;
	success: boolean;
	iteration?: number;
	reason?: string;
	testOutput?: string;
	unblockedTasks: string[];
}

export class CompletionHandler {
	constructor(private deps: CompletionHandlerDeps) {}

	async handleAgentExit(
		params: AgentExitParams,
	): Promise<TaskCompletionResult> {
		const { taskId, agentId, output, worktreePath } = params;

		// Check if agent completed successfully
		const completionResult = await this.deps.completionChecker.check(
			output,
			worktreePath,
		);

		if (!completionResult.complete) {
			return {
				taskId,
				agentId,
				success: false,
				reason: "Completion check failed",
				testOutput: completionResult.testOutput,
				unblockedTasks: [],
			};
		}

		// Handle successful completion
		return this.handleSuccess(params);
	}

	private async handleSuccess(
		params: AgentExitParams,
	): Promise<TaskCompletionResult> {
		const { taskId, agentId, worktreePath, branch, agentType } = params;

		// Extract and store learnings
		await this.extractLearnings(taskId, agentType);

		// Close the task
		await this.deps.beadsCLI.closeTask(taskId, `Completed by ${agentId}`);

		// Emit completed event
		this.deps.eventEmitter.emit("completed", {
			taskId,
			agentId,
		});

		// Emit readyForMerge event
		this.deps.eventEmitter.emit("readyForMerge", {
			taskId,
			branch,
			worktreePath,
		});

		// CASCADE: Check and unblock dependents
		const unblockedTasks = await this.cascadeUnblock(taskId);

		return {
			taskId,
			agentId,
			success: true,
			unblockedTasks,
		};
	}

	private async extractLearnings(
		taskId: string,
		agentType: AgentType,
	): Promise<void> {
		// Read scratchpad
		const scratchpad = await this.deps.scratchpadManager.read();
		if (!scratchpad) {
			return;
		}

		// Extract learnings section
		const learningsSection =
			this.deps.scratchpadManager.extractLearningsSection(scratchpad.content);
		if (!learningsSection) {
			return;
		}

		// Parse learnings
		const learnings = this.deps.learningExtractor.parse(
			learningsSection,
			taskId,
			agentType,
		);
		if (learnings.length === 0) {
			return;
		}

		// Append to store
		await this.deps.learningStore.append(learnings);

		// Commit with attribution
		await this.deps.learningStore.commit(taskId, agentType);

		// Clear scratchpad
		await this.deps.scratchpadManager.clear();
	}

	private async cascadeUnblock(taskId: string): Promise<string[]> {
		// Get all tasks that depend on this one
		const dependents = await this.deps.dependencyResolver.getDependents(taskId);
		if (dependents.length === 0) {
			return [];
		}

		const unblockedTasks: string[] = [];

		// Check each dependent's full dependency satisfaction
		for (const depId of dependents) {
			const status = await this.deps.dependencyResolver.check(depId);
			if (status.satisfied) {
				unblockedTasks.push(depId);
			}
		}

		// Emit tasksUnblocked event if any tasks were unblocked
		if (unblockedTasks.length > 0) {
			this.deps.eventEmitter.emit("tasksUnblocked", {
				taskIds: unblockedTasks,
			});
		}

		return unblockedTasks;
	}
}
