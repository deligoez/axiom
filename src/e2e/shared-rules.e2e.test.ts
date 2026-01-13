/**
 * E2E Tests for Shared Rules System
 *
 * Tests the full workflow of:
 * - Scaffolding rule files during init
 * - Loading rules from files
 * - Validating rule file format
 * - Fallback behavior when files missing
 * - Rules being formatted for agent prompts
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RulesLoader } from "../services/RulesLoader.js";
import { RulesScaffold } from "../services/RulesScaffold.js";
import { RulesValidator } from "../services/RulesValidator.js";

describe("E2E: Shared Rules System", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shared-rules-e2e-"));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("Init scaffolds all 4 rule files", () => {
		// Arrange
		const scaffold = new RulesScaffold(tempDir);

		// Act
		scaffold.scaffoldAll();

		// Assert - all 4 files exist
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		expect(fs.existsSync(path.join(rulesDir, "signal-types.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "learning-format.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "commit-format.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "completion-protocol.md"))).toBe(
			true,
		);

		// Verify files have content
		const signalContent = fs.readFileSync(
			path.join(rulesDir, "signal-types.md"),
			"utf-8",
		);
		expect(signalContent.length).toBeGreaterThan(100);
		expect(signalContent).toContain("# Signal Types");
	});

	it("RulesLoader loads all rules correctly after scaffolding", () => {
		// Arrange - scaffold first
		const scaffold = new RulesScaffold(tempDir);
		scaffold.scaffoldAll();
		const loader = new RulesLoader(tempDir);

		// Act
		const rules = loader.loadAllRules();

		// Assert - all rule types loaded
		expect(rules.version).toBe("1.0");
		expect(rules.signals.length).toBeGreaterThan(0);
		expect(rules.learnings.length).toBeGreaterThan(0);
		expect(rules.commits.length).toBeGreaterThan(0);
		expect(rules.completion.length).toBeGreaterThan(0);

		// Verify specific rules exist
		expect(rules.signals.some((s) => s.type === "COMPLETE")).toBe(true);
		expect(rules.signals.some((s) => s.type === "BLOCKED")).toBe(true);
		expect(rules.learnings.some((l) => l.scope === "local")).toBe(true);
		expect(rules.commits.some((c) => c.type === "feat")).toBe(true);
		expect(rules.completion.some((c) => c.id === "emit-complete-signal")).toBe(
			true,
		);
	});

	it("Validation catches malformed rules", () => {
		// Arrange - create malformed rule file
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });

		// Missing required fields
		const malformedContent = `# Signal Types

## BROKEN_SIGNAL
- **Description:** This signal is malformed
`;
		fs.writeFileSync(path.join(rulesDir, "signal-types.md"), malformedContent);

		// Act
		const content = fs.readFileSync(
			path.join(rulesDir, "signal-types.md"),
			"utf-8",
		);
		const result = RulesValidator.validateSignalTypes(content);

		// Assert - validation fails with specific errors
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors.some((e) => e.includes("Payload Required"))).toBe(
			true,
		);
		expect(result.errors.some((e) => e.includes("Example"))).toBe(true);
	});

	it("Throws error when rule files missing", () => {
		// Arrange - no scaffolding, empty project
		const loader = new RulesLoader(tempDir);

		// Act & Assert - throws RuleFileMissingError
		expect(() => loader.loadAllRules()).toThrow("Missing rule file");
		expect(() => loader.loadSignalTypes()).toThrow("signal-types.md");
		expect(() => loader.loadLearningFormat()).toThrow("learning-format.md");
		expect(() => loader.loadCommitFormat()).toThrow("commit-format.md");
		expect(() => loader.loadCompletionProtocol()).toThrow(
			"completion-protocol.md",
		);

		// Verify error message guides to chorus init
		expect(() => loader.loadSignalTypes()).toThrow("chorus init");
	});

	it("Rules can be formatted for agent prompts", () => {
		// Arrange - scaffold and load rules
		const scaffold = new RulesScaffold(tempDir);
		scaffold.scaffoldAll();
		const loader = new RulesLoader(tempDir);
		const rules = loader.loadAllRules();

		// Act - format rules for prompt inclusion
		const signalSection = formatSignalsForPrompt(rules.signals);
		const commitSection = formatCommitsForPrompt(rules.commits);

		// Assert - formatted output is suitable for prompts
		expect(signalSection).toContain("COMPLETE");
		expect(signalSection).toContain("<chorus>");
		expect(commitSection).toContain("feat:");
		expect(commitSection).toContain("[task-id]");
	});
});

/**
 * Helper: Format signal rules for prompt inclusion
 */
function formatSignalsForPrompt(
	signals: Array<{
		type: string;
		description: string;
		example: string;
		payloadRequired: boolean;
	}>,
): string {
	const lines = ["## Signal Types", ""];
	for (const signal of signals) {
		lines.push(`- **${signal.type}**: ${signal.description}`);
		lines.push(`  Example: \`${signal.example}\``);
	}
	return lines.join("\n");
}

/**
 * Helper: Format commit rules for prompt inclusion
 */
function formatCommitsForPrompt(
	commits: Array<{
		type: string;
		description: string;
		format: string;
	}>,
): string {
	const lines = ["## Commit Format", ""];
	for (const commit of commits) {
		lines.push(`- **${commit.type}**: ${commit.description}`);
		lines.push(`  Format: \`${commit.format}\``);
	}
	return lines.join("\n");
}
