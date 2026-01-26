import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentLogger } from "./AgentLogger.js";
import type { AgentSpawner } from "./AgentSpawner.js";
import type { ConflictType } from "./ConflictClassifier.js";

/**
 * Patch persona constants for logging.
 */
const PATCH_PERSONA = "patch" as const;
const PATCH_INSTANCE_ID = "patch";

export interface ConflictAnalysis {
	files: string[];
	type: ConflictType;
	description: string;
	cwd: string;
}

export interface ResolverConfig {
	maxAttempts: number;
	qualityCommands: string[];
	projectDir?: string;
	/** Optional AgentLogger for Patch persona logging */
	agentLogger?: AgentLogger;
}

/**
 * Default 5-step conflict resolution procedure
 */
const DEFAULT_RESOLUTION_STEPS = [
	"Examine each conflicting file",
	"Understand both versions of the changes",
	"Merge the changes semantically",
	"Remove all conflict markers",
	"Ensure the code compiles and tests pass",
];

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

	/**
	 * Log a message as Patch persona.
	 */
	private log(level: "info" | "debug", message: string): void {
		if (this.config.agentLogger) {
			this.config.agentLogger.log({
				persona: PATCH_PERSONA,
				instanceId: PATCH_INSTANCE_ID,
				level,
				message,
			});
		}
	}

	/**
	 * Load Patch's prompt from .chorus/agents/patch/prompt.md if it exists.
	 */
	private loadPatchPrompt(): string | undefined {
		if (!this.config.projectDir) {
			return undefined;
		}
		const promptPath = join(
			this.config.projectDir,
			".chorus",
			"agents",
			"patch",
			"prompt.md",
		);
		if (existsSync(promptPath)) {
			return readFileSync(promptPath, "utf-8");
		}
		return undefined;
	}

	async resolve(conflict: ConflictAnalysis): Promise<ResolveResult> {
		this.cancelled = false;
		let attempts = 0;

		// Log Patch persona start
		this.log("info", "[patch] Analyzing merge conflict...");

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
					this.log("info", "[patch] Escalating to human");
					return { success: false, needsHuman: true };
				}

				this.emit("resolved", { conflict });
				this.log("info", "[patch] Conflict resolved");
				return { success: true, resolved: true };
			} catch (error) {
				const err = error as Error;
				if (attempts >= this.config.maxAttempts) {
					this.emit("failed", { reason: "max_attempts", error: err.message });
					this.log("info", "[patch] Escalating to human");
					return { success: false, needsHuman: true, error: err.message };
				}
			}
		}

		this.emit("failed", { reason: "max_attempts", conflict });
		this.log("info", "[patch] Escalating to human");
		return { success: false, needsHuman: true };
	}

	buildPrompt(conflict: ConflictAnalysis): string {
		const lines: string[] = [];

		// Load Patch's custom prompt if available
		const patchPrompt = this.loadPatchPrompt();
		if (patchPrompt) {
			lines.push(patchPrompt);
			lines.push("");
		}

		lines.push("You are resolving a merge conflict.");
		lines.push("");
		lines.push("## Conflict Analysis");
		lines.push(conflict.description);
		lines.push("");
		lines.push("## Conflicting Files");

		for (const file of conflict.files) {
			lines.push(`- ${file}`);
		}

		lines.push("");
		lines.push("## Instructions");

		// Load resolution steps from file or use defaults
		const steps = this.loadResolutionSteps();
		for (let i = 0; i < steps.length; i++) {
			lines.push(`${i + 1}. ${steps[i]}`);
		}

		return lines.join("\n");
	}

	/**
	 * Load conflict resolution steps from .chorus/agents/patch/rules.md
	 * Falls back to default steps if file missing
	 */
	private loadResolutionSteps(): string[] {
		if (!this.config.projectDir) {
			return [...DEFAULT_RESOLUTION_STEPS];
		}

		const rulesPath = join(
			this.config.projectDir,
			".chorus",
			"agents",
			"patch",
			"rules.md",
		);

		if (!existsSync(rulesPath)) {
			return [...DEFAULT_RESOLUTION_STEPS];
		}

		try {
			const content = readFileSync(rulesPath, "utf-8");
			const steps = this.parseResolutionSteps(content);
			return steps.length > 0 ? steps : [...DEFAULT_RESOLUTION_STEPS];
		} catch {
			return [...DEFAULT_RESOLUTION_STEPS];
		}
	}

	/**
	 * Parse resolution steps from rules.md content
	 * Expected format: numbered list (1. Step description)
	 */
	private parseResolutionSteps(content: string): string[] {
		const steps: string[] = [];
		// Match numbered list items: 1. Step text
		const stepRegex = /^\d+\.\s+(.+)$/gm;
		let match = stepRegex.exec(content);

		while (match !== null) {
			steps.push(match[1].trim());
			match = stepRegex.exec(content);
		}

		return steps;
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
