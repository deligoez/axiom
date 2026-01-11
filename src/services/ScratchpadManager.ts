import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Scratchpad } from "../types/learning.js";

export class ScratchpadManager {
	private worktreePath: string;

	constructor(worktreePath: string) {
		this.worktreePath = worktreePath;
	}

	get scratchpadPath(): string {
		return path.join(this.worktreePath, ".agent", "scratchpad.md");
	}

	async read(): Promise<Scratchpad | null> {
		try {
			const content = await fs.readFile(this.scratchpadPath, "utf-8");
			const stats = await fs.stat(this.scratchpadPath);

			return {
				content,
				path: this.scratchpadPath,
				modifiedAt: stats.mtime,
			};
		} catch (error: unknown) {
			const err = error as { code?: string };
			if (err.code === "ENOENT") {
				return null;
			}
			throw error;
		}
	}

	extractLearningsSection(content: string): string | null {
		// Case-insensitive match for "## Learnings" heading
		const headingRegex = /^## learnings\s*$/im;
		const match = headingRegex.exec(content);

		if (!match) {
			return null;
		}

		// Find the start of content after the heading
		const startIndex = match.index + match[0].length;
		const afterHeading = content.slice(startIndex);

		// Find the next ## heading or EOF
		const nextHeadingMatch = /^##\s+/m.exec(afterHeading);

		let learningsContent: string;
		if (nextHeadingMatch) {
			learningsContent = afterHeading.slice(0, nextHeadingMatch.index);
		} else {
			learningsContent = afterHeading;
		}

		// Trim leading/trailing whitespace and return
		return learningsContent.trim() || null;
	}

	async clear(): Promise<void> {
		try {
			await fs.unlink(this.scratchpadPath);
		} catch (error: unknown) {
			const err = error as { code?: string };
			if (err.code === "ENOENT") {
				// File doesn't exist - that's fine
				return;
			}
			throw error;
		}
	}

	async exists(): Promise<boolean> {
		try {
			await fs.access(this.scratchpadPath);
			return true;
		} catch {
			return false;
		}
	}
}
