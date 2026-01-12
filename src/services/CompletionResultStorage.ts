import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { TaskCompletionResult } from "../types/review.js";

/**
 * Stores and retrieves task completion results from .chorus/completions/
 */
export class CompletionResultStorage {
	readonly completionsDir: string;

	constructor(repoPath = ".") {
		this.completionsDir = path.join(repoPath, ".chorus", "completions");
	}

	/**
	 * Save a task completion result to disk
	 */
	async saveCompletionResult(
		taskId: string,
		result: TaskCompletionResult,
	): Promise<void> {
		await this.ensureDirectoryExists();

		const filePath = this.getFilePath(taskId);
		const content = JSON.stringify(result, null, 2);
		await fs.writeFile(filePath, content, "utf-8");
	}

	/**
	 * Load a task completion result from disk
	 * Returns null if file doesn't exist or JSON is invalid
	 */
	async loadCompletionResult(
		taskId: string,
	): Promise<TaskCompletionResult | null> {
		const filePath = this.getFilePath(taskId);

		try {
			const content = await fs.readFile(filePath, "utf-8");
			return JSON.parse(content) as TaskCompletionResult;
		} catch {
			// File doesn't exist or JSON parse error
			return null;
		}
	}

	/**
	 * Get the file path for a task's completion result
	 */
	private getFilePath(taskId: string): string {
		return path.join(this.completionsDir, `${taskId}.json`);
	}

	/**
	 * Ensure the completions directory exists
	 */
	private async ensureDirectoryExists(): Promise<void> {
		await fs.mkdir(this.completionsDir, { recursive: true });
	}
}
