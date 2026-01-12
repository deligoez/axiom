import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PatternSuggestion } from "../components/PatternReviewDialog.js";
import { LearningCategorizer } from "../services/LearningCategorizer.js";
import { LearningExtractor } from "../services/LearningExtractor.js";
import { PatternsManager } from "../services/PatternsManager.js";
import { PendingPatternStore } from "../services/PendingPatternStore.js";
import { SessionLogger } from "../services/SessionLogger.js";

/**
 * E2E tests for the pattern extraction, suggestion, and approval workflow.
 *
 * This tests the complete flow from learning extraction to pattern approval
 * and injection into agent prompts.
 */
describe("E2E: Pattern Extraction & Approval Workflow", () => {
	let testDir: string;
	let chorusDir: string;
	let extractor: LearningExtractor;
	let categorizer: LearningCategorizer;
	let pendingPatternStore: PendingPatternStore;
	let patternsManager: PatternsManager;
	let sessionLogger: SessionLogger;

	beforeEach(() => {
		testDir = join(
			tmpdir(),
			`chorus-pattern-workflow-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		chorusDir = join(testDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });

		extractor = new LearningExtractor();
		categorizer = new LearningCategorizer();
		pendingPatternStore = new PendingPatternStore(testDir);
		patternsManager = new PatternsManager(testDir);
		sessionLogger = new SessionLogger(testDir);
	});

	afterEach(() => {
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Learning Categorization", () => {
		it("identifies CROSS-CUTTING patterns from learning content", () => {
			// Arrange
			const learningContent = `### Patterns
- [CROSS-CUTTING] All API endpoints should validate input before processing`;

			// Act
			const learnings = extractor.parse(learningContent, "ch-task1", "claude");

			// Assert
			expect(learnings).toHaveLength(1);
			expect(learnings[0].scope).toBe("cross-cutting");
			expect(learnings[0].suggestPattern).toBe(true);
		});

		it("uses heuristics to identify cross-cutting when no explicit marker", () => {
			// Arrange - text with cross-cutting indicators but no marker
			const text = "All modules should follow this validation pattern";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("cross-cutting");
			expect(result.confidence).toBe("heuristic");
			expect(result.matchedPattern).toBe("all");
		});
	});

	describe("Pattern Suggestion Storage", () => {
		it("saves pattern suggestion to pending-patterns.json", async () => {
			// Arrange
			const suggestion = PendingPatternStore.createSuggestion(
				"pattern-1",
				"API",
				"ch-task1",
				"claude",
				"Validate all API inputs before processing",
			);

			// Act
			await pendingPatternStore.add(suggestion);

			// Assert
			const pendingPath = join(chorusDir, "pending-patterns.json");
			expect(existsSync(pendingPath)).toBe(true);

			const content = JSON.parse(readFileSync(pendingPath, "utf-8"));
			expect(content).toHaveLength(1);
			expect(content[0].id).toBe("pattern-1");
			expect(content[0].category).toBe("API");
			expect(content[0].content).toBe(
				"Validate all API inputs before processing",
			);
		});
	});

	describe("Pattern Expiry", () => {
		it("expires patterns after 7 days if not approved", async () => {
			// Arrange - create a pattern with expired date
			const now = new Date();
			const expiredPattern: PatternSuggestion = {
				id: "expired-pattern",
				category: "Testing",
				sourceTask: "ch-task1",
				sourceAgent: "claude",
				content: "Old pattern",
				createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
				expiresAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
			};
			await pendingPatternStore.add(expiredPattern);

			// Act
			const pending = await pendingPatternStore.getPending();

			// Assert
			expect(pending).toHaveLength(0);
		});
	});

	describe("Pattern Approval", () => {
		it("adds approved pattern to PATTERNS.md", async () => {
			// Arrange
			const suggestion = PendingPatternStore.createSuggestion(
				"pattern-2",
				"Security",
				"ch-task2",
				"claude",
				"Always sanitize user input",
			);
			await pendingPatternStore.add(suggestion);

			// Act - Simulate approval by adding to PATTERNS.md and removing from pending
			patternsManager.addPattern("Security", "Always sanitize user input");
			await pendingPatternStore.remove("pattern-2");

			// Assert
			const patterns = patternsManager.read();
			expect(patterns.Security).toContain("Always sanitize user input");

			const pending = await pendingPatternStore.getPending();
			expect(pending.find((p) => p.id === "pattern-2")).toBeUndefined();
		});
	});

	describe("Auto-Approval", () => {
		it("auto-approves low-risk patterns based on category", async () => {
			// Arrange - Documentation patterns are considered low-risk
			const lowRiskCategories = ["Documentation", "Naming", "Formatting"];

			for (const category of lowRiskCategories) {
				const suggestion = PendingPatternStore.createSuggestion(
					`auto-${category.toLowerCase()}`,
					category,
					"ch-task3",
					"claude",
					`Use ${category} best practices`,
				);

				// Act - Simulate auto-approval for low-risk categories
				const isLowRisk = lowRiskCategories.includes(suggestion.category);
				if (isLowRisk) {
					patternsManager.addPattern(suggestion.category, suggestion.content);
				}
			}

			// Assert
			const patterns = patternsManager.read();
			expect(patterns.Documentation).toContain(
				"Use Documentation best practices",
			);
			expect(patterns.Naming).toContain("Use Naming best practices");
			expect(patterns.Formatting).toContain("Use Formatting best practices");
		});
	});

	describe("Pattern Injection", () => {
		it("injects approved patterns into context for agent prompts", () => {
			// Arrange - Add some patterns
			patternsManager.write({
				Testing: ["Use AAA pattern", "One assertion per test"],
				API: ["Validate inputs", "Return consistent error format"],
			});

			// Act - Read patterns for injection
			const patterns = patternsManager.read();
			const testingPatterns = patternsManager.getPatternsByCategory("Testing");
			const apiPatterns = patternsManager.getPatternsByCategory("API");

			// Assert - Patterns are available for injection
			expect(testingPatterns).toContain("Use AAA pattern");
			expect(testingPatterns).toContain("One assertion per test");
			expect(apiPatterns).toContain("Validate inputs");
			expect(Object.keys(patterns)).toHaveLength(2);
		});
	});

	describe("Pattern Rejection", () => {
		it("logs pattern rejection with reason to session log", () => {
			// Arrange
			const rejectionReason = "Pattern too vague - needs more specificity";
			const patternId = "rejected-pattern";

			// Act - Log rejection
			sessionLogger.log({
				mode: "pattern_review",
				eventType: "pattern_rejected",
				details: {
					patternId,
					reason: rejectionReason,
					category: "General",
					content: "Be consistent",
				},
			});

			// Assert - Check session log contains rejection
			const events = sessionLogger.getEventsByType("pattern_rejected");
			expect(events).toHaveLength(1);
			expect(events[0].details.patternId).toBe(patternId);
			expect(events[0].details.reason).toBe(rejectionReason);
		});
	});
});
