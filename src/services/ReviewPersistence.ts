import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PendingReview } from "../machines/reviewRegion.js";

/**
 * Persisted review state structure
 */
export interface ReviewState {
	pendingReviews: PendingReview[];
	currentIndex: number;
}

/**
 * State file structure (review section within .chorus/state.json)
 */
interface StateFile {
	review?: ReviewState;
}

/**
 * Persists review region state to .chorus/state.json
 */
export class ReviewPersistence {
	readonly statePath: string;

	constructor(repoPath = ".") {
		this.statePath = path.join(repoPath, ".chorus", "state.json");
	}

	/**
	 * Save pending reviews and current index to state file
	 */
	async save(
		pendingReviews: PendingReview[],
		currentIndex: number,
	): Promise<void> {
		// Ensure directory exists
		const dir = path.dirname(this.statePath);
		await fs.mkdir(dir, { recursive: true });

		// Load existing state or create new
		let state: StateFile = {};
		try {
			const content = await fs.readFile(this.statePath, "utf-8");
			state = JSON.parse(content) as StateFile;
		} catch {
			// File doesn't exist or is invalid, start fresh
		}

		// Update review section
		state.review = {
			pendingReviews,
			currentIndex,
		};

		// Write to file
		const content = JSON.stringify(state, null, 2);
		await fs.writeFile(this.statePath, content, "utf-8");
	}

	/**
	 * Load review state from state file
	 * Returns null if file doesn't exist or is corrupt
	 */
	async load(): Promise<ReviewState | null> {
		try {
			const content = await fs.readFile(this.statePath, "utf-8");
			const state = JSON.parse(content) as StateFile;
			return state.review ?? null;
		} catch {
			// File doesn't exist or is corrupt - start fresh
			return null;
		}
	}

	/**
	 * Clear review section from state file (when all reviews completed)
	 */
	async clear(): Promise<void> {
		try {
			const content = await fs.readFile(this.statePath, "utf-8");
			const state = JSON.parse(content) as StateFile;
			delete state.review;

			// Only write back if there's still content
			if (Object.keys(state).length > 0) {
				await fs.writeFile(
					this.statePath,
					JSON.stringify(state, null, 2),
					"utf-8",
				);
			} else {
				// Delete file if empty - file may not exist, that's ok
				await fs
					.unlink(this.statePath)
					.catch((error: NodeJS.ErrnoException) => {
						// Only log unexpected errors (ignore ENOENT - file doesn't exist)
						if (error.code !== "ENOENT" && process.env.DEBUG) {
							console.debug("ReviewPersistence cleanup error:", error.message);
						}
					});
			}
		} catch {
			// File doesn't exist, nothing to clear
		}
	}
}
