/**
 * E2E Tests for Shared Rules Migration
 *
 * Verifies that the migration from hardcoded prompts to file-based rules is complete:
 * - Fresh init creates all rule files
 * - Agent prompts contain file-based rules
 * - No hardcoded prompts in built prompts
 * - Missing rules dir causes clear error
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InitScaffold } from "../services/InitScaffold.js";
import { PromptBuilder } from "../services/PromptBuilder.js";
import { RuleFileMissingError, RulesLoader } from "../services/RulesLoader.js";
import { getDefaultConfig } from "../types/config.js";

describe("E2E: Migration Verification", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-e2e-"));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("Fresh init creates all rule files", () => {
		// Arrange
		const scaffold = new InitScaffold(tempDir);

		// Act
		scaffold.createDirectories();
		scaffold.scaffoldRules();

		// Assert - all 4 rule files exist
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		expect(fs.existsSync(path.join(rulesDir, "signal-types.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "learning-format.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "commit-format.md"))).toBe(true);
		expect(fs.existsSync(path.join(rulesDir, "completion-protocol.md"))).toBe(
			true,
		);

		// Verify files have content (not empty)
		const signalContent = fs.readFileSync(
			path.join(rulesDir, "signal-types.md"),
			"utf-8",
		);
		expect(signalContent.length).toBeGreaterThan(100);
		expect(signalContent).toContain("# Signal Types");
	});

	it("Agent prompts contain file-based rules", async () => {
		// Arrange - scaffold rules first
		const scaffold = new InitScaffold(tempDir);
		scaffold.createDirectories();
		scaffold.scaffoldRules();

		const builder = new PromptBuilder();
		const config = getDefaultConfig();
		const now = new Date().toISOString();
		const context = {
			task: {
				id: "ch-test",
				title: "Test Task",
				description: "Test description",
				status: "doing" as const,
				type: "task" as const,
				tags: [] as string[],
				dependencies: [] as string[],
				createdAt: now,
				updatedAt: now,
				reviewCount: 0,
				learningsCount: 0,
				hasLearnings: false,
				version: 1,
			},
			branch: "agent/claude/ch-test",
			taskId: "ch-test",
			config,
			projectDir: tempDir,
		};

		// Act
		const prompt = await builder.build(context);

		// Assert - prompt contains rules from files
		expect(prompt).toContain("## Commit Message Rules");
		expect(prompt).toContain("feat");
		expect(prompt).toContain("## Learnings Format");
		expect(prompt).toContain("[LOCAL]");
		expect(prompt).toContain("[CROSS-CUTTING]");
		expect(prompt).toContain("## Completion Protocol");
		expect(prompt).toContain("COMPLETE");
	});

	it("No hardcoded prompts in built prompts (uses rules from files)", async () => {
		// Arrange - scaffold custom rules
		const scaffold = new InitScaffold(tempDir);
		scaffold.createDirectories();

		// Create custom rule files with unique content
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });

		// Custom commit rules
		fs.writeFileSync(
			path.join(rulesDir, "commit-format.md"),
			`# Commit Format

## custom
- **Description:** Custom commit type for testing
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** custom: description [task-id]
- **Example:** custom: unique test commit [ch-xyz]
`,
		);

		// Custom learning rules
		fs.writeFileSync(
			path.join(rulesDir, "learning-format.md"),
			`# Learning Format

## custom-scope
- **Description:** Custom scope for testing
- **Category Prefix:** custom
- **Triggers Plan Review:** false
- **Triggers Alert:** false
- **Example:** "Unique custom learning example"
`,
		);

		// Custom completion rules
		fs.writeFileSync(
			path.join(rulesDir, "completion-protocol.md"),
			`# Completion Protocol

## custom-completion
- **Description:** Custom completion rule for testing
- **Required:** true
- **Verification Method:** signal
- **Error Message:** Custom error message
`,
		);

		// Signal types (standard)
		fs.writeFileSync(
			path.join(rulesDir, "signal-types.md"),
			`# Signal Types

## COMPLETE
- **Description:** Task done
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`
`,
		);

		const builder = new PromptBuilder();
		const config = getDefaultConfig();
		const now = new Date().toISOString();
		const context = {
			task: {
				id: "ch-test",
				title: "Test Task",
				description: "Test description",
				status: "doing" as const,
				type: "task" as const,
				tags: [] as string[],
				dependencies: [] as string[],
				createdAt: now,
				updatedAt: now,
				reviewCount: 0,
				learningsCount: 0,
				hasLearnings: false,
				version: 1,
			},
			branch: "agent/claude/ch-test",
			taskId: "ch-test",
			config,
			projectDir: tempDir,
		};

		// Act
		const prompt = await builder.build(context);

		// Assert - prompt contains CUSTOM rules, not hardcoded defaults
		expect(prompt).toContain("custom");
		expect(prompt).toContain("Custom commit type for testing");
		expect(prompt).toContain("CUSTOM-SCOPE");
		expect(prompt).toContain("Custom completion rule for testing");
	});

	it("Missing rules dir causes clear error", () => {
		// Arrange - no scaffolding, empty project
		const loader = new RulesLoader(tempDir);

		// Act & Assert - throws RuleFileMissingError
		expect(() => loader.loadSignalTypes()).toThrow(RuleFileMissingError);
		expect(() => loader.loadSignalTypes()).toThrow("Missing rule file");
		expect(() => loader.loadSignalTypes()).toThrow("signal-types.md");
		expect(() => loader.loadSignalTypes()).toThrow("chorus init");

		// Verify error message is helpful
		try {
			loader.loadSignalTypes();
		} catch (error) {
			const err = error as RuleFileMissingError;
			expect(err.fileName).toBe("signal-types.md");
			expect(err.message).toContain("chorus init");
		}
	});
});
