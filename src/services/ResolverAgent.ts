import { EventEmitter } from "node:events";
import type { AgentSpawner } from "./AgentSpawner.js";
import type { ConflictType } from "./ConflictClassifier.js";

export interface ConflictAnalysis {
	files: string[];
	type: ConflictType;
	description: string;
	cwd: string;
}

export interface ResolverConfig {
	maxAttempts: number;
	qualityCommands: string[];
}

export interface QualityRunner {
	run: () => Promise<{ success: boolean }>;
}

export interface FileReader {
	read: (path: string) => Promise<string>;
}

export interface ResolveResult {
	success: boolean;
	resolved?: boolean;
	needsHuman?: boolean;
	error?: string;
}

const CONFLICT_MARKERS = ["<<<<<<<", "=======", ">>>>>>>"];

export class ResolverAgent extends EventEmitter {
	private currentPid: number | null = null;
	private cancelled = false;

	constructor(
		private spawner: AgentSpawner,
		private config: ResolverConfig,
		private qualityRunner: QualityRunner,
		private fileReader: FileReader,
	) {
		super();
	}

	async resolve(conflict: ConflictAnalysis): Promise<ResolveResult> {
		this.cancelled = false;
		let attempts = 0;

		while (attempts < this.config.maxAttempts) {
			attempts++;

			if (this.cancelled) {
				return { success: false, error: "Cancelled" };
			}

			this.emit("resolving", { attempt: attempts, conflict });

			try {
				const prompt = this.buildPrompt(conflict);
				const process = await this.spawner.spawn({
					prompt,
					cwd: conflict.cwd,
				});

				this.currentPid = process.pid;
				const exitCode = await process.exitCode;

				if (this.cancelled) {
					return { success: false, error: "Cancelled" };
				}

				if (exitCode !== 0) {
					continue; // Try again
				}

				// Verify all files are resolved
				let allResolved = true;
				for (const file of conflict.files) {
					const isResolved = await this.verifyResolution(file);
					if (!isResolved) {
						allResolved = false;
						break;
					}
				}

				if (!allResolved) {
					continue; // Try again
				}

				// Run quality commands
				const qualityResult = await this.qualityRunner.run();
				if (!qualityResult.success) {
					// Quality commands failed after resolution
					this.emit("failed", { reason: "quality_failed", conflict });
					return { success: false, needsHuman: true };
				}

				this.emit("resolved", { conflict });
				return { success: true, resolved: true };
			} catch (error) {
				const err = error as Error;
				if (attempts >= this.config.maxAttempts) {
					this.emit("failed", { reason: "max_attempts", error: err.message });
					return { success: false, needsHuman: true, error: err.message };
				}
			}
		}

		this.emit("failed", { reason: "max_attempts", conflict });
		return { success: false, needsHuman: true };
	}

	buildPrompt(conflict: ConflictAnalysis): string {
		const lines: string[] = [
			"You are resolving a merge conflict.",
			"",
			"## Conflict Analysis",
			conflict.description,
			"",
			"## Conflicting Files",
		];

		for (const file of conflict.files) {
			lines.push(`- ${file}`);
		}

		lines.push("");
		lines.push("## Instructions");
		lines.push("1. Examine each conflicting file");
		lines.push("2. Understand both versions of the changes");
		lines.push("3. Merge the changes semantically");
		lines.push("4. Remove all conflict markers");
		lines.push("5. Ensure the code compiles and tests pass");

		return lines.join("\n");
	}

	async verifyResolution(filePath: string): Promise<boolean> {
		try {
			const content = await this.fileReader.read(filePath);
			for (const marker of CONFLICT_MARKERS) {
				if (content.includes(marker)) {
					return false;
				}
			}
			return true;
		} catch {
			return false;
		}
	}

	async runQualityCommands(): Promise<{ success: boolean }> {
		return this.qualityRunner.run();
	}

	cancel(): void {
		this.cancelled = true;
		if (this.currentPid) {
			this.spawner.kill(this.currentPid);
			this.currentPid = null;
		}
	}
}
