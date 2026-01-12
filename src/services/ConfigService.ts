import * as fs from "node:fs";
import * as path from "node:path";
import { type ChorusConfig, getDefaultConfig } from "../types/config.js";

export class ConfigService {
	private configPath: string;
	private config: ChorusConfig | null = null;

	constructor(projectDir: string) {
		this.configPath = path.join(projectDir, ".chorus", "config.json");
	}

	load(): ChorusConfig {
		if (!fs.existsSync(this.configPath)) {
			this.config = getDefaultConfig();
			return this.config;
		}

		const raw = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));

		// Migrate legacy testCommand to qualityCommands
		if (raw.project?.testCommand && !raw.qualityCommands) {
			raw.qualityCommands = [
				{
					name: "test",
					command: raw.project.testCommand,
					required: true,
					order: 0,
				},
			];
			delete raw.project.testCommand;
		}

		this.config = raw as ChorusConfig;
		return this.config;
	}

	get(): ChorusConfig {
		if (this.config === null) {
			return this.load();
		}
		return this.config;
	}

	exists(): boolean {
		return fs.existsSync(this.configPath);
	}

	save(config: ChorusConfig): void {
		const dir = path.dirname(this.configPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
		this.config = config;
	}

	update(partial: Partial<ChorusConfig>): void {
		const current = this.get();
		const merged = { ...current, ...partial };
		this.save(merged);
	}

	validate(config: unknown): config is ChorusConfig {
		if (!config || typeof config !== "object") return false;

		const c = config as Record<string, unknown>;

		// Check version
		if (!c.version || typeof c.version !== "string") return false;

		// Check mode
		if (c.mode !== "semi-auto" && c.mode !== "autopilot") return false;

		// Check agents
		if (!c.agents || typeof c.agents !== "object") return false;
		const agents = c.agents as Record<string, unknown>;
		if (!["claude", "codex", "opencode"].includes(agents.default as string))
			return false;

		// Check project.taskIdPrefix
		if (!c.project || typeof c.project !== "object") return false;
		const project = c.project as Record<string, unknown>;
		if (!project.taskIdPrefix) return false;

		// Check qualityCommands
		if (!Array.isArray(c.qualityCommands)) return false;
		for (const cmd of c.qualityCommands as unknown[]) {
			if (!cmd || typeof cmd !== "object") return false;
			const qc = cmd as Record<string, unknown>;
			if (!qc.name || !qc.command) return false;
		}

		// Check review config (optional for backwards compatibility)
		if (c.review !== undefined) {
			if (typeof c.review !== "object" || c.review === null) return false;
			const review = c.review as Record<string, unknown>;

			// Validate defaultMode
			const validModes = ["per-task", "batch", "auto-approve", "skip"];
			if (
				review.defaultMode &&
				!validModes.includes(review.defaultMode as string)
			)
				return false;

			// Validate autoApprove
			if (review.autoApprove !== undefined) {
				if (
					typeof review.autoApprove !== "object" ||
					review.autoApprove === null
				)
					return false;
			}

			// Validate labelRules
			if (review.labelRules !== undefined && !Array.isArray(review.labelRules))
				return false;
		}

		return true;
	}
}
