import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskUpdate } from "./PlanReviewLoop.js";
import { QueuedUpdateApplier } from "./QueuedUpdateApplier.js";

// Mock BeadsCLI
const mockBeadsCLI = {
	updateTask: vi.fn(),
};

function createUpdate(taskId: string, field = "description"): TaskUpdate {
	return {
		taskId,
		field,
		oldValue: "old value",
		newValue: "new value",
	};
}

describe("QueuedUpdateApplier", () => {
	let applier: QueuedUpdateApplier;
	let tempDir: string;
	let queuePath: string;

	beforeEach(() => {
		vi.clearAllMocks();
		mockBeadsCLI.updateTask.mockResolvedValue(undefined);

		// Create temp directory
		tempDir = join("/tmp", `queued-applier-test-${Date.now()}`);
		mkdirSync(join(tempDir, ".chorus"), { recursive: true });
		queuePath = join(tempDir, ".chorus", "pending-task-updates.json");

		applier = new QueuedUpdateApplier({
			queuePath,
			beadsCLI: mockBeadsCLI as never,
		});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("checkQueuedUpdates", () => {
		it("returns pending updates for task", async () => {
			// Arrange
			const updates = {
				"ch-task1": [createUpdate("ch-task1", "description")],
				"ch-task2": [createUpdate("ch-task2", "title")],
			};
			writeFileSync(queuePath, JSON.stringify(updates));

			// Act
			const result = await applier.checkQueuedUpdates("ch-task1");

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].taskId).toBe("ch-task1");
			expect(result[0].field).toBe("description");
		});

		it("handles empty queue gracefully", async () => {
			// Arrange
			writeFileSync(queuePath, JSON.stringify({}));

			// Act
			const result = await applier.checkQueuedUpdates("ch-task1");

			// Assert
			expect(result).toHaveLength(0);
		});

		it("handles missing queue file gracefully", async () => {
			// Arrange - don't create queue file

			// Act
			const result = await applier.checkQueuedUpdates("ch-task1");

			// Assert
			expect(result).toHaveLength(0);
		});
	});

	describe("applyAndClearUpdates", () => {
		it("applies updates and removes from queue", async () => {
			// Arrange
			const updates = {
				"ch-task1": [
					createUpdate("ch-task1", "description"),
					createUpdate("ch-task1", "title"),
				],
				"ch-task2": [createUpdate("ch-task2", "priority")],
			};
			writeFileSync(queuePath, JSON.stringify(updates));

			// Act
			const applied = await applier.applyAndClearUpdates("ch-task1");

			// Assert
			expect(applied).toHaveLength(2);
			expect(mockBeadsCLI.updateTask).toHaveBeenCalledTimes(2);

			// Verify queue file updated
			const remaining = JSON.parse(
				require("node:fs").readFileSync(queuePath, "utf-8"),
			);
			expect(remaining["ch-task1"]).toBeUndefined();
			expect(remaining["ch-task2"]).toHaveLength(1);
		});

		it("handles empty queue gracefully (no-op)", async () => {
			// Arrange
			writeFileSync(queuePath, JSON.stringify({}));

			// Act
			const applied = await applier.applyAndClearUpdates("ch-task1");

			// Assert
			expect(applied).toHaveLength(0);
			expect(mockBeadsCLI.updateTask).not.toHaveBeenCalled();
		});

		it("atomically updates queue file after successful application", async () => {
			// Arrange
			const updates = {
				"ch-task1": [createUpdate("ch-task1", "description")],
			};
			writeFileSync(queuePath, JSON.stringify(updates));

			// Act
			await applier.applyAndClearUpdates("ch-task1");

			// Assert - queue should be empty for ch-task1
			const remaining = JSON.parse(
				require("node:fs").readFileSync(queuePath, "utf-8"),
			);
			expect(remaining["ch-task1"]).toBeUndefined();
		});
	});
});
