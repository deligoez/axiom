import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FeedbackEntry } from "../types/review.js";
import { FeedbackStorage } from "./FeedbackStorage.js";

describe("FeedbackStorage", () => {
	let tempDir: string;
	let storage: FeedbackStorage;

	const createTestEntry = (
		overrides: Partial<FeedbackEntry> = {},
	): FeedbackEntry => ({
		type: "comment",
		message: "Test feedback",
		timestamp: new Date().toISOString(),
		...overrides,
	});

	beforeEach(async () => {
		// Create temp directory
		tempDir = path.join(
			process.cwd(),
			".test-tmp",
			`feedback-test-${Date.now()}`,
		);
		await fs.mkdir(tempDir, { recursive: true });
		storage = new FeedbackStorage(tempDir);
	});

	afterEach(async () => {
		// Cleanup
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("saveFeedback appends to history array in .chorus/feedback/{taskId}.json", async () => {
		// Arrange
		const entry = createTestEntry({ message: "First feedback" });

		// Act
		await storage.saveFeedback("ch-test1", entry);

		// Assert
		const filePath = path.join(tempDir, ".chorus", "feedback", "ch-test1.json");
		const content = await fs.readFile(filePath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.taskId).toBe("ch-test1");
		expect(parsed.history).toHaveLength(1);
		expect(parsed.history[0].message).toBe("First feedback");
	});

	it("creates .chorus/feedback/ directory if not exists", async () => {
		// Arrange
		const entry = createTestEntry();

		// Act
		await storage.saveFeedback("ch-test2", entry);

		// Assert
		const dirPath = path.join(tempDir, ".chorus", "feedback");
		const dirExists = await fs
			.access(dirPath)
			.then(() => true)
			.catch(() => false);
		expect(dirExists).toBe(true);
	});

	it("loadFeedback returns full TaskFeedback with history array", async () => {
		// Arrange
		const entry1 = createTestEntry({ type: "comment", message: "Comment 1" });
		const entry2 = createTestEntry({ type: "redo", message: "Please redo" });
		await storage.saveFeedback("ch-test3", entry1);
		await storage.saveFeedback("ch-test3", entry2);

		// Act
		const feedback = await storage.loadFeedback("ch-test3");

		// Assert
		expect(feedback).not.toBeNull();
		expect(feedback?.taskId).toBe("ch-test3");
		expect(feedback?.history).toHaveLength(2);
		expect(feedback?.history[0].type).toBe("comment");
		expect(feedback?.history[1].type).toBe("redo");
	});

	it("loadFeedback returns null for non-existent file", async () => {
		// Arrange - no file created

		// Act
		const feedback = await storage.loadFeedback("ch-nonexistent");

		// Assert
		expect(feedback).toBeNull();
	});

	it("preserves existing history when appending new entry", async () => {
		// Arrange
		const entry1 = createTestEntry({ message: "First" });
		const entry2 = createTestEntry({ message: "Second" });
		const entry3 = createTestEntry({ message: "Third" });
		await storage.saveFeedback("ch-test4", entry1);
		await storage.saveFeedback("ch-test4", entry2);

		// Act
		await storage.saveFeedback("ch-test4", entry3);

		// Assert
		const feedback = await storage.loadFeedback("ch-test4");
		expect(feedback?.history).toHaveLength(3);
		expect(feedback?.history[0].message).toBe("First");
		expect(feedback?.history[1].message).toBe("Second");
		expect(feedback?.history[2].message).toBe("Third");
	});

	it("handles all feedback entry fields correctly", async () => {
		// Arrange
		const entry: FeedbackEntry = {
			type: "approve",
			message: "Looks great!",
			timestamp: "2026-01-12T15:30:00Z",
			reviewer: "human-reviewer",
		};

		// Act
		await storage.saveFeedback("ch-test5", entry);
		const feedback = await storage.loadFeedback("ch-test5");

		// Assert
		expect(feedback?.history[0]).toEqual(entry);
	});
});
