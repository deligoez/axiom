import { describe, expect, it } from "vitest";
import {
	validateAllRules,
	validateCommitFormat,
	validateCompletionProtocol,
	validateLearningFormat,
	validateSignalTypes,
} from "./RulesValidator.js";

describe("RulesValidator", () => {
	describe("validateSignalTypes()", () => {
		it("returns valid for correct signal-types.md content", () => {
			// Arrange
			const content = `# Signal Types

## COMPLETE
- **Description:** Task completed successfully
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`

## BLOCKED
- **Description:** Cannot proceed due to blocker
- **Payload Required:** true
- **Payload Format:** Reason for blockage
- **Example:** \`<chorus>BLOCKED:Missing dependency</chorus>\`
`;

			// Act
			const result = validateSignalTypes(content);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("returns errors for missing required fields", () => {
			// Arrange
			const content = `# Signal Types

## COMPLETE
- **Description:** Task completed
`;

			// Act
			const result = validateSignalTypes(content);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.includes("Payload Required"))).toBe(
				true,
			);
		});
	});

	describe("validateLearningFormat()", () => {
		it("returns valid for correct learning-format.md content", () => {
			// Arrange
			const content = `# Learning Format

## local
- **Description:** Only affects this task
- **Category Prefix:** local
- **Triggers Plan Review:** false
- **Triggers Alert:** false
- **Example:** "This function needs null check"
`;

			// Act
			const result = validateLearningFormat(content);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("validateCommitFormat()", () => {
		it("returns valid for correct commit-format.md content", () => {
			// Arrange
			const content = `# Commit Format

## feat
- **Description:** New feature
- **Scope Required:** false
- **Breaking Change Marker:** true
- **Format:** feat: description [task-id]
- **Example:** feat: add user authentication [ch-123]
`;

			// Act
			const result = validateCommitFormat(content);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("validateCompletionProtocol()", () => {
		it("returns valid for correct completion-protocol.md content", () => {
			// Arrange
			const content = `# Completion Protocol

## emit-complete-signal
- **Description:** Emit COMPLETE signal when done
- **Required:** true
- **Verification Method:** signal
- **Error Message:** Task must emit COMPLETE signal
`;

			// Act
			const result = validateCompletionProtocol(content);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("validateAll()", () => {
		it("returns combined validation results for all rule files", () => {
			// Arrange
			const files = {
				signalTypes: `# Signal Types

## COMPLETE
- **Description:** Done
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`
`,
				learningFormat: `# Learning Format

## local
- **Description:** Local only
- **Category Prefix:** local
- **Triggers Plan Review:** false
- **Triggers Alert:** false
- **Example:** "Test"
`,
				commitFormat: `# Commit Format

## feat
- **Description:** Feature
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** feat: desc
- **Example:** feat: test
`,
				completionProtocol: `# Completion Protocol

## signal
- **Description:** Signal check
- **Required:** true
- **Verification Method:** signal
- **Error Message:** Need signal
`,
			};

			// Act
			const result = validateAllRules(files);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.signalTypes.valid).toBe(true);
			expect(result.learningFormat.valid).toBe(true);
			expect(result.commitFormat.valid).toBe(true);
			expect(result.completionProtocol.valid).toBe(true);
		});
	});
});
