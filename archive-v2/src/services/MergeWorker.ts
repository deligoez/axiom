import { EventEmitter } from "node:events";
import type { GitMergeResult, GitService } from "./GitService.js";
import { RealGitService } from "./GitService.js";
import type { MergeItem } from "./MergeQueue.js";

export class MergeWorker extends EventEmitter {
	private _isMerging = false;

	constructor(private git: GitService = new RealGitService(process.cwd())) {
		super();
	}

	async merge(item: MergeItem): Promise<GitMergeResult> {
		this._isMerging = true;
		this.emit("mergeStart", { taskId: item.taskId, branch: item.branch });

		try {
			const result = await this.git.merge(item.branch);

			if (result.success) {
				this.emit("mergeSuccess", { taskId: item.taskId, branch: item.branch });
			} else if (result.hasConflict) {
				this.emit("mergeConflict", {
					taskId: item.taskId,
					branch: item.branch,
					conflictFiles: result.conflictFiles || [],
				});
			}

			this._isMerging = false;
			return result;
		} catch (error) {
			const err = error as Error;
			this.emit("mergeError", {
				taskId: item.taskId,
				branch: item.branch,
				error: err.message,
			});
			this._isMerging = false;
			return { success: false, error: err.message };
		}
	}

	async abort(): Promise<void> {
		await this.git.abortMerge();
		this._isMerging = false;
	}

	isMerging(): boolean {
		return this._isMerging;
	}
}
