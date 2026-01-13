import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RulesScaffold } from "./RulesScaffold.js";

describe("RulesScaffold", () => {
	let tempDir: string;
	let scaffold: RulesScaffold;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-scaffold-test-"));
		scaffold = new RulesScaffold(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("scaffoldRulesDir()", () => {
		it("creates .chorus/rules/ directory", () => {
			// Arrange
			const rulesDir = path.join(tempDir, ".chorus", "rules");
			expect(fs.existsSync(rulesDir)).toBe(false);

			// Act
			scaffold.scaffoldRulesDir();

			// Assert
			expect(fs.existsSync(rulesDir)).toBe(true);
		});
	});

	describe("scaffoldSignalTypes()", () => {
		it("creates signal-types.md with defaults", () => {
			// Arrange
			scaffold.scaffoldRulesDir();
			const filePath = path.join(
				tempDir,
				".chorus",
				"rules",
				"signal-types.md",
			);

			// Act
			scaffold.scaffoldSignalTypes();

			// Assert
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toContain("# Signal Types");
			expect(content).toContain("## COMPLETE");
			expect(content).toContain("## BLOCKED");
		});
	});

	describe("scaffoldLearningFormat()", () => {
		it("creates learning-format.md with defaults", () => {
			// Arrange
			scaffold.scaffoldRulesDir();
			const filePath = path.join(
				tempDir,
				".chorus",
				"rules",
				"learning-format.md",
			);

			// Act
			scaffold.scaffoldLearningFormat();

			// Assert
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toContain("# Learning Format");
			expect(content).toContain("## local");
			expect(content).toContain("## cross-cutting");
		});
	});

	describe("scaffoldCommitFormat()", () => {
		it("creates commit-format.md with defaults", () => {
			// Arrange
			scaffold.scaffoldRulesDir();
			const filePath = path.join(
				tempDir,
				".chorus",
				"rules",
				"commit-format.md",
			);

			// Act
			scaffold.scaffoldCommitFormat();

			// Assert
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toContain("# Commit Format");
			expect(content).toContain("## feat");
			expect(content).toContain("## fix");
		});
	});

	describe("scaffoldCompletionProtocol()", () => {
		it("creates completion-protocol.md with defaults", () => {
			// Arrange
			scaffold.scaffoldRulesDir();
			const filePath = path.join(
				tempDir,
				".chorus",
				"rules",
				"completion-protocol.md",
			);

			// Act
			scaffold.scaffoldCompletionProtocol();

			// Assert
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toContain("# Completion Protocol");
			expect(content).toContain("emit-complete-signal");
		});
	});

	describe("scaffoldAll()", () => {
		it("creates all rule files", () => {
			// Arrange
			const rulesDir = path.join(tempDir, ".chorus", "rules");

			// Act
			scaffold.scaffoldAll();

			// Assert
			expect(fs.existsSync(rulesDir)).toBe(true);
			expect(fs.existsSync(path.join(rulesDir, "signal-types.md"))).toBe(true);
			expect(fs.existsSync(path.join(rulesDir, "learning-format.md"))).toBe(
				true,
			);
			expect(fs.existsSync(path.join(rulesDir, "commit-format.md"))).toBe(true);
			expect(fs.existsSync(path.join(rulesDir, "completion-protocol.md"))).toBe(
				true,
			);
		});
	});

	describe("skip existing files", () => {
		it("does not overwrite existing files", () => {
			// Arrange
			scaffold.scaffoldRulesDir();
			const filePath = path.join(
				tempDir,
				".chorus",
				"rules",
				"signal-types.md",
			);
			const customContent = "# Custom Signal Types\n\nMy custom rules.";
			fs.writeFileSync(filePath, customContent);

			// Act
			scaffold.scaffoldSignalTypes();

			// Assert - should NOT be overwritten
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toBe(customContent);
		});
	});
});
