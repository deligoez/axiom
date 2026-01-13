/**
 * RulesLoader Service
 *
 * Loads shared rules from `.chorus/rules/` directory.
 * Provides fallback defaults if files are missing.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	CommitRule,
	CompletionRule,
	LearningRule,
	SharedRules,
	SignalRule,
} from "../types/rules.js";

/**
 * Default signal rules (fallback when file missing)
 */
const DEFAULT_SIGNAL_RULES: SignalRule[] = [
	{
		type: "COMPLETE",
		description: "Task completed successfully",
		payloadRequired: false,
		example: "<chorus>COMPLETE</chorus>",
	},
	{
		type: "BLOCKED",
		description: "Cannot proceed due to blocker",
		payloadRequired: true,
		payloadFormat: "Reason for blockage",
		example: "<chorus>BLOCKED:Missing dependency</chorus>",
	},
	{
		type: "NEEDS_HELP",
		description: "Need human assistance",
		payloadRequired: true,
		payloadFormat: "Description of help needed",
		example: "<chorus>NEEDS_HELP:Unclear requirements</chorus>",
	},
	{
		type: "PROGRESS",
		description: "Report progress percentage",
		payloadRequired: true,
		payloadFormat: "Percentage (0-100)",
		example: "<chorus>PROGRESS:50</chorus>",
	},
	{
		type: "RESOLVED",
		description: "Blocker has been resolved",
		payloadRequired: false,
		example: "<chorus>RESOLVED</chorus>",
	},
	{
		type: "NEEDS_HUMAN",
		description: "Requires human intervention",
		payloadRequired: true,
		payloadFormat: "Reason for human intervention",
		example: "<chorus>NEEDS_HUMAN:Security review required</chorus>",
	},
];

/**
 * Default learning rules (fallback when file missing)
 */
const DEFAULT_LEARNING_RULES: LearningRule[] = [
	{
		scope: "local",
		description: "Only affects this task",
		categoryPrefix: "local",
		triggersPlanReview: false,
		triggersAlert: false,
		example: "This function needs null check",
	},
	{
		scope: "cross-cutting",
		description: "Affects multiple features",
		categoryPrefix: "cross",
		triggersPlanReview: true,
		triggersAlert: false,
		example: "API rate limits require backoff",
	},
	{
		scope: "architectural",
		description: "Fundamental design decision",
		categoryPrefix: "arch",
		triggersPlanReview: true,
		triggersAlert: true,
		example: "Database schema change required",
	},
];

/**
 * Default commit rules (fallback when file missing)
 */
const DEFAULT_COMMIT_RULES: CommitRule[] = [
	{
		type: "feat",
		description: "New feature",
		scopeRequired: false,
		breakingChangeMarker: true,
		format: "feat: description [task-id]",
		example: "feat: add user authentication [ch-123]",
	},
	{
		type: "fix",
		description: "Bug fix",
		scopeRequired: false,
		breakingChangeMarker: false,
		format: "fix: description [task-id]",
		example: "fix: handle null input [ch-456]",
	},
	{
		type: "chore",
		description: "Maintenance task",
		scopeRequired: false,
		breakingChangeMarker: false,
		format: "chore: description [task-id]",
		example: "chore: update dependencies [ch-789]",
	},
	{
		type: "refactor",
		description: "Code refactoring",
		scopeRequired: false,
		breakingChangeMarker: false,
		format: "refactor: description [task-id]",
		example: "refactor: extract validation logic [ch-012]",
	},
	{
		type: "test",
		description: "Test changes",
		scopeRequired: false,
		breakingChangeMarker: false,
		format: "test: description [task-id]",
		example: "test: add unit tests for parser [ch-345]",
	},
];

/**
 * Default completion rules (fallback when file missing)
 */
