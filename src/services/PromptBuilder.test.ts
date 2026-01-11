import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bead } from "../types/bead.js";
import type { ChorusConfig } from "../types/config.js";
import { getDefaultConfig } from "../types/config.js";
import { PromptBuilder } from "./PromptBuilder.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
}));

const mockReadFile = vi.mocked(fs.readFile);

describe("PromptBuilder", () => {
	let builder: PromptBuilder;
	let mockConfig: ChorusConfig;
	let mockTask: Bead;

	beforeEach(() => {
		vi.clearAllMocks();
		builder = new PromptBuilder();
		mockConfig = getDefaultConfig();
		mockTask = {
			id: "ch-abc",
			title: "Test task title",
			description: "## Acceptance Criteria\n- [ ] Test passes",
			status: "in_progress",
			priority: 1,
			type: "task",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};
	});

	// F07: build() - Main Entry (5 tests)
	describe("build()", () => {
		it("returns string containing task title from context.task.title", async () => {
			// Arrange
			mockReadFile.mockRejectedValue({ code: "ENOENT" }); // No PATTERNS.md
			const context = {
				task: mockTask,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			expect(result).toContain("Test task title");
		});

		it("returns string containing context.branch value", async () => {
			// Arrange
			mockReadFile.mockRejectedValue({ code: "ENOENT" });
			const context = {
				task: mockTask,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			expect(result).toContain("agent/claude/ch-abc");
		});

		it("output contains sections in order: task → quality commands → patterns → commit rules → learnings format → completion protocol", async () => {
			// Arrange
			mockReadFile.mockResolvedValue("# Patterns\n- Use TypeScript");
			const context = {
				task: mockTask,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			const taskIndex = result.indexOf("# Task:");
			const qualityIndex = result.indexOf("## Quality Commands");
			const patternsIndex = result.indexOf("## Patterns");
			const commitIndex = result.indexOf("## Commit Message Rules");
			const learningsIndex = result.indexOf("## Learnings Format");
			const completionIndex = result.indexOf("## Completion Protocol");

			expect(taskIndex).toBeLessThan(qualityIndex);
			expect(qualityIndex).toBeLessThan(patternsIndex);
			expect(patternsIndex).toBeLessThan(commitIndex);
			expect(commitIndex).toBeLessThan(learningsIndex);
			expect(learningsIndex).toBeLessThan(completionIndex);
		});

		it("handles task without body (returns prompt with title only)", async () => {
			// Arrange
			mockReadFile.mockRejectedValue({ code: "ENOENT" });
			const taskWithoutBody: Bead = {
				...mockTask,
				description: undefined,
			};
			const context = {
				task: taskWithoutBody,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			expect(result).toContain("Test task title");
			expect(result).not.toContain("undefined");
		});

		it("includes quality commands as numbered list", async () => {
			// Arrange
			mockReadFile.mockRejectedValue({ code: "ENOENT" });
			mockConfig.qualityCommands = [
				{ name: "test", command: "npm test", required: true, order: 1 },
				{ name: "lint", command: "npm run lint", required: false, order: 2 },
			];
			const context = {
				task: mockTask,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			expect(result).toContain("1.");
			expect(result).toContain("npm test");
			expect(result).toContain("2.");
			expect(result).toContain("npm run lint");
		});
	});

	// F07: buildTaskSection() - 2 tests
	describe("buildTaskSection()", () => {
		it("returns string containing task.title", () => {
			// Arrange & Act
			const result = builder.buildTaskSection(mockTask);

			// Assert
			expect(result).toContain("Test task title");
		});

		it("returns string containing task.description (acceptance criteria)", () => {
			// Arrange & Act
			const result = builder.buildTaskSection(mockTask);

			// Assert
			expect(result).toContain("## Acceptance Criteria");
			expect(result).toContain("- [ ] Test passes");
		});
	});

	// F07: buildQualityCommandsSection() - 3 tests
	describe("buildQualityCommandsSection()", () => {
		it("returns numbered list of quality commands", () => {
			// Arrange
			mockConfig.qualityCommands = [
				{ name: "test", command: "npm test", required: true, order: 1 },
				{ name: "lint", command: "npm run lint", required: false, order: 2 },
			];

			// Act
			const result = builder.buildQualityCommandsSection(mockConfig);

			// Assert
			expect(result).toContain("1. `npm test`");
			expect(result).toContain("2. `npm run lint`");
		});

		it("marks required vs optional commands", () => {
			// Arrange
			mockConfig.qualityCommands = [
				{ name: "test", command: "npm test", required: true, order: 1 },
				{ name: "lint", command: "npm run lint", required: false, order: 2 },
			];

			// Act
			const result = builder.buildQualityCommandsSection(mockConfig);

			// Assert
			expect(result).toContain("(required)");
			expect(result).toContain("(optional)");
		});

		it("returns empty string if no quality commands configured", () => {
			// Arrange
			mockConfig.qualityCommands = [];

			// Act
			const result = builder.buildQualityCommandsSection(mockConfig);

			// Assert
			expect(result).toBe("");
		});
	});

	// F07: buildCommitRulesSection() - 2 tests
	describe("buildCommitRulesSection()", () => {
		it('returns string containing "[ch-abc]"', () => {
			// Arrange & Act
			const result = builder.buildCommitRulesSection("ch-abc");

			// Assert
			expect(result).toContain("[ch-abc]");
		});

		it('returns string containing "Commit Message Rules"', () => {
			// Arrange & Act
			const result = builder.buildCommitRulesSection("ch-abc");

			// Assert
			expect(result).toContain("Commit Message Rules");
		});
	});

	// F07: buildLearningsFormatSection() - 2 tests
	describe("buildLearningsFormatSection()", () => {
		it("returns string explaining [LOCAL], [CROSS-CUTTING], [ARCHITECTURAL] prefixes", () => {
			// Arrange & Act
			const result = builder.buildLearningsFormatSection();

			// Assert
			expect(result).toContain("[LOCAL]");
			expect(result).toContain("[CROSS-CUTTING]");
			expect(result).toContain("[ARCHITECTURAL]");
		});

		it("includes when to use each scope", () => {
			// Arrange & Act
			const result = builder.buildLearningsFormatSection();

			// Assert
			expect(result).toContain("Only affects this task");
			expect(result).toContain("multiple features");
			expect(result).toContain("design decision");
		});
	});

	// F07: buildCompletionSection() - 3 tests
	describe("buildCompletionSection()", () => {
		it('returns string containing "<chorus>"', () => {
			// Arrange & Act
			const result = builder.buildCompletionSection(mockConfig);

			// Assert
			expect(result).toContain("<chorus>");
		});

		it("returns string containing signal format instructions", () => {
			// Arrange & Act
			const result = builder.buildCompletionSection(mockConfig);

			// Assert
			expect(result).toContain("COMPLETE");
			expect(result).toContain("BLOCKED");
			expect(result).toContain("NEEDS_HELP");
		});

		it('includes "quality commands must pass" when qualityCommands configured', () => {
			// Arrange
			mockConfig.qualityCommands = [
				{ name: "test", command: "npm test", required: true, order: 1 },
			];

			// Act
			const result = builder.buildCompletionSection(mockConfig);

			// Assert
			expect(result).toContain("quality commands");
		});
	});

	// F07: loadPatterns() - 3 tests
	describe("loadPatterns()", () => {
		it("reads and returns content from .chorus/PATTERNS.md", async () => {
			// Arrange
			mockReadFile.mockResolvedValue(
				"# Patterns\n- Use TypeScript strict mode",
			);

			// Act
			const result = await builder.loadPatterns("/test/project");

			// Assert
			expect(result).toContain("# Patterns");
			expect(result).toContain("Use TypeScript strict mode");
		});

		it("returns empty string if PATTERNS.md doesn't exist", async () => {
			// Arrange
			mockReadFile.mockRejectedValue({ code: "ENOENT" });

			// Act
			const result = await builder.loadPatterns("/test/project");

			// Assert
			expect(result).toBe("");
		});

		it("build() includes patterns section when PATTERNS.md has content", async () => {
			// Arrange
			mockReadFile.mockResolvedValue("# Patterns\n- Use dependency injection");
			const context = {
				task: mockTask,
				branch: "agent/claude/ch-abc",
				taskId: "ch-abc",
				config: mockConfig,
				projectDir: "/test/project",
			};

			// Act
			const result = await builder.build(context);

			// Assert
			expect(result).toContain("## Patterns");
			expect(result).toContain("Use dependency injection");
		});
	});
});
