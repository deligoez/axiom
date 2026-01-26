import type {
	AutoApproveSettings,
	FileChange,
	QualityRunResult,
	TaskCompletionResult,
} from "../types/review.js";
import type { Signal } from "../types/signal.js";
import type { TaskProvider } from "../types/task-provider.js";
import { canAutoApprove } from "./AutoApproveEngine.js";
import type { CompletionResultStorage } from "./CompletionResultStorage.js";
import type {
	QualityCommandsManager,
	RunResult,
} from "./QualityCommandsManager.js";

// ============================================================================
// Types
// ============================================================================

export interface GitService {
	getDiffStat(worktreePath: string): Promise<string>;
}

export interface EventEmitter {
	emit(event: string, data: unknown): void;
}

export interface MergeService {
	enqueue(taskId: string, branch: string): Promise<void>;
}

export interface AgentCompletionHandlerDeps {
	qualityManager: QualityCommandsManager;
	storage: CompletionResultStorage;
	gitService: GitService;
	taskProvider: TaskProvider;
	eventEmitter: EventEmitter;
	mergeService: MergeService;
	config: {
		autoApprove: AutoApproveSettings;
	};
}

export interface CompletionParams {
	taskId: string;
	agentId: string;
	iterations: number;
	duration: number;
	signal: Signal | null;
	worktreePath: string;
	branch?: string;
}

export interface CompletionHandlerResult {
	taskId: string;
	autoApproved: boolean;
	completionResult: TaskCompletionResult;
}

// ============================================================================
// Implementation
// ============================================================================

export class AgentCompletionHandler {
	constructor(private deps: AgentCompletionHandlerDeps) {}

	async handleCompletion(
		params: CompletionParams,
	): Promise<CompletionHandlerResult> {
		const {
			taskId,
			agentId,
			iterations,
			duration,
			signal,
			worktreePath,
			branch,
		} = params;

		// 1. Run quality commands
		const qualityResults = await this.deps.qualityManager.runAll();
		const qualityRunResults = this.mapQualityResults(qualityResults);

		// 2. Collect git changes
		const diffStat = await this.deps.gitService.getDiffStat(worktreePath);
		const changes = this.parseGitDiffStat(diffStat);

		// 3. Build TaskCompletionResult
		const completionResult: TaskCompletionResult = {
			taskId,
			agentId,
			iterations,
			duration,
			signal,
			quality: qualityRunResults,
			changes,
		};

		// 4. Save completion result
		await this.deps.storage.saveCompletionResult(taskId, completionResult);

		// 5. Get task labels for review rules
		const taskLabels = await this.deps.taskProvider.getTaskLabels(taskId);

		// 6. Check auto-approve eligibility
		const autoApproved = canAutoApprove(
			completionResult,
			this.deps.config.autoApprove,
			taskLabels,
		);

		// 7. Handle based on auto-approve decision
		if (autoApproved) {
			// Auto-approve: close task and send to merge queue
			await this.deps.taskProvider.closeTask(taskId);
			if (branch) {
				await this.deps.mergeService.enqueue(taskId, branch);
			}
		} else {
			// Not auto-approved: set to reviewing status
			await this.deps.taskProvider.updateStatus(taskId, "reviewing");
		}

		// 8. Emit TASK_COMPLETED event for review region
		this.deps.eventEmitter.emit("TASK_COMPLETED", {
			taskId,
			result: completionResult,
		});

		return {
			taskId,
			autoApproved,
			completionResult,
		};
	}

	/**
	 * Map QualityCommandsManager results to QualityRunResult format
	 */
	private mapQualityResults(results: RunResult[]): QualityRunResult[] {
		return results.map((r) => ({
			name: r.name,
			passed: r.success,
			duration: r.duration,
			error: r.success ? undefined : r.output,
		}));
	}

	/**
	 * Parse git diff --stat output into FileChange array
	 *
	 * Example input:
	 * src/file.ts  | 10 +++++++---
	 * src/new.ts   |  5 +++++
	 * deleted.ts   |  3 ---
	 * 3 files changed, 12 insertions(+), 6 deletions(-)
	 */
	private parseGitDiffStat(diffStat: string): FileChange[] {
		const changes: FileChange[] = [];
		const lines = diffStat.split("\n");

		for (const line of lines) {
			// Skip summary line
			if (line.includes("files changed") || line.includes("file changed")) {
				continue;
			}

			// Match pattern: path | count +++---
			const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]*)/);
			if (!match) {
				continue;
			}

			const path = match[1].trim();
			const additions = (match[3].match(/\+/g) || []).length;
			const deletions = (match[3].match(/-/g) || []).length;

			// Determine change type based on additions/deletions pattern
			let type: "added" | "modified" | "deleted" = "modified";
			if (deletions === 0 && additions > 0) {
				// Might be new file (all additions)
				type = "added";
			} else if (additions === 0 && deletions > 0) {
				// Might be deleted file (all deletions)
				type = "deleted";
			}

			changes.push({
				path,
				type,
				linesAdded: additions,
				linesRemoved: deletions,
			});
		}

		return changes;
	}
}
