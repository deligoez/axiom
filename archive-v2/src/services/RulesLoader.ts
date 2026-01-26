/**
 * RulesLoader Service
 *
 * Loads shared rules from `.chorus/rules/` directory.
 * Throws RuleFileMissingError if files are missing (requires chorus init).
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
 * Error thrown when a required rule file is missing.
 * Guides user to run `chorus init` to create default files.
 */
export class RuleFileMissingError extends Error {
	constructor(
		public readonly fileName: string,
		public readonly filePath: string,
	) {
		super(
			`Missing rule file: ${fileName}. Run \`chorus init\` to create default rule files. (Expected: ${filePath})`,
		);
		this.name = "RuleFileMissingError";
	}
}

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
	 * @throws {RuleFileMissingError} if file is missing
	 */
	loadSignalTypes(): SignalRule[] {
		const cached = this.cache.get("signals");
		if (cached) return cached as SignalRule[];

		const fileName = "signal-types.md";
		const filePath = join(this.rulesDir, fileName);
		if (!existsSync(filePath)) {
			throw new RuleFileMissingError(fileName, filePath);
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseSignalTypes(content);
		this.cache.set("signals", rules);
		return rules;
	}

	/**
	 * Load learning format rules from learning-format.md
	 * @throws {RuleFileMissingError} if file is missing
	 */
	loadLearningFormat(): LearningRule[] {
		const cached = this.cache.get("learnings");
		if (cached) return cached as LearningRule[];

		const fileName = "learning-format.md";
		const filePath = join(this.rulesDir, fileName);
		if (!existsSync(filePath)) {
			throw new RuleFileMissingError(fileName, filePath);
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseLearningFormat(content);
		this.cache.set("learnings", rules);
		return rules;
	}

	/**
	 * Load commit format rules from commit-format.md
	 * @throws {RuleFileMissingError} if file is missing
	 */
	loadCommitFormat(): CommitRule[] {
		const cached = this.cache.get("commits");
		if (cached) return cached as CommitRule[];

		const fileName = "commit-format.md";
		const filePath = join(this.rulesDir, fileName);
		if (!existsSync(filePath)) {
			throw new RuleFileMissingError(fileName, filePath);
		}

		const content = readFileSync(filePath, "utf-8");
		const rules = this.parseCommitFormat(content);
		this.cache.set("commits", rules);
		return rules;
	}

	/**
	 * Load completion protocol rules from completion-protocol.md
	 * @throws {RuleFileMissingError} if file is missing
	 */
	loadCompletionProtocol(): CompletionRule[] {
		const cached = this.cache.get("completion");
		if (cached) return cached as CompletionRule[];

		const fileName = "completion-protocol.md";
		const filePath = join(this.rulesDir, fileName);
		if (!existsSync(filePath)) {
			throw new RuleFileMissingError(fileName, filePath);
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
