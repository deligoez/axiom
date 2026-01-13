import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SageAnalysisResult } from "../types/sage.js";
import { SagePromptBuilder } from "./SagePromptBuilder.js";

describe("SagePromptBuilder", () => {
	let tempDir: string;
	let builder: SagePromptBuilder;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sage-prompt-test-"));
		builder = new SagePromptBuilder(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("buildAnalysisPrompt()", () => {
		it("creates prompt for Claude with partial analysis result", () => {
			// Arrange
			const partialResult: Partial<SageAnalysisResult> = {
				projectType: "unknown",
				projectStructure: {
					rootPath: tempDir,
					sourceDirectories: ["src"],
					testDirectories: ["tests"],
					configFiles: ["package.json", "tsconfig.json"],
					packageManagers: ["npm"],
					entryPoints: [],
				},
				detectedFrameworks: [],
				suggestedQualityCommands: [],
				confidence: 0.5,
			};

			// Act
			const prompt = builder.buildAnalysisPrompt(partialResult);

			// Assert
			expect(prompt).toContain("src");
			expect(prompt).toContain("tests");
			expect(prompt).toContain("package.json");
		});

		it("loads Sage persona from .chorus/agents/sage/prompt.md", () => {
			// Arrange
			const agentsDir = path.join(tempDir, ".chorus", "agents", "sage");
			fs.mkdirSync(agentsDir, { recursive: true });
			fs.writeFileSync(
				path.join(agentsDir, "prompt.md"),
				"# Sage Agent\nYou are Sage, the project analyzer.",
			);

			const partialResult: Partial<SageAnalysisResult> = {
				projectType: "unknown",
				projectStructure: {
					rootPath: tempDir,
					sourceDirectories: [],
					testDirectories: [],
					configFiles: [],
					packageManagers: [],
					entryPoints: [],
				},
			};

			// Act
			const prompt = builder.buildAnalysisPrompt(partialResult);

			// Assert
			expect(prompt).toContain("Sage Agent");
			expect(prompt).toContain("project analyzer");
		});

		it("includes codebase structure summary in prompt", () => {
			// Arrange
			const partialResult: Partial<SageAnalysisResult> = {
				projectType: "unknown",
				projectStructure: {
					rootPath: tempDir,
					sourceDirectories: ["src", "lib"],
					testDirectories: ["tests"],
					configFiles: ["package.json", "tsconfig.json", "biome.json"],
					packageManagers: ["npm"],
					entryPoints: ["src/index.ts"],
				},
			};

			// Act
			const prompt = builder.buildAnalysisPrompt(partialResult);

			// Assert
			expect(prompt).toContain("src");
			expect(prompt).toContain("lib");
			expect(prompt).toContain("tsconfig.json");
			expect(prompt).toContain("biome.json");
		});

		it("asks specific questions about unclear patterns", () => {
			// Arrange
			const partialResult: Partial<SageAnalysisResult> = {
				projectType: "unknown",
				confidence: 0.4,
			};

			// Act
			const prompt = builder.buildAnalysisPrompt(partialResult);

			// Assert
			expect(prompt).toContain("?"); // Questions should have question marks
			expect(prompt.toLowerCase()).toMatch(/what|which|how|type|framework/);
		});

		it("returns structured format for parsing", () => {
			// Arrange
			const partialResult: Partial<SageAnalysisResult> = {
				projectType: "unknown",
			};

			// Act
			const prompt = builder.buildAnalysisPrompt(partialResult);

			// Assert
			expect(prompt).toContain("JSON");
			expect(prompt).toContain("projectType");
		});
	});
});
