import type {
	Checkpoint,
	CheckpointConfig,
	CheckpointType,
} from "../types/rollback.js";

export interface GitResult {
	success: boolean;
	output: string;
}

export interface GitRunner {
	run(command: string): Promise<GitResult>;
}

export class Checkpointer {
	private checkpoints: Checkpoint[] = [];

	constructor(
		private config: CheckpointConfig,
		private gitRunner: GitRunner,
	) {}

	/**
	 * Create a checkpoint tag
	 */
	async create(type: CheckpointType, taskId?: string): Promise<Checkpoint> {
		const tag = this.generateTagName(type, taskId);
		const id = tag;
		const timestamp = new Date();

		// Create git tag
		const result = await this.gitRunner.run(`git tag ${tag}`);
		if (!result.success) {
			throw new Error(`Checkpoint tag already exists: ${tag}`);
		}

		const checkpoint: Checkpoint = {
			id,
			tag,
			timestamp,
			type,
			taskId,
		};

		this.checkpoints.push(checkpoint);
		return checkpoint;
	}

	/**
	 * Restore to a checkpoint (Level 4 rollback)
	 */
	async restore(checkpointId: string): Promise<string[]> {
		// Get commits between checkpoint and HEAD to find affected tasks
		const logResult = await this.gitRunner.run(
			`git log ${checkpointId}..HEAD --oneline`,
		);

		// Extract task IDs from commit messages (format: [ch-xxx])
		const affectedTasks: string[] = [];
		const taskIdRegex = /\[(ch-[a-z0-9]+)\]/g;
		let match = taskIdRegex.exec(logResult.output);
		while (match !== null) {
			if (!affectedTasks.includes(match[1])) {
				affectedTasks.push(match[1]);
			}
			match = taskIdRegex.exec(logResult.output);
		}

		// Reset to checkpoint
		await this.gitRunner.run(`git reset --hard ${checkpointId}`);

		return affectedTasks;
	}

	/**
	 * List all checkpoints
	 */
	async list(): Promise<Checkpoint[]> {
		return [...this.checkpoints];
	}

	/**
	 * Delete old checkpoints (keep last N)
	 */
	async prune(keepCount: number): Promise<number> {
		if (this.checkpoints.length <= keepCount) {
			return 0;
		}

		// Sort by timestamp (oldest first)
		const sorted = [...this.checkpoints].sort(
			(a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
		);

		const toDelete = sorted.slice(0, sorted.length - keepCount);

		// Delete git tags
		for (const cp of toDelete) {
			await this.gitRunner.run(`git tag -d ${cp.tag}`);
		}

		// Remove from internal list
		this.checkpoints = sorted.slice(-keepCount);

		return toDelete.length;
	}

	/**
	 * Check if checkpoint should be created (based on config)
	 */
	shouldCreate(type: CheckpointType): boolean {
		if (!this.config.enabled) {
			return false;
		}

		switch (type) {
			case "autopilot_start":
				return this.config.beforeAutopilot;
			case "pre_merge":
				return this.config.beforeMerge;
			case "periodic":
				return this.config.periodic > 0;
			default:
				return false;
		}
	}

	/**
	 * Generate tag name based on type
	 */
	private generateTagName(type: CheckpointType, taskId?: string): string {
		if (type === "pre_merge" && taskId) {
			return `pre-merge-${taskId}`;
		}

		// For autopilot_start and periodic, use timestamp
		const timestamp = Math.floor(Date.now() / 1000);
		return `chorus-checkpoint-${timestamp}`;
	}
}
