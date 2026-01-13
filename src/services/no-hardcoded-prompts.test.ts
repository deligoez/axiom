/**
 * Static Analysis: No Hardcoded Prompts Verification
 *
 * Verifies that hardcoded DEFAULT_* rule constants have been removed
 * from RulesLoader and that prompts are loaded from rule files.
 *
 * The key verification is that RulesLoader no longer has fallback defaults.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

interface Violation {
	file: string;
	line: number;
	pattern: string;
	match: string;
	description: string;
}

// Files to scan for hardcoded rule constants
const FILES_TO_CHECK = ["RulesLoader.ts"];

// Patterns that indicate hardcoded rule constants (what we removed in MH05)
const HARDCODED_RULE_PATTERNS = [
	{
		name: "DEFAULT_SIGNAL_RULES",
		pattern: /const\s+DEFAULT_SIGNAL_RULES/g,
		description: "Hardcoded signal rules constant",
	},
	{
		name: "DEFAULT_LEARNING_RULES",
		pattern: /const\s+DEFAULT_LEARNING_RULES/g,
		description: "Hardcoded learning rules constant",
	},
	{
		name: "DEFAULT_COMMIT_RULES",
		pattern: /const\s+DEFAULT_COMMIT_RULES/g,
		description: "Hardcoded commit rules constant",
	},
	{
		name: "DEFAULT_COMPLETION_RULES",
		pattern: /const\s+DEFAULT_COMPLETION_RULES/g,
		description: "Hardcoded completion rules constant",
	},
];

// Verify RulesLoader throws on missing files (no fallback)
const FALLBACK_PATTERNS = [
	{
		name: "signal_fallback",
		pattern: /return\s+DEFAULT_SIGNAL_RULES/g,
		description: "Fallback to default signal rules",
	},
	{
		name: "learning_fallback",
		pattern: /return\s+DEFAULT_LEARNING_RULES/g,
		description: "Fallback to default learning rules",
	},
	{
		name: "commit_fallback",
		pattern: /return\s+DEFAULT_COMMIT_RULES/g,
		description: "Fallback to default commit rules",
	},
	{
		name: "completion_fallback",
		pattern: /return\s+DEFAULT_COMPLETION_RULES/g,
		description: "Fallback to default completion rules",
	},
];

function scanFile(filePath: string): Violation[] {
	const violations: Violation[] = [];
	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// Check for hardcoded rule constants
	for (const patternDef of HARDCODED_RULE_PATTERNS) {
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			if (patternDef.pattern.test(line)) {
				patternDef.pattern.lastIndex = 0; // Reset regex
				violations.push({
					file: filePath,
					line: lineNum + 1,
					pattern: patternDef.name,
					match: line.trim().substring(0, 60),
					description: patternDef.description,
				});
			}
		}
	}

	// Check for fallback returns
	for (const patternDef of FALLBACK_PATTERNS) {
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			if (patternDef.pattern.test(line)) {
				patternDef.pattern.lastIndex = 0; // Reset regex
				violations.push({
					file: filePath,
					line: lineNum + 1,
					pattern: patternDef.name,
					match: line.trim().substring(0, 60),
					description: patternDef.description,
				});
			}
		}
	}

	return violations;
}

function scanServicesDirectory(): Violation[] {
	const servicesDir = path.join(__dirname);
	const violations: Violation[] = [];

	for (const fileName of FILES_TO_CHECK) {
		const filePath = path.join(servicesDir, fileName);
		if (fs.existsSync(filePath)) {
			const fileViolations = scanFile(filePath);
			violations.push(...fileViolations);
		}
	}

	return violations;
}

describe("No Hardcoded Prompts Verification", () => {
	it("scans all services files and finds no hardcoded rule constants", () => {
		// Arrange & Act
		const violations = scanServicesDirectory();

		// Assert
		if (violations.length > 0) {
			const report = violations
				.map(
					(v) =>
						`  ${v.file}:${v.line} - ${v.description}\n    Match: ${v.match}`,
				)
				.join("\n");
			expect.fail(
				`Found ${violations.length} hardcoded rule violations:\n${report}\n\nTo fix: Remove hardcoded constants and use file-based rules`,
			);
		}

		expect(violations).toHaveLength(0);
	});

	it("RulesLoader throws RuleFileMissingError when files missing", () => {
		// Verify the class is exported
		const rulesLoaderPath = path.join(__dirname, "RulesLoader.ts");
		const content = fs.readFileSync(rulesLoaderPath, "utf-8");

		// Verify RuleFileMissingError class exists
		expect(content).toContain("export class RuleFileMissingError");
		expect(content).toContain("throw new RuleFileMissingError");
	});

	it("PromptBuilder uses RulesLoader (no inline fallback strings)", () => {
		// Verify PromptBuilder imports and uses RulesLoader
		const promptBuilderPath = path.join(__dirname, "PromptBuilder.ts");
		const content = fs.readFileSync(promptBuilderPath, "utf-8");

		// Verify it imports RulesLoader
		expect(content).toContain("import { RulesLoader }");

		// Verify it creates a RulesLoader instance
		expect(content).toContain("new RulesLoader");

		// Verify no fallback strings (the old hardcoded prompts)
		expect(content).not.toContain(
			"[LOCAL] - Only affects this task (not shared with other tasks)",
		);
		expect(content).not.toContain(
			"[ARCHITECTURAL] - Fundamental design decision",
		);
	});

	it("shared-rules E2E validates error thrown for missing files", () => {
		// Verify the E2E test exists and tests error behavior
		const e2eDir = path.join(__dirname, "..", "e2e");
		const sharedRulesPath = path.join(e2eDir, "shared-rules.e2e.test.ts");
		const content = fs.readFileSync(sharedRulesPath, "utf-8");

		// Verify test name changed from fallback to error
		expect(content).toContain("Throws error when rule files missing");
		expect(content).not.toContain("Fallback works when files missing");
	});
});
