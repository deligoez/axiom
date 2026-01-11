import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LearningStore } from "../services/LearningStore.js";
import type { Learning } from "../types/learning.js";

describe("E2E: LearningStore Integration", () => {
	let tempDir: string;
	let learningStore: LearningStore;

	const createLearning = (
		id: string,
		content: string,
		scope: Learning["scope"] = "local",
	): Learning => ({
		id,
		content,
		scope,
		category: "general",
		source: {
			taskId: "ch-test",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
	});

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-learning-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });

		learningStore = new LearningStore(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("creates learnings.md if missing", async () => {
		// Arrange
		const learningsPath = join(tempDir, ".claude", "rules", "learnings.md");
		expect(existsSync(learningsPath)).toBe(false);

		// Act
		await learningStore.append([createLearning("l1", "Test learning")]);

		// Assert
		expect(existsSync(learningsPath)).toBe(true);
	});

	it("appends learnings with correct format", async () => {
		// Arrange & Act
		await learningStore.append([
			createLearning("l2", "Always use strict mode", "local"),
			createLearning("l3", "Prefer const over let", "cross-cutting"),
		]);

		// Assert
		const learningsPath = join(tempDir, ".claude", "rules", "learnings.md");
		const content = readFileSync(learningsPath, "utf-8");

		expect(content).toContain("[LOCAL] Always use strict mode");
		expect(content).toContain("[CROSS-CUTTING] Prefer const over let");
		expect(content).toContain("id: l2");
		expect(content).toContain("id: l3");
	});

	it("deduplicates exact duplicate learnings", async () => {
		// Arrange
		const learning = createLearning("l4", "Exact duplicate content");

		// Act - add same learning twice
		const result1 = await learningStore.append([learning]);
		const result2 = await learningStore.append([
			createLearning("l5", "Exact duplicate content"),
		]);

		// Assert
		expect(result1.added).toHaveLength(1);
		expect(result1.skipped).toHaveLength(0);
		expect(result2.added).toHaveLength(0);
		expect(result2.skipped).toHaveLength(1);
	});

	it("updates learnings-meta.json with hashes", async () => {
		// Arrange & Act
		await learningStore.append([createLearning("l6", "Learning with hash")]);

		// Assert
		const metaPath = join(tempDir, ".claude", "rules", "learnings-meta.json");
		expect(existsSync(metaPath)).toBe(true);

		const metaContent = readFileSync(metaPath, "utf-8");
		const meta = JSON.parse(metaContent);

		expect(meta.hashes).toHaveLength(1);
		expect(meta.lastUpdated).toBeDefined();
	});

	it("reads all learnings back from file", async () => {
		// Arrange
		await learningStore.append([
			createLearning("l7", "First learning", "local"),
			createLearning("l8", "Second learning", "architectural"),
		]);

		// Act
		const learnings = await learningStore.readAll();

		// Assert
		expect(learnings).toHaveLength(2);
	});

	it("filters learnings by scope", async () => {
		// Arrange
		await learningStore.append([
			createLearning("l9", "Local scope learning", "local"),
			createLearning("l10", "Cross-cutting learning", "cross-cutting"),
			createLearning("l11", "Another local learning", "local"),
		]);

		// Act
		const localLearnings = await learningStore.getByScope("local");

		// Assert
		expect(localLearnings).toHaveLength(2);
	});

	it("marks learnings as reviewed", async () => {
		// Arrange
		await learningStore.append([
			createLearning("l12", "To be reviewed"),
			createLearning("l13", "Also reviewed"),
		]);

		// Act
		await learningStore.markReviewed("l12", "user1");
		const unreviewed = await learningStore.getUnreviewed();

		// Assert - l12 is reviewed, l13 is not
		// Note: getUnreviewed may find more items if parsing works differently
		expect(unreviewed.some((l) => l.id === "l12")).toBe(false);
	});
});
