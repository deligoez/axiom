import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Bead } from "../types/bead.js";
import type { ChorusConfig } from "../types/config.js";

export interface PromptContext {
	task: Bead;
	branch: string;
	taskId: string;
	config: ChorusConfig;
	projectDir: string;
}

export class PromptBuilder {
	async build(context: PromptContext): Promise<string> {
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
		return `## Commit Message Rules
**IMPORTANT:** Include task ID in every commit message for rollback support.

Format: \`<type>: <description> [<task-id>]\`

Example: \`feat: implement auth [${taskId}]\``;
	}

	buildLearningsFormatSection(): string {
		return `## Learnings Format
When you discover something useful, add it to your scratchpad's ## Learnings section with a scope prefix:

- **[LOCAL]** - Only affects this task (not shared with other tasks)
- **[CROSS-CUTTING]** - Affects multiple features (triggers plan review)
- **[ARCHITECTURAL]** - Fundamental design decision (triggers plan review + alert)

Example:
\`\`\`
## Learnings
- [LOCAL] This function needs memoization for performance
- [CROSS-CUTTING] All API endpoints require rate limiting middleware
- [ARCHITECTURAL] Use dependency injection for service instantiation
\`\`\``;
	}

	buildCompletionSection(config: ChorusConfig): string {
		const hasQualityCommands =
			config.qualityCommands && config.qualityCommands.length > 0;

		const qualityNote = hasQualityCommands
			? " AND all required quality commands pass"
			: "";

		return `## Completion Protocol
When ALL criteria are met${qualityNote}:
1. ${hasQualityCommands ? "Run each quality command and verify it passes\n2. " : ""}Output exactly: <chorus>COMPLETE</chorus>

If blocked by external issue, output: <chorus>BLOCKED: reason</chorus>
If you need clarification, output: <chorus>NEEDS_HELP: what you need</chorus>`;
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
