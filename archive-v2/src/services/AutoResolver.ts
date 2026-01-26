import type { ConflictType } from "./ConflictClassifier.js";
import type { FileService } from "./FileService.js";
import { RealFileService } from "./FileService.js";
import type { ProcessRunner } from "./ProcessRunner.js";
import { RealProcessRunner } from "./ProcessRunner.js";

export interface ResolveResult {
	success: boolean;
	error?: string;
}

// Files that can be auto-resolved
const SIMPLE_FILES: Record<string, string> = {
	".chorus/tasks.jsonl": "tasks-merge",
	"package-lock.json": "regenerate",
	"yarn.lock": "regenerate-yarn",
	"pnpm-lock.yaml": "regenerate-pnpm",
	".agent/learnings.md": "append-dedup",
	".chorus/learnings.md": "append-dedup",
};

// Auto-generated files with their regeneration commands
const AUTO_GENERATED: Record<string, string> = {
	"src/generated/types.ts": "npm run generate:types",
	"docs/api.md": "npm run docs:generate",
};

export class AutoResolver {
	constructor(
		private files: FileService = new RealFileService(),
		private process: ProcessRunner = new RealProcessRunner(),
	) {}

	canResolve(type: ConflictType, filepath?: string): boolean {
		if (type === "SIMPLE") {
			return true;
		}

		// Check if filepath is a known SIMPLE file
		if (filepath && (SIMPLE_FILES[filepath] || AUTO_GENERATED[filepath])) {
			return true;
		}

		return false;
	}

	async resolve(filepath: string, type: ConflictType): Promise<ResolveResult> {
		if (!this.canResolve(type, filepath)) {
			return { success: false };
		}

		try {
			await this.resolveSpecialFile(filepath);
			return { success: true };
		} catch (error) {
			const err = error as Error;
			return { success: false, error: err.message };
		}
	}

	async resolveSpecialFile(filepath: string): Promise<void> {
		const strategy = SIMPLE_FILES[filepath];

		if (strategy === "tasks-merge") {
			await this.resolveTasksMerge(filepath);
		} else if (strategy === "regenerate") {
			await this.resolveRegenerate(filepath, "npm install");
		} else if (strategy === "regenerate-yarn") {
			await this.resolveRegenerate(filepath, "yarn install");
		} else if (strategy === "regenerate-pnpm") {
			await this.resolveRegenerate(filepath, "pnpm install");
		} else if (strategy === "append-dedup") {
			await this.resolveAppendDedup(filepath);
		} else if (AUTO_GENERATED[filepath]) {
			await this.resolveRegenerate(filepath, AUTO_GENERATED[filepath]);
		}
	}

	private async resolveTasksMerge(filepath: string): Promise<void> {
		const content = await this.files.read(filepath);
		const lines = this.parseConflictBothSides(content);

		// Parse JSONL lines and dedupe by id
		const seen = new Set<string>();
		const deduped: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			try {
				const obj = JSON.parse(trimmed) as { id?: string };
				if (obj.id && !seen.has(obj.id)) {
					seen.add(obj.id);
					deduped.push(trimmed);
				} else if (!obj.id) {
					deduped.push(trimmed);
				}
			} catch {
				// Not valid JSON, keep as is
				deduped.push(trimmed);
			}
		}

		await this.files.write(filepath, `${deduped.join("\n")}\n`);
	}

	private async resolveRegenerate(
		filepath: string,
		command: string,
	): Promise<void> {
		await this.files.delete(filepath);
		await this.process.exec(command);
	}

	private async resolveAppendDedup(filepath: string): Promise<void> {
		const content = await this.files.read(filepath);
		const sections = this.parseConflictBothSides(content);

		// Parse markdown sections and dedupe by heading
		const seen = new Set<string>();
		const deduped: string[] = [];
		let currentSection: string[] = [];
		let currentHeading = "";

		for (const line of sections) {
			if (line.startsWith("## ")) {
				// Save previous section if exists
				if (currentHeading && !seen.has(currentHeading)) {
					seen.add(currentHeading);
					deduped.push(...currentSection);
				}
				currentHeading = line;
				currentSection = [line];
			} else {
				currentSection.push(line);
			}
		}

		// Save last section
		if (currentHeading && !seen.has(currentHeading)) {
			seen.add(currentHeading);
			deduped.push(...currentSection);
		}

		await this.files.write(filepath, deduped.join("\n"));
	}

	private parseConflictBothSides(content: string): string[] {
		const lines: string[] = [];
		const contentLines = content.split("\n");

		let inOurs = false;
		let inTheirs = false;

		for (const line of contentLines) {
			if (line.startsWith("<<<<<<<")) {
				inOurs = true;
				continue;
			}
			if (line.startsWith("=======")) {
				inOurs = false;
				inTheirs = true;
				continue;
			}
			if (line.startsWith(">>>>>>>")) {
				inTheirs = false;
				continue;
			}

			if (inOurs || inTheirs) {
				lines.push(line);
			} else {
				lines.push(line);
			}
		}

		return lines;
	}
}
