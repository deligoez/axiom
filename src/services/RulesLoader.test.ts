import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RulesLoader } from "./RulesLoader.js";

describe("RulesLoader", () => {
	let tempDir: string;
	let rulesDir: string;
	let loader: RulesLoader;

	beforeEach(() => {
		vi.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-loader-test-"));
		rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });
		loader = new RulesLoader(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("loadSignalTypes()", () => {
		it("parses signal-types.md and returns SignalRule array", () => {
			// Arrange
			const content = `# Signal Types

## COMPLETE
- **Description:** Task is done
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`

## BLOCKED
- **Description:** Cannot proceed
- **Payload Required:** true
- **Payload Format:** Reason for blockage
- **Example:** \`<chorus>BLOCKED:Missing dependency</chorus>\`
`;
			fs.writeFileSync(path.join(rulesDir, "signal-types.md"), content);

			// Act
			const rules = loader.loadSignalTypes();

			// Assert
			expect(rules).toHaveLength(2);
			expect(rules[0]).toEqual({
				type: "COMPLETE",
				description: "Task is done",
				payloadRequired: false,
				example: "<chorus>COMPLETE</chorus>",
			});
			expect(rules[1]).toEqual({
				type: "BLOCKED",
				description: "Cannot proceed",
				payloadRequired: true,
				payloadFormat: "Reason for blockage",
				example: "<chorus>BLOCKED:Missing dependency</chorus>",
			});
		});

		it("throws RuleFileMissingError if file missing", () => {
			// Arrange - no file created

			// Act & Assert
			expect(() => loader.loadSignalTypes()).toThrow("Missing rule file");
			expect(() => loader.loadSignalTypes()).toThrow("signal-types.md");
			expect(() => loader.loadSignalTypes()).toThrow("chorus init");
		});
	});

	describe("loadLearningFormat()", () => {
		it("parses learning-format.md and returns LearningRule array", () => {
			// Arrange
			const content = `# Learning Format

## local
- **Description:** Only affects this task
- **Category Prefix:** local
- **Triggers Plan Review:** false
- **Triggers Alert:** false
- **Example:** "This function needs null check"

## cross-cutting
- **Description:** Affects multiple features
- **Category Prefix:** cross
- **Triggers Plan Review:** true
- **Triggers Alert:** false
- **Example:** "API rate limits require backoff"
`;
			fs.writeFileSync(path.join(rulesDir, "learning-format.md"), content);

			// Act
			const rules = loader.loadLearningFormat();

			// Assert
			expect(rules).toHaveLength(2);
			expect(rules[0]).toEqual({
				scope: "local",
				description: "Only affects this task",
				categoryPrefix: "local",
				triggersPlanReview: false,
				triggersAlert: false,
				example: "This function needs null check",
			});
		});

		it("throws RuleFileMissingError if file missing", () => {
			// Arrange - no file created

			// Act & Assert
			expect(() => loader.loadLearningFormat()).toThrow("Missing rule file");
			expect(() => loader.loadLearningFormat()).toThrow("learning-format.md");
			expect(() => loader.loadLearningFormat()).toThrow("chorus init");
		});
	});

	describe("loadCommitFormat()", () => {
		it("parses commit-format.md and returns CommitRule array", () => {
			// Arrange
			const content = `# Commit Format

## feat
- **Description:** New feature
- **Scope Required:** false
- **Breaking Change Marker:** true
- **Format:** feat: description [task-id]
- **Example:** feat: add user authentication [ch-123]

## fix
- **Description:** Bug fix
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** fix: description [task-id]
- **Example:** fix: handle null input [ch-456]
`;
			fs.writeFileSync(path.join(rulesDir, "commit-format.md"), content);

			// Act
			const rules = loader.loadCommitFormat();

			// Assert
			expect(rules).toHaveLength(2);
			expect(rules[0]).toEqual({
				type: "feat",
				description: "New feature",
				scopeRequired: false,
				breakingChangeMarker: true,
				format: "feat: description [task-id]",
				example: "feat: add user authentication [ch-123]",
			});
		});

		it("throws RuleFileMissingError if file missing", () => {
			// Arrange - no file created

			// Act & Assert
			expect(() => loader.loadCommitFormat()).toThrow("Missing rule file");
			expect(() => loader.loadCommitFormat()).toThrow("commit-format.md");
			expect(() => loader.loadCommitFormat()).toThrow("chorus init");
		});
	});

	describe("loadCompletionProtocol()", () => {
		it("parses completion-protocol.md and returns CompletionRule array", () => {
			// Arrange
			const content = `# Completion Protocol

## emit-complete-signal
- **Description:** Emit COMPLETE signal when done
- **Required:** true
- **Verification Method:** signal
- **Error Message:** Task must emit COMPLETE signal

## tests-pass
- **Description:** All tests must pass
- **Required:** true
- **Verification Method:** test
- **Error Message:** Tests must pass before completion
`;
			fs.writeFileSync(path.join(rulesDir, "completion-protocol.md"), content);

			// Act
			const rules = loader.loadCompletionProtocol();

			// Assert
			expect(rules).toHaveLength(2);
			expect(rules[0]).toEqual({
				id: "emit-complete-signal",
				description: "Emit COMPLETE signal when done",
				required: true,
				verificationMethod: "signal",
				errorMessage: "Task must emit COMPLETE signal",
			});
		});

		it("throws RuleFileMissingError if file missing", () => {
			// Arrange - no file created

			// Act & Assert
			expect(() => loader.loadCompletionProtocol()).toThrow(
				"Missing rule file",
			);
			expect(() => loader.loadCompletionProtocol()).toThrow(
				"completion-protocol.md",
			);
			expect(() => loader.loadCompletionProtocol()).toThrow("chorus init");
		});
	});

	describe("loadAllRules()", () => {
		it("returns combined SharedRules object", () => {
			// Arrange - create minimal rule files
			fs.writeFileSync(
				path.join(rulesDir, "signal-types.md"),
				"# Signal Types\n\n## COMPLETE\n- **Description:** Done\n- **Payload Required:** false\n- **Example:** `<chorus>COMPLETE</chorus>`\n",
			);
			fs.writeFileSync(
				path.join(rulesDir, "learning-format.md"),
				"# Learning Format\n\n## local\n- **Description:** Local\n- **Category Prefix:** local\n- **Triggers Plan Review:** false\n- **Triggers Alert:** false\n- **Example:** test\n",
			);
			fs.writeFileSync(
				path.join(rulesDir, "commit-format.md"),
				"# Commit Format\n\n## feat\n- **Description:** Feature\n- **Scope Required:** false\n- **Breaking Change Marker:** false\n- **Format:** feat: desc\n- **Example:** feat: test\n",
			);
			fs.writeFileSync(
				path.join(rulesDir, "completion-protocol.md"),
				"# Completion Protocol\n\n## signal\n- **Description:** Signal\n- **Required:** true\n- **Verification Method:** signal\n- **Error Message:** Need signal\n",
			);

			// Act
			const rules = loader.loadAllRules();

			// Assert
			expect(rules.version).toBeDefined();
			expect(rules.signals).toHaveLength(1);
			expect(rules.learnings).toHaveLength(1);
			expect(rules.commits).toHaveLength(1);
			expect(rules.completion).toHaveLength(1);
		});
	});

	describe("caching", () => {
		it("caches loaded rules and returns same instance", () => {
			// Arrange
			fs.writeFileSync(
				path.join(rulesDir, "signal-types.md"),
				"# Signal Types\n\n## COMPLETE\n- **Description:** Done\n- **Payload Required:** false\n- **Example:** `<chorus>COMPLETE</chorus>`\n",
			);

			// Act
			const rules1 = loader.loadSignalTypes();
			const rules2 = loader.loadSignalTypes();

			// Assert
			expect(rules1).toBe(rules2);
		});

		it("clearCache() invalidates cache", () => {
			// Arrange
			fs.writeFileSync(
				path.join(rulesDir, "signal-types.md"),
				"# Signal Types\n\n## COMPLETE\n- **Description:** Done\n- **Payload Required:** false\n- **Example:** `<chorus>COMPLETE</chorus>`\n",
			);
			const rules1 = loader.loadSignalTypes();

			// Act
			loader.clearCache();
			// Modify file
			fs.writeFileSync(
				path.join(rulesDir, "signal-types.md"),
				"# Signal Types\n\n## BLOCKED\n- **Description:** Stuck\n- **Payload Required:** true\n- **Payload Format:** reason\n- **Example:** `<chorus>BLOCKED:x</chorus>`\n",
			);
			const rules2 = loader.loadSignalTypes();

			// Assert
			expect(rules1).not.toBe(rules2);
			expect(rules2[0]?.type).toBe("BLOCKED");
		});
	});
});
