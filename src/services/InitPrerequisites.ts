import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ProcessRunner } from "./ProcessRunner.js";

export interface NodeVersionResult {
	valid: boolean;
	version: string | null;
}

export interface MissingPrerequisite {
	name: string;
	instruction: string;
}

export interface PrerequisiteResult {
	gitRepo: boolean;
	nodeVersion: boolean;
	nodeVersionFound: string | null;
	beadsCLI: boolean;
	claudeCLI: boolean;
	missing: MissingPrerequisite[];
	allPassed: boolean;
}

export class InitPrerequisites {
	private static readonly MIN_NODE_VERSION = 20;

	constructor(
		private readonly projectDir: string,
		private readonly processRunner: ProcessRunner,
	) {}

	/**
	 * Check if current directory is a git repository
	 */
	checkGitRepo(): boolean {
		return existsSync(join(this.projectDir, ".git"));
	}

	/**
	 * Check if Node.js is installed and meets minimum version requirement
	 */
	async checkNodeVersion(): Promise<NodeVersionResult> {
		const result = await this.processRunner.exec("node --version");

		if (result.exitCode !== 0) {
			return { valid: false, version: null };
		}

		// Parse version from output like "v22.1.0"
		const version = result.stdout.trim().replace(/^v/, "");
		const majorVersion = Number.parseInt(version.split(".")[0], 10);

		return {
			valid: majorVersion >= InitPrerequisites.MIN_NODE_VERSION,
			version,
		};
	}

	/**
	 * Check if Beads CLI is installed
	 */
	async checkBeadsCLI(): Promise<boolean> {
		const result = await this.processRunner.exec("bd --version");
		return result.exitCode === 0;
	}

	/**
	 * Check if Claude CLI is installed
	 */
	async checkClaudeCLI(): Promise<boolean> {
		const result = await this.processRunner.exec("claude --version");
		return result.exitCode === 0;
	}

	/**
	 * Run all prerequisite checks and return aggregated result
	 */
	async checkAll(): Promise<PrerequisiteResult> {
		const gitRepo = this.checkGitRepo();
		const nodeResult = await this.checkNodeVersion();
		const beadsCLI = await this.checkBeadsCLI();
		const claudeCLI = await this.checkClaudeCLI();

		const missing: MissingPrerequisite[] = [];

		if (!gitRepo) {
			missing.push({
				name: "gitRepo",
				instruction: "Run `git init` to initialize a git repository",
			});
		}

		if (!nodeResult.valid) {
			missing.push({
				name: "nodeVersion",
				instruction: "Install Node.js 20+ from https://nodejs.org",
			});
		}

		if (!beadsCLI) {
			missing.push({
				name: "beadsCLI",
				instruction: "Install Beads: `brew install beads-ai/tap/beads`",
			});
		}

		if (!claudeCLI) {
			missing.push({
				name: "claudeCLI",
				instruction:
					"Install Claude Code: `npm install -g @anthropic-ai/claude-code`",
			});
		}

		return {
			gitRepo,
			nodeVersion: nodeResult.valid,
			nodeVersionFound: nodeResult.version,
			beadsCLI,
			claudeCLI,
			missing,
			allPassed: missing.length === 0,
		};
	}
}
