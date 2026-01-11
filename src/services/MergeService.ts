import type { EventEmitter } from "node:events";
import type { AutoResolver } from "./AutoResolver.js";
import type { ConflictClassifier } from "./ConflictClassifier.js";
import type { HumanEscalation } from "./HumanEscalation.js";
import type { MergeItem, MergeQueue, QueueStats } from "./MergeQueue.js";
import type { MergeWorker } from "./MergeWorker.js";
import type { RebaseRetry } from "./RebaseRetry.js";
import type { ResolverAgent } from "./ResolverAgent.js";
import type { WorktreeService } from "./WorktreeService.js";

export interface MergeServiceDeps {
	mergeQueue: MergeQueue;
	mergeWorker: MergeWorker;
	conflictClassifier: ConflictClassifier;
	autoResolver: AutoResolver;
	rebaseRetry: RebaseRetry;
	resolverAgent: ResolverAgent;
	humanEscalation: HumanEscalation;
	worktreeService: WorktreeService;
	eventEmitter: EventEmitter;
}

type SimpleMergeItem = {
	taskId: string;
	branch: string;
	worktree: string;
	priority: number;
};

export class MergeService {
	private running = false;
	private shouldStop = false;

	constructor(private deps: MergeServiceDeps) {}

	enqueue(item: SimpleMergeItem): void {
		this.deps.mergeQueue.enqueue({
			taskId: item.taskId,
			branch: item.branch,
			worktree: item.worktree,
			priority: item.priority as 0 | 1 | 2 | 3 | 4,
			dependencies: [],
		});
	}

	start(): void {
		this.running = true;
		this.shouldStop = false;
		this.processLoop();
	}

	stop(): void {
		this.shouldStop = true;
	}

	isRunning(): boolean {
		return this.running;
	}

	getQueueStatus(): QueueStats {
		return this.deps.mergeQueue.getStats();
	}

	private async processLoop(): Promise<void> {
		while (!this.shouldStop) {
			const item = this.deps.mergeQueue.dequeue();
			if (!item) {
				// No items ready, check if we should stop
				if (this.shouldStop) break;
				// Wait a bit before checking again
				await this.sleep(10);
				continue;
			}

			await this.processItem(item);

			// Check stop flag after processing
			if (this.shouldStop) break;
		}
		this.running = false;
	}

	private async processItem(item: MergeItem): Promise<void> {
		const result = await this.deps.mergeWorker.merge(item);

		if (result.success) {
			await this.cleanupWorktree(item.worktree, item.taskId);
			this.deps.mergeQueue.markCompleted(item.taskId);
			return;
		}

		if (result.hasConflict && result.conflictFiles) {
			const resolved = await this.handleConflict(item, result.conflictFiles);
			if (resolved) {
				await this.cleanupWorktree(item.worktree, item.taskId);
				this.deps.mergeQueue.markCompleted(item.taskId);
			}
		}
	}

	private async handleConflict(
		item: MergeItem,
		conflictFiles: string[],
	): Promise<boolean> {
		const analysis = this.deps.conflictClassifier.analyze(conflictFiles);
		const type = analysis.overallType;

		// Try resolution based on conflict type
		if (type === "SIMPLE") {
			// Try to resolve each file
			for (const file of conflictFiles) {
				const result = await this.deps.autoResolver.resolve(file, "SIMPLE");
				if (!result.success) return false;
			}
			return true;
		}

		if (type === "MEDIUM") {
			const result = await this.deps.rebaseRetry.rebaseAndRetry("main");
			if (result.ready) return true;
		}

		if (type === "COMPLEX") {
			const result = await this.deps.resolverAgent.resolve({
				files: conflictFiles,
				type: "COMPLEX",
				description: "Complex merge conflict",
				cwd: item.worktree,
			});
			if (result.success) return true;
		}

		// All automated resolution failed - escalate to human
		const escalationResult = await this.deps.humanEscalation.escalate({
			taskId: item.taskId,
			worktreePath: item.worktree,
			conflictFiles,
			retryCount: item.retryCount,
			lastAttempt: type === "MEDIUM" ? "rebase" : "agent",
		});

		return escalationResult.action === "merged";
	}

	private async cleanupWorktree(
		worktreePath: string,
		taskId: string,
	): Promise<void> {
		try {
			// Parse agentType from worktree path: .worktrees/agentType-taskId
			const dirName = worktreePath.split("/").pop() || "";
			const agentType = dirName.replace(`-${taskId}`, "") || "claude";
			await this.deps.worktreeService.remove(agentType, taskId);
		} catch {
			// Log but don't fail the merge
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
