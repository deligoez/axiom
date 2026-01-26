import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FeedbackEntry, TaskFeedback } from "../types/review.js";

/**
 * Stores and retrieves feedback history from .chorus/feedback/
 */
export class FeedbackStorage {
	readonly feedbackDir: string;

	constructor(repoPath = ".") {
		this.feedbackDir = path.join(repoPath, ".chorus", "feedback");
	}

	/**
	 * Save a feedback entry for a task (appends to history)
	 */
	async saveFeedback(taskId: string, entry: FeedbackEntry): Promise<void> {
		await this.ensureDirectoryExists();

		// Load existing feedback or create new
		const existing = await this.loadFeedback(taskId);
		const feedback: TaskFeedback = existing ?? { taskId, history: [] };

		// Append new entry
		feedback.history.push(entry);

		// Write to file
		const filePath = this.getFilePath(taskId);
		const content = JSON.stringify(feedback, null, 2);
		await fs.writeFile(filePath, content, "utf-8");
	}

	/**
	 * Load feedback history for a task
	 * Returns null if file doesn't exist
	 */
	async loadFeedback(taskId: string): Promise<TaskFeedback | null> {
		const filePath = this.getFilePath(taskId);

		try {
			const content = await fs.readFile(filePath, "utf-8");
			return JSON.parse(content) as TaskFeedback;
		} catch {
			// File doesn't exist or JSON parse error
			return null;
		}
	}

	/**
	 * Get the file path for a task's feedback
	 */
	private getFilePath(taskId: string): string {
		return path.join(this.feedbackDir, `${taskId}.json`);
	}

	/**
	 * Ensure the feedback directory exists
	 */
	private async ensureDirectoryExists(): Promise<void> {
		await fs.mkdir(this.feedbackDir, { recursive: true });
	}
}
