import { describe, expect, it } from "vitest";
import { ConflictClassifier, type ConflictInfo } from "./ConflictClassifier.js";

describe("ConflictClassifier", () => {
	const classifier = new ConflictClassifier();

	// F26: classifyFile() - 5 tests
	describe("classifyFile()", () => {
		it(".chorus/tasks.jsonl classified as SIMPLE", () => {
			// Arrange
			const file = ".chorus/tasks.jsonl";

			// Act
			const result = classifier.classifyFile(file);

			// Assert
			expect(result).toBe("SIMPLE");
		});

		it("package-lock.json classified as SIMPLE", () => {
			// Arrange
			const file = "package-lock.json";

			// Act
			const result = classifier.classifyFile(file);

			// Assert
			expect(result).toBe("SIMPLE");
		});

		it("same file different sections classified as MEDIUM", () => {
			// Arrange
			const file = "src/utils/helpers.ts";
			const conflictInfo: ConflictInfo = {
				file,
				ourChanges: { startLine: 10, endLine: 20 },
				theirChanges: { startLine: 50, endLine: 60 },
			};

			// Act
			const result = classifier.classifyFile(file, conflictInfo);

			// Assert
			expect(result).toBe("MEDIUM");
		});

		it("same lines edited classified as COMPLEX", () => {
			// Arrange
			const file = "src/core/engine.ts";
			const conflictInfo: ConflictInfo = {
				file,
				ourChanges: { startLine: 10, endLine: 25 },
				theirChanges: { startLine: 15, endLine: 30 },
			};

			// Act
			const result = classifier.classifyFile(file, conflictInfo);

			// Assert
			expect(result).toBe("COMPLEX");
		});

		it("core files with semantic conflicts classified as COMPLEX", () => {
			// Arrange
			const file = "src/core/state.ts";
			const conflictInfo: ConflictInfo = {
				file,
				ourChanges: { startLine: 1, endLine: 10 },
				theirChanges: { startLine: 100, endLine: 110 },
				hasSemanticConflict: true,
			};

			// Act
			const result = classifier.classifyFile(file, conflictInfo);

			// Assert
			expect(result).toBe("COMPLEX");
		});
	});

	// F26: analyze() - 2 tests
	describe("analyze()", () => {
		it("analyzes all given conflict files", () => {
			// Arrange
			const files = ["package-lock.json", "src/index.ts", "src/app.ts"];

			// Act
			const result = classifier.analyze(files);

			// Assert
			expect(result.files.length).toBe(3);
			expect(result.files.map((f) => f.file)).toEqual(files);
		});

		it("returns overall type as worst-case (COMPLEX > MEDIUM > SIMPLE)", () => {
			// Arrange
			const files = [
				"package-lock.json",
				"src/utils/helpers.ts",
				"src/core/engine.ts",
			];
			const conflictInfos: ConflictInfo[] = [
				{ file: "package-lock.json" }, // SIMPLE
				{
					file: "src/utils/helpers.ts",
					ourChanges: { startLine: 10, endLine: 20 },
					theirChanges: { startLine: 50, endLine: 60 },
				}, // MEDIUM
				{
					file: "src/core/engine.ts",
					ourChanges: { startLine: 10, endLine: 25 },
					theirChanges: { startLine: 15, endLine: 30 },
				}, // COMPLEX - overlapping
			];

			// Act
			const result = classifier.analyze(files, conflictInfos);

			// Assert
			expect(result.overallType).toBe("COMPLEX");
		});
	});

	// F26: getSuggestedStrategy() - 4 tests
	describe("getSuggestedStrategy()", () => {
		it("returns 'auto' for SIMPLE", () => {
			// Arrange
			const type = "SIMPLE" as const;

			// Act
			const result = classifier.getSuggestedStrategy(type);

			// Assert
			expect(result).toBe("auto");
		});

		it("returns 'rebase' for MEDIUM", () => {
			// Arrange
			const type = "MEDIUM" as const;

			// Act
			const result = classifier.getSuggestedStrategy(type);

			// Assert
			expect(result).toBe("rebase");
		});

		it("returns 'agent' for COMPLEX", () => {
			// Arrange
			const type = "COMPLEX" as const;

			// Act
			const result = classifier.getSuggestedStrategy(type);

			// Assert
			expect(result).toBe("agent");
		});

		it("returns 'human' when agent fails COMPLEX", () => {
			// Arrange
			const type = "COMPLEX" as const;
			const agentFailed = true;

			// Act
			const result = classifier.getSuggestedStrategy(type, agentFailed);

			// Assert
			expect(result).toBe("human");
		});
	});
});
