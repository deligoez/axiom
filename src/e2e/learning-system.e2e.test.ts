import { mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LearningCategorizer } from "../services/LearningCategorizer.js";
import { LearningExtractor } from "../services/LearningExtractor.js";
import { LearningStore } from "../services/LearningStore.js";

describe("E2E: Learning System Integration", () => {
	let testDir: string;
	let store: LearningStore;
	let extractor: LearningExtractor;
	let categorizer: LearningCategorizer;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "chorus-learning-e2e-"));
		mkdirSync(join(testDir, ".claude", "rules"), { recursive: true });
		store = new LearningStore(testDir);
		extractor = new LearningExtractor();
		categorizer = new LearningCategorizer();
	});

	afterEach(async () => {
		try {
			await rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Learning Extraction", () => {
		it("should parse [LOCAL] markers correctly", () => {
			// Arrange
			const content = `### Debugging
- [LOCAL] This function needs better error handling`;

			// Act
			const learnings = extractor.parse(content, "ch-001", "claude");

			// Assert
			expect(learnings).toHaveLength(1);
			expect(learnings[0].scope).toBe("local");
			expect(learnings[0].content).toContain("error handling");
		});

		it("should parse [CROSS-CUTTING] markers correctly", () => {
			// Arrange
			const content = `### Patterns
- [CROSS-CUTTING] All API endpoints should validate input`;

			// Act
			const learnings = extractor.parse(content, "ch-002", "claude");

			// Assert
			expect(learnings).toHaveLength(1);
			expect(learnings[0].scope).toBe("cross-cutting");
		});

		it("should parse [ARCHITECTURAL] markers correctly", () => {
			// Arrange
			const content = `### Design
- [ARCHITECTURAL] Use event sourcing for state management`;

			// Act
			const learnings = extractor.parse(content, "ch-003", "claude");

			// Assert
			expect(learnings).toHaveLength(1);
			expect(learnings[0].scope).toBe("architectural");
		});
	});

	describe("Learning Storage", () => {
		it("should save learnings with task context", async () => {
			// Arrange
			const content = `### Testing
- [LOCAL] Always mock external services in unit tests`;
			const learnings = extractor.parse(content, "ch-004", "claude");

			// Act
			const result = await store.append(learnings);

			// Assert
			expect(result.added).toHaveLength(1);
			expect(result.added[0].source.taskId).toBe("ch-004");
			expect(result.added[0].source.agentType).toBe("claude");
		});

		it("should persist learnings across sessions", async () => {
			// Arrange
			const content = `### Performance
- [LOCAL] Cache database queries for better performance`;
			const learnings = extractor.parse(content, "ch-005", "claude");
			await store.append(learnings);

			// Act - create a new store instance (simulating new session)
			const newStore = new LearningStore(testDir);
			const retrieved = await newStore.readAll();

			// Assert
			expect(retrieved.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Learning Categorization", () => {
		it("should categorize using heuristics when no explicit marker", () => {
			// Arrange
			const text = "All modules should follow this pattern";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("cross-cutting");
			expect(result.confidence).toBe("heuristic");
		});
	});

	describe("Plan Review Trigger", () => {
		it("should flag cross-cutting learnings for plan review", () => {
			// Arrange
			const content = `### API
- [CROSS-CUTTING] All endpoints need rate limiting
- [LOCAL] This endpoint needs caching`;
			const learnings = extractor.parse(content, "ch-006", "claude");

			// Act
			const requiresReview = extractor.requiresPlanReview(learnings);

			// Assert
			expect(requiresReview).toBe(true);
		});
	});

	describe("Learning Search", () => {
		it("should retrieve learnings by category from extractor", () => {
			// Arrange - category is determined at extraction time
			const content = `### Testing
- [LOCAL] Use AAA pattern in all tests
### Performance
- [LOCAL] Profile before optimizing`;

			// Act
			const learnings = extractor.parse(content, "ch-007", "claude");

			// Assert - verify categories were set during extraction
			const testingLearnings = learnings.filter(
				(l) => l.category === "testing",
			);
			expect(testingLearnings.length).toBeGreaterThanOrEqual(1);
		});

		it("should retrieve learnings by scope", async () => {
			// Arrange
			const content = `### Patterns
- [CROSS-CUTTING] Always validate user input
- [LOCAL] This validation is specific`;
			const learnings = extractor.parse(content, "ch-008", "claude");
			await store.append(learnings);

			// Act
			const crossCuttingLearnings = await store.getByScope("cross-cutting");

			// Assert
			expect(crossCuttingLearnings.length).toBeGreaterThanOrEqual(1);
		});
	});
});
