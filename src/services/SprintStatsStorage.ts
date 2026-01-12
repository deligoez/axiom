import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SprintStats } from "../types/sprint.js";

/**
 * Stores and retrieves sprint statistics from .chorus/sprints/
 */
export class SprintStatsStorage {
	readonly sprintsDir: string;

	constructor(repoPath = ".") {
		this.sprintsDir = path.join(repoPath, ".chorus", "sprints");
	}

	/**
	 * Save sprint statistics to .chorus/sprints/{id}.json
	 */
	async saveSprintStats(stats: SprintStats): Promise<void> {
		await this.ensureDirectoryExists();

		const filePath = this.getFilePath(stats.id);
		const content = JSON.stringify(stats, null, 2);
		await fs.writeFile(filePath, content, "utf-8");
	}

	/**
	 * Load sprint statistics by ID
	 * Returns null if file doesn't exist
	 */
	async loadSprintStats(sprintId: string): Promise<SprintStats | null> {
		const filePath = this.getFilePath(sprintId);

		try {
			const content = await fs.readFile(filePath, "utf-8");
			return JSON.parse(content) as SprintStats;
		} catch {
			// File doesn't exist or JSON parse error
			return null;
		}
	}

	/**
	 * List all sprint statistics sorted by date (most recent first)
	 */
	async listSprintStats(): Promise<SprintStats[]> {
		try {
			const files = await fs.readdir(this.sprintsDir);
			const jsonFiles = files.filter((f) => f.endsWith(".json"));

			const sprints: SprintStats[] = [];
			for (const file of jsonFiles) {
				const content = await fs.readFile(
					path.join(this.sprintsDir, file),
					"utf-8",
				);
				sprints.push(JSON.parse(content) as SprintStats);
			}

			// Sort by startedAt date (most recent first)
			sprints.sort((a, b) => {
				const dateA = new Date(a.startedAt).getTime();
				const dateB = new Date(b.startedAt).getTime();
				return dateB - dateA;
			});

			return sprints;
		} catch {
			// Directory doesn't exist
			return [];
		}
	}

	/**
	 * Get the file path for a sprint's stats
	 */
	private getFilePath(sprintId: string): string {
		return path.join(this.sprintsDir, `${sprintId}.json`);
	}

	/**
	 * Ensure the sprints directory exists
	 */
	private async ensureDirectoryExists(): Promise<void> {
		await fs.mkdir(this.sprintsDir, { recursive: true });
	}
}
