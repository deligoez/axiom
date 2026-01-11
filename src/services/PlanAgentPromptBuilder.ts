import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ChorusConfig } from "../types/config.js";
import { PatternsManager } from "./PatternsManager.js";

export interface TaskRulesConfig {
	maxAcceptanceCriteria?: number;
	maxDescriptionLength?: number;
	requireTestFile?: boolean;
	enforceNaming?: string;
	forbiddenWords?: string[];
}

const DEFAULT_RULES: TaskRulesConfig = {
	maxAcceptanceCriteria: 15,
	maxDescriptionLength: 1000,
	requireTestFile: false,
	enforceNaming: undefined,
	forbiddenWords: [],
};

export class PlanAgentPromptBuilder {
	private readonly projectDir: string;
	private readonly patternsManager: PatternsManager;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
		this.patternsManager = new PatternsManager(projectDir);
	}

	/**
	 * Build the full system prompt for the Plan Agent
	 */
	build(config: ChorusConfig): string {
		const rules = this.loadTaskRules();
		const patterns = this.patternsManager.read();

		const sections: string[] = [];

		// Header
		sections.push("# Plan Agent System Prompt");
		sections.push("");

		// Core task rules
		sections.push("## Core Task Rules");
		sections.push("");
		sections.push("All tasks MUST be:");
		sections.push("- **atomic**: Single responsibility, one clear objective");
		sections.push(
			"- **testable**: Measurable completion criteria, no vague language",
		);
		sections.push(
			"- **right-sized**: Completable within context window, appropriate scope",
		);
		sections.push("");

		// Configuration limits
		sections.push("## Configuration Limits");
		sections.push("");
		sections.push(
			`- Maximum acceptance criteria: ${rules.maxAcceptanceCriteria ?? DEFAULT_RULES.maxAcceptanceCriteria}`,
		);
		sections.push(
			`- Maximum description length: ${rules.maxDescriptionLength ?? DEFAULT_RULES.maxDescriptionLength} characters`,
		);
		if (rules.requireTestFile) {
			sections.push("- Each task MUST reference a test file");
		}
		if (rules.enforceNaming) {
			sections.push(`- Task naming pattern: ${rules.enforceNaming}`);
		}
		if (rules.forbiddenWords && rules.forbiddenWords.length > 0) {
			sections.push(
				`- Forbidden words (avoid): ${rules.forbiddenWords.join(", ")}`,
			);
		}
		sections.push("");

		// Project context
		sections.push("## Project Context");
		sections.push("");
		if (config.project.name) {
			sections.push(`- Project name: ${config.project.name}`);
		}
		if (config.project.type) {
			sections.push(`- Project type: ${config.project.type}`);
		}
		sections.push(`- Task ID prefix: ${config.project.taskIdPrefix}`);
		sections.push("");

		// Quality commands
		sections.push("## Quality Commands");
		sections.push("");
		sections.push(
			"The following quality checks are configured for this project:",
		);
		sections.push("");
		for (const cmd of config.qualityCommands) {
			const required = cmd.required ? " (required)" : " (optional)";
			sections.push(
				`${cmd.order}. **${cmd.name}**: \`${cmd.command}\`${required}`,
			);
		}
		sections.push("");

		// Patterns (from PATTERNS.md)
		const patternCategories = Object.keys(patterns);
		if (patternCategories.length > 0) {
			sections.push("## Project Patterns");
			sections.push("");
			sections.push("Follow these established patterns when creating tasks:");
			sections.push("");
			for (const category of patternCategories) {
				sections.push(`### ${category}`);
				for (const pattern of patterns[category]) {
					sections.push(`- ${pattern}`);
				}
				sections.push("");
			}
		}

		return sections.join("\n");
	}

	/**
	 * Load and parse task-rules.md configuration
	 */
	private loadTaskRules(): TaskRulesConfig {
		const rulesPath = join(this.projectDir, ".chorus", "task-rules.md");

		if (!existsSync(rulesPath)) {
			return { ...DEFAULT_RULES };
		}

		const content = readFileSync(rulesPath, "utf-8");
		return this.parseTaskRules(content);
	}

	/**
	 * Parse task-rules.md content into config object
	 */
	private parseTaskRules(content: string): TaskRulesConfig {
		const rules: TaskRulesConfig = { ...DEFAULT_RULES };

		// Parse max_acceptance_criteria: N
		const maxCriteriaMatch = content.match(/max_acceptance_criteria:\s*(\d+)/);
		if (maxCriteriaMatch) {
			rules.maxAcceptanceCriteria = Number.parseInt(maxCriteriaMatch[1], 10);
		}

		// Parse max_description_length: N
		const maxLengthMatch = content.match(/max_description_length:\s*(\d+)/);
		if (maxLengthMatch) {
			rules.maxDescriptionLength = Number.parseInt(maxLengthMatch[1], 10);
		}

		// Parse [x] require_test_file
		const requireTestMatch = content.match(/\[x\]\s*require_test_file/i);
		if (requireTestMatch) {
			rules.requireTestFile = true;
		}

		// Parse [x] enforce_naming: pattern
		const enforceNamingMatch = content.match(/\[x\]\s*enforce_naming:\s*(.+)/i);
		if (enforceNamingMatch) {
			rules.enforceNaming = enforceNamingMatch[1].trim();
		}

		// Parse forbidden_words: word1, word2
		const forbiddenWordsMatch = content.match(/forbidden_words:\s*(.+)/);
		if (forbiddenWordsMatch) {
			rules.forbiddenWords = forbiddenWordsMatch[1]
				.split(",")
				.map((w) => w.trim());
		}

		return rules;
	}
}
