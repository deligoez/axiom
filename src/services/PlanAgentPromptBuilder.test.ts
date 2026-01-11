import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type ChorusConfig, getDefaultConfig } from "../types/config.js";
import { PlanAgentPromptBuilder } from "./PlanAgentPromptBuilder.js";

describe("PlanAgentPromptBuilder", () => {
	let tempDir: string;
	let config: ChorusConfig;
	let builder: PlanAgentPromptBuilder;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-prompt-builder-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		mkdirSync(join(tempDir, ".chorus"), { recursive: true });
		config = getDefaultConfig();
		builder = new PlanAgentPromptBuilder(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("build()", () => {
		it("returns a string containing system prompt", () => {
			// Arrange & Act
			const prompt = builder.build(config);

			// Assert
			expect(typeof prompt).toBe("string");
			expect(prompt.length).toBeGreaterThan(0);
		});

		it("includes core task rules (atomic, testable, right-sized)", () => {
			// Arrange & Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("atomic");
			expect(prompt).toContain("testable");
			expect(prompt).toContain("right-sized");
		});

		it("includes quality commands from config", () => {
			// Arrange
			config.qualityCommands = [
				{ name: "test", command: "npm test", required: true, order: 1 },
				{ name: "lint", command: "npm run lint", required: true, order: 2 },
			];

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("npm test");
			expect(prompt).toContain("npm run lint");
		});

		it("includes project type context", () => {
			// Arrange
			config.project.type = "node";

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("node");
		});

		it("includes patterns from PATTERNS.md via PatternsManager", () => {
			// Arrange
			const patternsContent = `# Patterns

## Architecture
- Use dependency injection
- Prefer composition over inheritance

## Testing
- Always use AAA pattern
`;
			writeFileSync(join(tempDir, ".chorus", "PATTERNS.md"), patternsContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("Use dependency injection");
			expect(prompt).toContain("Always use AAA pattern");
		});

		it("handles missing PATTERNS.md gracefully", () => {
			// Arrange - no PATTERNS.md file

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toBeDefined();
			expect(prompt.length).toBeGreaterThan(0);
		});

		it("returns valid markdown format", () => {
			// Arrange & Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("#"); // Has headers
		});
	});

	describe("task-rules.md parsing", () => {
		it("parses max_acceptance_criteria limit", () => {
			// Arrange
			const rulesContent = `# Task Validation Rules

## Configuration
- max_acceptance_criteria: 10
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("10");
		});

		it("parses max_description_length limit", () => {
			// Arrange
			const rulesContent = `# Task Validation Rules

## Configuration
- max_description_length: 500
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("500");
		});

		it("parses require_test_file rule", () => {
			// Arrange
			const rulesContent = `# Task Validation Rules

## Configuration
- [x] require_test_file
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("test file");
		});

		it("parses enforce_naming rule", () => {
			// Arrange
			const rulesContent = `# Task Validation Rules

## Configuration
- [x] enforce_naming: F\\d+
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toMatch(/naming|F\\d\+/);
		});

		it("parses forbidden_words rule", () => {
			// Arrange
			const rulesContent = `# Task Validation Rules

## Configuration
- forbidden_words: works correctly, handles properly
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("works correctly");
		});

		it("handles missing task-rules.md gracefully (uses defaults)", () => {
			// Arrange - no task-rules.md file

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toBeDefined();
			expect(prompt).toContain("atomic"); // Default rules still present
		});

		it("includes default limits when no custom limits configured", () => {
			// Arrange - empty task-rules.md with no config values
			const rulesContent = `# Task Validation Rules

## Required Fields
- Task ID must follow format
`;
			writeFileSync(join(tempDir, ".chorus", "task-rules.md"), rulesContent);

			// Act
			const prompt = builder.build(config);

			// Assert
			expect(prompt).toContain("15"); // Default max acceptance criteria
			expect(prompt).toContain("1000"); // Default max description length
		});
	});
});
