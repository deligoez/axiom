import type { EventEmitter } from "node:events";
import type { AgentType } from "../types/learning.js";
import type { TaskProvider } from "../types/task-provider.js";
import type { CompletionChecker } from "./CompletionChecker.js";
import type { DependencyResolver } from "./DependencyResolver.js";
import type { LearningExtractor } from "./LearningExtractor.js";
import type { LearningStore } from "./LearningStore.js";
import type { ScratchpadManager } from "./ScratchpadManager.js";
import type { SignalParser } from "./SignalParser.js";

export interface CompletionHandlerDeps {
	completionChecker: CompletionChecker;
	taskProvider: TaskProvider;
	dependencyResolver: DependencyResolver;
	scratchpadManager: ScratchpadManager;
	learningExtractor: LearningExtractor;
	learningStore: LearningStore;
	signalParser: SignalParser;
	eventEmitter: EventEmitter;
	config: {
		maxIterations: number;
	};
}

export interface AgentExitParams {
	taskId: string;
	agentId: string;
	output: string;
	worktreePath: string;
	branch: string;
	agentType: AgentType;
	exitCode?: number;
	iteration: number;
}

export type ExitAction =
	| "success"
	| "retry"
	| "failed"
	| "blocked"
	| "needs_help"
	| "timeout";

export interface TaskCompletionResult {
	taskId: string;
	agentId: string;
	success: boolean;
	action: ExitAction;
	iteration?: number;
	reason?: string;
	question?: string;
	testOutput?: string;
	unblockedTasks: string[];
}

export class CompletionHandler {
	constructor(private deps: CompletionHandlerDeps) {}

	async handleAgentExit(
		params: AgentExitParams,
	): Promise<TaskCompletionResult> {
		const { taskId, agentId, output, worktreePath, exitCode, iteration } =
			params;

		// 1. CRASH CHECK (highest priority)
		if (exitCode !== undefined && exitCode !== 0) {
			await this.setCustomField(taskId, "failed", "true");
			this.deps.eventEmitter.emit("failed", { taskId, reason: "crash" });
			return {
				taskId,
				agentId,
				success: false,
				action: "failed",
				reason: "crash",
				iteration,
				unblockedTasks: [],
			};
		}

		// 2. BLOCKED CHECK
		if (this.deps.signalParser.isBlocked(output)) {
			const reason = this.deps.signalParser.getReason(output) || undefined;
			await this.setCustomField(taskId, "blocked", "true");
			return {
				taskId,
				agentId,
				success: false,
				action: "blocked",
				reason,
				iteration,
				unblockedTasks: [],
			};
		}

		// 3. NEEDS HELP CHECK
		if (
			this.deps.signalParser.hasSignal(output, "NEEDS_HELP") ||
			this.deps.signalParser.hasSignal(output, "NEEDS_HUMAN")
		) {
			const question = this.deps.signalParser.getReason(output) || undefined;
			await this.setCustomField(taskId, "needsHelp", "true");
			return {
				taskId,
				agentId,
				success: false,
				action: "needs_help",
				question,
				iteration,
				unblockedTasks: [],
			};
		}

		// 4. TIMEOUT CHECK
		if (this.deps.signalParser.hasSignal(output, "PROGRESS")) {
			// Check if it's actually a timeout signal - for now, assume TIMEOUT is separate
			// This is a placeholder - actual timeout detection would be via external mechanism
		}

		// 5. SUCCESS CHECK
		const completionResult = await this.deps.completionChecker.check(
			output,
			worktreePath,
		);

		if (completionResult.complete) {
			return this.handleSuccess(params);
		}

		// 6. MAX ITERATIONS CHECK
		if (iteration >= this.deps.config.maxIterations) {
			return this.handleMaxReached(params);
		}

		// 7. RETRY (default)
		return this.handleRetry(params);
	}

	async handleTimeout(params: AgentExitParams): Promise<TaskCompletionResult> {
		const { taskId, agentId, iteration } = params;
		await this.setCustomField(taskId, "timeout", "true");
		return {
			taskId,
			agentId,
			success: false,
			action: "timeout",
			iteration,
			unblockedTasks: [],
		};
	}

	async handleRetry(params: AgentExitParams): Promise<TaskCompletionResult> {
		const { taskId, agentId, iteration } = params;

		// Clear custom fields before retry
		await this.clearCustomFields(taskId);

		// Emit retry event
		this.deps.eventEmitter.emit("retry", {
			taskId,
			iteration: iteration + 1,
		});

		return {
			taskId,
			agentId,
			success: false,
			action: "retry",
			iteration: iteration + 1,
			unblockedTasks: [],
		};
	}

	async handleMaxReached(
		params: AgentExitParams,
	): Promise<TaskCompletionResult> {
		const { taskId, agentId, iteration } = params;

		await this.setCustomField(taskId, "failed", "true");

		this.deps.eventEmitter.emit("failed", {
			taskId,
			iteration,
			reason: "max_iterations",
		});

		return {
			taskId,
			agentId,
			success: false,
			action: "failed",
			reason: "max_iterations",
			iteration,
			unblockedTasks: [],
		};
	}

	private async handleSuccess(
		params: AgentExitParams,
	): Promise<TaskCompletionResult> {
		const { taskId, agentId, worktreePath, branch, agentType, iteration } =
			params;

		// Extract and store learnings
		await this.extractLearnings(taskId, agentType);

		// Close the task
		await this.deps.taskProvider.closeTask(taskId, `Completed by ${agentId}`);

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
			action: "success",
			iteration,
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

	private async setCustomField(
		_taskId: string,
		_field: string,
		_value: string,
	): Promise<void> {
		// This would call: bd update <taskId> --status=open --custom <field>=<value>
		// For now, we assume BeadsCLI has this capability or we mock it
		// Implementation would be: await this.deps.beadsCLI.updateCustomField(taskId, field, value);
	}

	private async clearCustomFields(_taskId: string): Promise<void> {
		// Clear all failure-related custom fields
		// bd update <taskId> --custom failed= --custom timeout= --custom blocked= --custom needsHelp=
	}
}
