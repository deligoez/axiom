import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentLearningsService } from "./AgentLearningsService.js";

describe("AgentLearningsService", () => {
	let projectDir: string;
	let service: AgentLearningsService;

	beforeEach(() => {
		projectDir = join(
			process.cwd(),
			"test-fixtures",
			`learnings-${Date.now()}`,
		);
		mkdirSync(projectDir, { recursive: true });
		service = new AgentLearningsService(projectDir);
	});

	afterEach(() => {
		rmSync(projectDir, { recursive: true, force: true });
	});

	describe("load()", () => {
		it("returns empty learnings if file does not exist", () => {
			// Arrange
			const persona = "chip";

			// Act
			const learnings = service.load(persona);

			// Assert
			expect(learnings).toEqual({});
		});

		it("reads existing learnings from file", () => {
			// Arrange
			const persona = "sage";
			const learningsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"learnings.md",
			);
			mkdirSync(join(projectDir, ".chorus", "agents", persona), {
				recursive: true,
			});
			writeFileSync(
				learningsPath,
				`# Sage's Learnings

## Testing Patterns
- [2026-01-13] Use AAA pattern for tests

## TDD Workflow
- [2026-01-13] Run quality before commit
`,
			);

			// Act
			const learnings = service.load(persona);

			// Assert
			expect(learnings["Testing Patterns"]).toHaveLength(1);
			expect(learnings["Testing Patterns"][0]).toContain("Use AAA pattern");
			expect(learnings["TDD Workflow"]).toHaveLength(1);
		});
	});

	describe("add()", () => {
		it("adds learning with date prefix", () => {
			// Arrange
			const persona = "chip";
			const category = "Testing";
			const learning = "Vitest is faster than Jest";

			// Act
			service.add(persona, category, learning);

			// Assert
			const learningsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"learnings.md",
			);
			const content = readFileSync(learningsPath, "utf-8");
			expect(content).toContain("## Testing");
			expect(content).toMatch(/- \[\d{4}-\d{2}-\d{2}\] Vitest is faster/);
		});

		it("creates category header if not exists", () => {
			// Arrange
			const persona = "chip";

			// Act
			service.add(persona, "New Category", "First learning");
			service.add(persona, "New Category", "Second learning");

			// Assert
			const learningsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"learnings.md",
			);
			const content = readFileSync(learningsPath, "utf-8");
			const categoryMatches = content.match(/## New Category/g);
			expect(categoryMatches).toHaveLength(1);
		});

		it("deduplicates learnings per agent", () => {
			// Arrange
			const persona = "chip";
			const category = "Testing";
			const learning = "Duplicate learning";

			// Act
			service.add(persona, category, learning);
			service.add(persona, category, learning);
			service.add(persona, category, "  Duplicate learning  "); // With whitespace

			// Assert
			const learnings = service.load(persona);
			expect(learnings["Testing"]).toHaveLength(1);
		});

		it("creates directory if not exists", () => {
			// Arrange
			const persona = "scout";

			// Act
			service.add(persona, "Exploration", "Found interesting pattern");

			// Assert
			const learningsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"learnings.md",
			);
			const content = readFileSync(learningsPath, "utf-8");
			expect(content).toContain("## Exploration");
		});
	});

	describe("getByCategory()", () => {
		it("returns learnings for specific category", () => {
			// Arrange
			const persona = "chip";
			service.add(persona, "Category A", "Learning A1");
			service.add(persona, "Category A", "Learning A2");
			service.add(persona, "Category B", "Learning B1");

			// Act
			const categoryA = service.getByCategory(persona, "Category A");

			// Assert
			expect(categoryA).toHaveLength(2);
			expect(categoryA[0]).toContain("Learning A1");
			expect(categoryA[1]).toContain("Learning A2");
		});

		it("returns empty array for non-existent category", () => {
			// Arrange
			const persona = "chip";
			service.add(persona, "Existing", "Some learning");

			// Act
			const result = service.getByCategory(persona, "Non-existent");

			// Assert
			expect(result).toEqual([]);
		});
	});
});
