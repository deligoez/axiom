import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Bead } from "../types/bead.js";
import type { ChorusConfig } from "../types/config.js";
import type {
	CommitRule,
	CompletionRule,
	LearningRule,
} from "../types/rules.js";
import { RulesLoader } from "./RulesLoader.js";

export interface PromptContext {
	task: Bead;
	branch: string;
	taskId: string;
	config: ChorusConfig;
	projectDir: string;
}

export class PromptBuilder {
	private rulesLoader: RulesLoader | null = null;

	async build(context: PromptContext): Promise<string> {
		// Create RulesLoader for this project
		this.rulesLoader = new RulesLoader(context.projectDir);
		const sections: string[] = [];

		// Task section
		sections.push(this.buildTaskSection(context.task));

		// Quality commands section
		const qualitySection = this.buildQualityCommandsSection(context.config);
		if (qualitySection) {
			sections.push(qualitySection);
		}

		// Patterns section (optional)
		const patterns = await this.loadPatterns(context.projectDir);
		if (patterns) {
			sections.push(this.buildPatternsSection(patterns));
		}

		// Commit rules section
		sections.push(this.buildCommitRulesSection(context.taskId));

		// Learnings format section
		sections.push(this.buildLearningsFormatSection());

		// Completion protocol section
		sections.push(this.buildCompletionSection(context.config));

		// Context section
		sections.push(this.buildContextSection(context.branch));

		return sections.join("\n\n");
	}

	buildTaskSection(task: Bead): string {
		const lines = [`# Task: ${task.id}`, "", "## Description", task.title];

		if (task.description) {
			lines.push("", task.description);
		}

		return lines.join("\n");
	}

	buildQualityCommandsSection(config: ChorusConfig): string {
		if (!config.qualityCommands || config.qualityCommands.length === 0) {
			return "";
		}

		const lines = [
			"## Quality Commands (must pass before completion)",
			"Run these commands in order before signaling COMPLETE:",
		];

		// Sort by order
		const sorted = [...config.qualityCommands].sort(
			(a, b) => a.order - b.order,
		);

		for (let i = 0; i < sorted.length; i++) {
			const cmd = sorted[i];
			const reqLabel = cmd.required ? "(required)" : "(optional)";
			lines.push(`${i + 1}. \`${cmd.command}\` ${reqLabel}`);
		}

		return lines.join("\n");
	}

	buildCommitRulesSection(taskId: string): string {
		// RulesLoader throws RuleFileMissingError if rules files not found
		// Requires chorus init to have been run
		const rules = this.rulesLoader?.loadCommitFormat() ?? [];

		return this.formatCommitRulesSection(rules, taskId);
	}

	private formatCommitRulesSection(
		rules: CommitRule[],
		taskId: string,
	): string {
		const lines = [
			"## Commit Message Rules",
			"**IMPORTANT:** Include task ID in every commit message for rollback support.",
			"",
			"### Commit Types",
		];

		for (const rule of rules) {
			lines.push(`- **${rule.type}**: ${rule.description}`);
			if (rule.example) {
				lines.push(
					`  Example: \`${rule.example.replace("[ch-", `[${taskId.replace("ch-", "[ch-").split("[")[0]}`)}\``,
				);
			}
		}

		lines.push("");
		lines.push(`Example: \`feat: implement feature [${taskId}]\``);

		return lines.join("\n");
	}

	buildLearningsFormatSection(): string {
		// RulesLoader throws RuleFileMissingError if rules files not found
		// Requires chorus init to have been run
		const rules = this.rulesLoader?.loadLearningFormat() ?? [];

		return this.formatLearningsSection(rules);
	}

	private formatLearningsSection(rules: LearningRule[]): string {
		const lines = [
			"## Learnings Format",
			"When you discover something useful, add it to your scratchpad's ## Learnings section with a scope prefix:",
			"",
		];

		for (const rule of rules) {
			const scopeUpper = rule.scope.toUpperCase().replace("-", "-");
			const alerts = [];
			if (rule.triggersPlanReview) alerts.push("triggers plan review");
			if (rule.triggersAlert) alerts.push("alert");
			const alertNote = alerts.length > 0 ? ` (${alerts.join(" + ")})` : "";
			lines.push(`- **[${scopeUpper}]** - ${rule.description}${alertNote}`);
		}

		// Add example
		lines.push("");
		lines.push("Example:");
		lines.push("```");
		lines.push("## Learnings");
		for (const rule of rules) {
			const scopeUpper = rule.scope.toUpperCase().replace("-", "-");
			lines.push(`- [${scopeUpper}] ${rule.example}`);
		}
		lines.push("```");

		return lines.join("\n");
	}

	buildCompletionSection(config: ChorusConfig): string {
		// RulesLoader throws RuleFileMissingError if rules files not found
		// Requires chorus init to have been run
		const rules = this.rulesLoader?.loadCompletionProtocol() ?? [];
		const hasQualityCommands =
			config.qualityCommands && config.qualityCommands.length > 0;

		return this.formatCompletionSection(rules, hasQualityCommands);
	}

	private formatCompletionSection(
		rules: CompletionRule[],
		hasQualityCommands: boolean,
	): string {
		const qualityNote = hasQualityCommands
			? " AND all required quality commands pass"
			: "";

		const lines = [
			"## Completion Protocol",
			`When ALL criteria are met${qualityNote}:`,
		];

		let step = 1;
		if (hasQualityCommands) {
			lines.push(`${step}. Run each quality command and verify it passes`);
			step++;
		}

		// Add completion rules
		for (const rule of rules) {
			if (rule.required) {
				lines.push(`${step}. ${rule.description}`);
				step++;
			}
		}

		lines.push("");
		lines.push(
			"If blocked by external issue, output: <chorus>BLOCKED: reason</chorus>",
		);
		lines.push(
			"If you need clarification, output: <chorus>NEEDS_HELP: what you need</chorus>",
		);

		return lines.join("\n");
	}

	async loadPatterns(projectDir: string): Promise<string> {
		const patternsPath = path.join(projectDir, ".chorus", "PATTERNS.md");
		try {
			const content = await fs.readFile(patternsPath, "utf-8");
			return content;
		} catch {
			return "";
		}
	}

	private buildPatternsSection(patterns: string): string {
		return `## Patterns (from PATTERNS.md)
${patterns}`;
	}

	private buildContextSection(branch: string): string {
		return `## Context
- Read AGENTS.md for project conventions
- Read .chorus/PATTERNS.md for learned patterns
- Current branch: ${branch}
- Log discoveries to .agent/scratchpad.md
- Commit frequently with task ID in message`;
	}
}
