import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingReview } from "../machines/reviewRegion.js";
import { ReviewPersistence } from "./ReviewPersistence.js";

// Helper to create mock pending review
const createReview = (taskId: string): PendingReview => ({
	taskId,
	result: {
		taskId,
		agentId: "agent-1",
		iterations: 1,
		duration: 1000,
		signal: null,
		quality: [{ name: "test", passed: true, duration: 100 }],
		changes: [],
	},
	addedAt: Date.now(),
});

describe("ReviewPersistence", () => {
	let tempDir: string;
	let service: ReviewPersistence;

	beforeEach(() => {
		// Create temp directory
		tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "review-persistence-test-"),
		);
		service = new ReviewPersistence(tempDir);
	});

	afterEach(() => {
		// Clean up temp directory
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("save", () => {
		it("saves pending reviews and index to state file", async () => {
			// Arrange
			const reviews = [createReview("ch-task1"), createReview("ch-task2")];
			const index = 1;

			// Act
			await service.save(reviews, index);

			// Assert
			const statePath = path.join(tempDir, ".chorus", "state.json");
			expect(fs.existsSync(statePath)).toBe(true);
			const content = JSON.parse(fs.readFileSync(statePath, "utf-8"));
			expect(content.review.pendingReviews).toHaveLength(2);
			expect(content.review.currentIndex).toBe(1);
		});
	});

	describe("load", () => {
		it("restores review state from state file", async () => {
			// Arrange
			const reviews = [createReview("ch-task1")];
			await service.save(reviews, 0);

			// Act
			const state = await service.load();

			// Assert
			expect(state).not.toBeNull();
			expect(state?.pendingReviews).toHaveLength(1);
			expect(state?.pendingReviews[0].taskId).toBe("ch-task1");
			expect(state?.currentIndex).toBe(0);
		});

		it("returns null when state file missing", async () => {
			// Arrange - no file saved

			// Act
			const state = await service.load();

			// Assert
			expect(state).toBeNull();
		});

		it("returns null and logs warning on corrupt state file", async () => {
			// Arrange - write invalid JSON
			const stateDir = path.join(tempDir, ".chorus");
			fs.mkdirSync(stateDir, { recursive: true });
			fs.writeFileSync(
				path.join(stateDir, "state.json"),
				"not valid json",
				"utf-8",
			);
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Act
			const state = await service.load();

			// Assert
			expect(state).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("corrupt"),
			);
			consoleSpy.mockRestore();
		});
	});

	describe("clear", () => {
		it("clears review section when reviews completed", async () => {
			// Arrange
			await service.save([createReview("ch-task1")], 0);

			// Act
			await service.clear();

			// Assert
			const state = await service.load();
			expect(state).toBeNull();
		});

		it("handles clear on non-existent file gracefully", async () => {
			// Arrange - no file exists

			// Act & Assert - should not throw
			await expect(service.clear()).resolves.toBeUndefined();
		});
	});
});
