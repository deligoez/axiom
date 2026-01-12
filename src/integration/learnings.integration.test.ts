/**
 * INT-07: Learnings extraction and storage
 *
 * Integration tests for LearningStore with real file operations.
 * Run with: npm run test:integration
 *
 * Note: This test doesn't require Claude CLI - it tests the LearningStore
 * service directly with real filesystem operations.
 */

import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LearningStore } from "../services/LearningStore.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";
import type { Learning } from "../types/learning.js";

let repo: GitTestRepo;
let learningStore: LearningStore;

/**
 * Helper to create a learning object
 */
function createLearning(
	content: string,
	options: Partial<Learning> = {},
): Learning {
	return {
		id:
			options.id ||
			`learn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		content,
		scope: options.scope || "local",
		category: options.category || "general",
		source: options.source || {
			taskId: "ch-test1",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: options.suggestPattern || false,
	};
}

describe("INT-07: Learnings extraction and storage", () => {
	beforeEach(() => {
		// Create isolated temp git repository with .chorus directory
		repo = createGitRepoWithChorus();
		learningStore = new LearningStore(repo.path);
	});

	afterEach(() => {
		// Cleanup
		repo.cleanup();
	});

	it("persists learning to learnings.md file", async () => {
		// Arrange
		const learning = createLearning(
			"Always check null before accessing properties",
		);

		// Act
		await learningStore.append([learning]);

		// Assert - file should exist
		expect(existsSync(learningStore.learningsPath)).toBe(true);

		// Assert - content should contain the learning
		const content = readFileSync(learningStore.learningsPath, "utf-8");
		expect(content).toContain("Always check null before accessing properties");
		expect(content).toContain("[LOCAL]");
	});

	it("skips duplicate learnings (exact match)", async () => {
		// Arrange
		const learning1 = createLearning(
			"Use strict equality (===) instead of loose equality (==)",
		);
		const learning2 = createLearning(
			"Use strict equality (===) instead of loose equality (==)",
		);

		// Act - add first learning
		const result1 = await learningStore.append([learning1]);

		// Act - try to add duplicate
		const result2 = await learningStore.append([learning2]);

		// Assert
		expect(result1.added).toHaveLength(1);
		expect(result1.skipped).toHaveLength(0);

		expect(result2.added).toHaveLength(0);
		expect(result2.skipped).toHaveLength(1);

		// Assert - only one learning in file
		const learnings = await learningStore.readAll();
		expect(learnings).toHaveLength(1);
	});

	it("stores learning with correct scope", async () => {
		// Arrange
		const localLearning = createLearning("Local scope learning", {
			scope: "local",
		});
		const crossCuttingLearning = createLearning(
			"Cross-cutting scope learning",
			{ scope: "cross-cutting" },
		);
		const architecturalLearning = createLearning(
			"Architectural scope learning",
			{ scope: "architectural" },
		);

		// Act
		await learningStore.append([
			localLearning,
			crossCuttingLearning,
			architecturalLearning,
		]);

		// Assert
		const content = readFileSync(learningStore.learningsPath, "utf-8");
		expect(content).toContain("[LOCAL]");
		expect(content).toContain("[CROSS-CUTTING]");
		expect(content).toContain("[ARCHITECTURAL]");

		// Assert - can read back by scope
		const locals = await learningStore.getByScope("local");
		expect(locals).toHaveLength(1);

		const crossCuttings = await learningStore.getByScope("cross-cutting");
		expect(crossCuttings).toHaveLength(1);

		const architecturals = await learningStore.getByScope("architectural");
		expect(architecturals).toHaveLength(1);
	});
});