const DEFAULT_COMPLETION_RULES: CompletionRule[] = [
	{
		id: "emit-complete-signal",
		description: "Emit COMPLETE signal when done",
		required: true,
		verificationMethod: "signal",
		errorMessage: "Task must emit COMPLETE signal",
	},
	{
		id: "tests-pass",
		description: "All tests must pass",
		required: true,
		verificationMethod: "test",
		errorMessage: "Tests must pass before completion",
	},
	{
		id: "quality-pass",
		description: "Quality checks must pass",
		required: true,
		verificationMethod: "test",
		errorMessage: "npm run quality must pass",
	},
];

/**
 * Service to load shared rules from `.chorus/rules/` directory.
 */
export class RulesLoader {
	private readonly rulesDir: string;
	private cache: Map<string, unknown> = new Map();

	constructor(projectDir: string) {
		this.rulesDir = join(projectDir, ".chorus", "rules");
	}

	/**
	 * Load signal type rules from signal-types.md
	 */
	loadSignalTypes(): SignalRule[] {
		const cached = this.cache.get("signals");
		if (cached) return cached as SignalRule[];

		const filePath = join(this.rulesDir, "signal-types.md");
		if (!existsSync(filePath)) {
			this.cache.set("signals", DEFAULT_SIGNAL_RULES);
			return DEFAULT_SIGNAL_RULES;
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseSignalTypes(content);
		this.cache.set("signals", rules);
		return rules;
	}

	/**
	 * Load learning format rules from learning-format.md
	 */
	loadLearningFormat(): LearningRule[] {
		const cached = this.cache.get("learnings");
		if (cached) return cached as LearningRule[];

		const filePath = join(this.rulesDir, "learning-format.md");
		if (!existsSync(filePath)) {
			this.cache.set("learnings", DEFAULT_LEARNING_RULES);
			return DEFAULT_LEARNING_RULES;
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseLearningFormat(content);
		this.cache.set("learnings", rules);
		return rules;
	}

	/**
	 * Load commit format rules from commit-format.md
	 */
	loadCommitFormat(): CommitRule[] {
		const cached = this.cache.get("commits");
		if (cached) return cached as CommitRule[];

		const filePath = join(this.rulesDir, "commit-format.md");
		if (!existsSync(filePath)) {
			this.cache.set("commits", DEFAULT_COMMIT_RULES);
			return DEFAULT_COMMIT_RULES;
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseCommitFormat(content);
		this.cache.set("commits", rules);
		return rules;
	}

	/**
	 * Load completion protocol rules from completion-protocol.md
	 */
	loadCompletionProtocol(): CompletionRule[] {
		const cached = this.cache.get("completion");
		if (cached) return cached as CompletionRule[];

		const filePath = join(this.rulesDir, "completion-protocol.md");
		if (!existsSync(filePath)) {
			this.cache.set("completion", DEFAULT_COMPLETION_RULES);
			return DEFAULT_COMPLETION_RULES;
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseCompletionProtocol(content);
		this.cache.set("completion", rules);
		return rules;
	}

	/**
	 * Load all rules and return combined SharedRules object
	 */
	loadAllRules(): SharedRules {
		return {
			version: "1.0",
			signals: this.loadSignalTypes(),
			learnings: this.loadLearningFormat(),
			commits: this.loadCommitFormat(),
			completion: this.loadCompletionProtocol(),
		};
	}

	/**
	 * Clear the cache to force re-reading from disk
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Parse signal-types.md content into SignalRule array
	 */
	private parseSignalTypes(content: string): SignalRule[] {
		const rules: SignalRule[] = [];
		const sections = this.parseSections(content);

		for (const section of sections) {
			const rule: SignalRule = {
				type: section.name as SignalRule["type"],
				description: this.extractField(section.content, "Description") ?? "",
				payloadRequired:
					this.extractField(section.content, "Payload Required") === "true",
				example: this.extractCodeField(section.content, "Example") ?? "",
			};

			const payloadFormat = this.extractField(
				section.content,
				"Payload Format",
			);
			if (payloadFormat) {
				rule.payloadFormat = payloadFormat;
			}

			rules.push(rule);
		}

		return rules;
	}

	/**
	 * Parse learning-format.md content into LearningRule array
	 */
	private parseLearningFormat(content: string): LearningRule[] {
		const rules: LearningRule[] = [];
		const sections = this.parseSections(content);

		for (const section of sections) {
			const rule: LearningRule = {
				scope: section.name as LearningRule["scope"],
				description: this.extractField(section.content, "Description") ?? "",
				categoryPrefix:
					this.extractField(section.content, "Category Prefix") ?? "",
				triggersPlanReview:
					this.extractField(section.content, "Triggers Plan Review") === "true",
				triggersAlert:
					this.extractField(section.content, "Triggers Alert") === "true",
				example: this.extractQuotedField(section.content, "Example") ?? "",
			};

			rules.push(rule);
		}

		return rules;
	}

	/**
	 * Parse commit-format.md content into CommitRule array
	 */
	private parseCommitFormat(content: string): CommitRule[] {
		const rules: CommitRule[] = [];
		const sections = this.parseSections(content);

		for (const section of sections) {
			const rule: CommitRule = {
				type: section.name,
				description: this.extractField(section.content, "Description") ?? "",
				scopeRequired:
					this.extractField(section.content, "Scope Required") === "true",
				breakingChangeMarker:
					this.extractField(section.content, "Breaking Change Marker") ===
					"true",
				format: this.extractField(section.content, "Format") ?? "",
				example: this.extractField(section.content, "Example") ?? "",
			};

			rules.push(rule);
		}

		return rules;
	}

	/**
	 * Parse completion-protocol.md content into CompletionRule array
	 */
	private parseCompletionProtocol(content: string): CompletionRule[] {
		const rules: CompletionRule[] = [];
		const sections = this.parseSections(content);

		for (const section of sections) {
			const rule: CompletionRule = {
				id: section.name,
				description: this.extractField(section.content, "Description") ?? "",
				required: this.extractField(section.content, "Required") === "true",
				verificationMethod: this.extractField(
					section.content,
					"Verification Method",
				) as CompletionRule["verificationMethod"],
				errorMessage: this.extractField(section.content, "Error Message") ?? "",
			};

			rules.push(rule);
		}

		return rules;
	}

	/**
	 * Parse markdown into sections (## headings)
	 */
	private parseSections(
		content: string,
	): Array<{ name: string; content: string }> {
		const sections: Array<{ name: string; content: string }> = [];
		const lines = content.split("\n");
		let currentSection: { name: string; content: string } | null = null;

		for (const line of lines) {
			const match = line.match(/^## (.+)$/);
			if (match) {
				if (currentSection) {
					sections.push(currentSection);
				}
				currentSection = { name: match[1], content: "" };
			} else if (currentSection) {
				currentSection.content += `${line}\n`;
			}
		}

		if (currentSection) {
			sections.push(currentSection);
		}

		return sections;
	}

	/**
	 * Extract field value from markdown content
	 * Format: - **Field Name:** value
	 */
	private extractField(content: string, fieldName: string): string | undefined {
		const regex = new RegExp(`- \\*\\*${fieldName}:\\*\\* (.+)`, "i");
		const match = content.match(regex);
		return match?.[1]?.trim();
	}

	/**
	 * Extract code field value (removes backticks)
	 * Format: - **Field Name:** `value`
	 */
	private extractCodeField(
		content: string,
		fieldName: string,
	): string | undefined {
		const value = this.extractField(content, fieldName);
		if (value) {
			return value.replace(/^`|`$/g, "");
		}
		return undefined;
	}

	/**
	 * Extract quoted field value (removes quotes)
	 * Format: - **Field Name:** "value"
	 */
	private extractQuotedField(
		content: string,
		fieldName: string,
	): string | undefined {
		const value = this.extractField(content, fieldName);
		if (value) {
			return value.replace(/^"|"$/g, "");
		}
		return undefined;
	}
}
