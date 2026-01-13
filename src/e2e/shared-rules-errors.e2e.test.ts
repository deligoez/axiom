/**
 * E2E Tests for Shared Rules Error Handling
 *
 * Tests the error handling behavior of RulesLoader:
 * - RuleFileMissingError is thrown when files missing (no fallback - by design)
 * - Malformed markdown gracefully returns partial/empty rules
 * - Error objects contain useful debugging information
 *
 * Note: The system deliberately does NOT use fallback defaults.
 * Instead, it throws RuleFileMissingError to guide users to run `chorus init`.
 * This is verified by no-hardcoded-prompts.test.ts.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RuleFileMissingError, RulesLoader } from "../services/RulesLoader.js";

describe("E2E: Shared Rules Error Handling", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-errors-e2e-"));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("throws RuleFileMissingError with guidance when signal-types.md missing", () => {
		// Arrange - rules directory exists but no files
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });
		const loader = new RulesLoader(tempDir);

		// Act & Assert - throws with helpful message
		try {
			loader.loadSignalTypes();
			expect.fail("Should have thrown RuleFileMissingError");
		} catch (error) {
			expect(error).toBeInstanceOf(RuleFileMissingError);
			const err = error as RuleFileMissingError;

			// Verify error contains useful debugging info
			expect(err.fileName).toBe("signal-types.md");
			expect(err.filePath).toContain("signal-types.md");
			expect(err.message).toContain("Missing rule file");
			expect(err.message).toContain("chorus init");
		}
	});

	it("gracefully handles malformed markdown - returns empty rules", () => {
		// Arrange - create rules with invalid markdown format (no ## sections)
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });

		// Invalid content - no ## sections, random text
		const invalidContent = `This is not valid markdown structure.
No sections here.
Just random text that doesn't match the expected format.
`;
		fs.writeFileSync(path.join(rulesDir, "signal-types.md"), invalidContent);
		fs.writeFileSync(path.join(rulesDir, "learning-format.md"), invalidContent);
		fs.writeFileSync(path.join(rulesDir, "commit-format.md"), invalidContent);
		fs.writeFileSync(
			path.join(rulesDir, "completion-protocol.md"),
			invalidContent,
		);

		const loader = new RulesLoader(tempDir);

		// Act - should not throw, but return empty arrays
		const signals = loader.loadSignalTypes();
		const learnings = loader.loadLearningFormat();
		const commits = loader.loadCommitFormat();
		const completion = loader.loadCompletionProtocol();

		// Assert - graceful degradation: empty arrays instead of crash
		expect(signals).toEqual([]);
		expect(learnings).toEqual([]);
		expect(commits).toEqual([]);
		expect(completion).toEqual([]);
	});

	it("gracefully handles partial markdown - returns what it can parse", () => {
		// Arrange - create rules with some valid sections, some incomplete
		const rulesDir = path.join(tempDir, ".chorus", "rules");
		fs.mkdirSync(rulesDir, { recursive: true });

		// Partial content - one valid section, one missing required fields
		const partialContent = `# Signal Types

## COMPLETE
- **Description:** Task is done
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`

## BROKEN
- **Description:** This is incomplete
`;
		// Note: BROKEN is missing Payload Required and Example fields
		fs.writeFileSync(path.join(rulesDir, "signal-types.md"), partialContent);
		// Create other files to avoid RuleFileMissingError
		fs.writeFileSync(
			path.join(rulesDir, "learning-format.md"),
			"# Learnings\n",
		);
		fs.writeFileSync(path.join(rulesDir, "commit-format.md"), "# Commits\n");
		fs.writeFileSync(
			path.join(rulesDir, "completion-protocol.md"),
			"# Completion\n",
		);

		const loader = new RulesLoader(tempDir);

		// Act
		const signals = loader.loadSignalTypes();

		// Assert - parses both sections (partial data is allowed)
		expect(signals).toHaveLength(2);
		expect(signals[0].type).toBe("COMPLETE");
		expect(signals[0].description).toBe("Task is done");
		expect(signals[0].payloadRequired).toBe(false);
		expect(signals[0].example).toBe("<chorus>COMPLETE</chorus>");

		// BROKEN section has partial data
		expect(signals[1].type).toBe("BROKEN");
		expect(signals[1].description).toBe("This is incomplete");
		expect(signals[1].payloadRequired).toBe(false); // default for missing field
		expect(signals[1].example).toBe(""); // default for missing field
	});
});
