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
}
