import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ConflictClassifier,
	type ConflictType,
} from "../services/ConflictClassifier.js";
import {
	ResolverAgent,
	type ResolverConfig,
} from "../services/ResolverAgent.js";

describe("E2E: Merge Conflict Resolver Agent", () => {
	let classifier: ConflictClassifier;

	beforeEach(() => {
		classifier = new ConflictClassifier();
	});

	describe("Conflict Classification", () => {
		it("classifies SIMPLE files correctly", () => {
			// Arrange - simple files
			const simpleFiles = [
				".beads/issues.jsonl",
				"package-lock.json",
				"yarn.lock",
			];

			// Act
			const results = simpleFiles.map((file) => classifier.classifyFile(file));

			// Assert
			expect(results).toEqual(["SIMPLE", "SIMPLE", "SIMPLE"]);
		});

		it("classifies MEDIUM files correctly", () => {
			// Arrange - source files with no conflict info
			const mediumFiles = ["src/app.ts", "src/utils.js"];

			// Act
			const results = mediumFiles.map((file) => classifier.classifyFile(file));

			// Assert
			expect(results).toEqual(["MEDIUM", "MEDIUM"]);
		});

		it("classifies COMPLEX files with semantic conflicts", () => {
			// Arrange - file with semantic conflict
			const file = "src/service.ts";
			const conflictInfo = {
				file,
				hasSemanticConflict: true,
			};

			// Act
			const result = classifier.classifyFile(file, conflictInfo);

			// Assert
			expect(result).toBe("COMPLEX");
		});

		it("analyzes multiple files and returns overall type", () => {
			// Arrange
			const files = ["package-lock.json", "src/app.ts", "src/complex.ts"];
			const conflictInfos = [
				{ file: "package-lock.json" },
				{ file: "src/app.ts" },
				{ file: "src/complex.ts", hasSemanticConflict: true },
			];

			// Act
			const result = classifier.analyze(files, conflictInfos);

			// Assert
			expect(result.overallType).toBe("COMPLEX");
			expect(result.files).toHaveLength(3);
		});
	});

	describe("Resolution Strategy", () => {
		it("suggests auto resolution for SIMPLE conflicts", () => {
			// Arrange
			const type: ConflictType = "SIMPLE";

			// Act
			const strategy = classifier.getSuggestedStrategy(type);

			// Assert
			expect(strategy).toBe("auto");
		});

		it("suggests rebase for MEDIUM conflicts", () => {
			// Arrange
			const type: ConflictType = "MEDIUM";

			// Act
			const strategy = classifier.getSuggestedStrategy(type);

			// Assert
			expect(strategy).toBe("rebase");
		});

		it("suggests agent for COMPLEX conflicts", () => {
			// Arrange
			const type: ConflictType = "COMPLEX";

			// Act
			const strategy = classifier.getSuggestedStrategy(type);

			// Assert
			expect(strategy).toBe("agent");
		});

		it("escalates to human if agent failed", () => {
			// Arrange
			const type: ConflictType = "COMPLEX";

			// Act
			const strategy = classifier.getSuggestedStrategy(type, true);

			// Assert
			expect(strategy).toBe("human");
		});
	});

	describe("Resolver Agent", () => {
		it("builds prompt with conflict details", () => {
			// Arrange
			const config: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: ["npm test"],
			};
			const mockSpawner = { spawn: vi.fn(), kill: vi.fn() };
			const mockQualityRunner = { run: vi.fn() };
			const mockFileReader = { read: vi.fn() };

			const resolver = new ResolverAgent(
				mockSpawner as any,
				config,
				mockQualityRunner,
				mockFileReader,
			);

			// Act
			const prompt = resolver.buildPrompt({
				files: ["src/app.ts", "src/utils.ts"],
				type: "MEDIUM",
				description: "Conflicting changes in utility functions",
				cwd: "/tmp/repo",
			});

			// Assert
			expect(prompt).toContain("merge conflict");
			expect(prompt).toContain("src/app.ts");
			expect(prompt).toContain("src/utils.ts");
			expect(prompt).toContain("Conflicting changes in utility functions");
		});

		it("verifies resolution by checking for conflict markers", async () => {
			// Arrange
			const config: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: ["npm test"],
			};
			const mockSpawner = { spawn: vi.fn(), kill: vi.fn() };
			const mockQualityRunner = { run: vi.fn() };
			const mockFileReader = {
				read: vi.fn().mockResolvedValue("clean file content"),
			};

			const resolver = new ResolverAgent(
				mockSpawner as any,
				config,
				mockQualityRunner,
				mockFileReader,
			);

			// Act
			const isResolved = await resolver.verifyResolution("src/app.ts");

			// Assert
			expect(isResolved).toBe(true);
		});

		it("detects unresolved files with conflict markers", async () => {
			// Arrange
			const config: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: ["npm test"],
			};
			const mockSpawner = { spawn: vi.fn(), kill: vi.fn() };
			const mockQualityRunner = { run: vi.fn() };
			const mockFileReader = {
				read: vi.fn().mockResolvedValue(`
					const x = 1;
					<<<<<<< HEAD
					const y = 2;
					=======
					const y = 3;
					>>>>>>> feature
				`),
			};

			const resolver = new ResolverAgent(
				mockSpawner as any,
				config,
				mockQualityRunner,
				mockFileReader,
			);

			// Act
			const isResolved = await resolver.verifyResolution("src/app.ts");

			// Assert
			expect(isResolved).toBe(false);
		});
	});
});
