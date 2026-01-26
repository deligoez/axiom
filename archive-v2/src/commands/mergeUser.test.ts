import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MergeQueue } from "../services/MergeQueue.js";

// Mock execSync for git commands using vi.hoisted
const { mockExecSync } = vi.hoisted(() => ({
	mockExecSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	execSync: mockExecSync,
}));

// Import after mocks
import { mergeUserCommand } from "./mergeUser.js";

describe("mergeUserCommand", () => {
	let mockQueue: {
		enqueue: ReturnType<typeof vi.fn>;
		getItems: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockQueue = {
			enqueue: vi.fn(),
			getItems: vi.fn().mockReturnValue([]),
		};
	});

	describe("Branch Validation", () => {
		it("validates branch exists via git rev-parse", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});

			// Act
			await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("rev-parse --verify user-feature"),
				expect.any(Object),
			);
		});

		it("validates branch has commits ahead via git rev-list", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "5\n";
				}
				return "";
			});

			// Act
			await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(mockExecSync).toHaveBeenCalledWith(
				expect.stringContaining("rev-list main..user-feature --count"),
				expect.any(Object),
			);
		});

		it("returns error with message if branch does not exist", async () => {
			// Arrange
			mockExecSync.mockImplementation(() => {
				throw new Error("fatal: Needed a single revision");
			});

			// Act
			const result = await mergeUserCommand({
				branch: "nonexistent-branch",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toContain("does not exist");
		});
	});

	describe("Queue Addition", () => {
		it("calls MergeQueue.enqueue() with user entry", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});

			// Act
			await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(mockQueue.enqueue).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: expect.stringContaining("user-"),
					branch: "user-feature",
				}),
			);
		});

		it("uses default priority P2 when not specified", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});

			// Act
			await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(mockQueue.enqueue).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 2,
				}),
			);
		});

		it("accepts --priority flag to override", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});

			// Act
			await mergeUserCommand({
				branch: "user-feature",
				priority: 0,
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(mockQueue.enqueue).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 0,
				}),
			);
		});
	});

	describe("Output", () => {
		it("returns success with queue position", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});
			mockQueue.getItems.mockReturnValue([
				{ taskId: "task-1" },
				{ taskId: "task-2" },
			]);

			// Act
			const result = await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.position).toBe(3); // After enqueue, it's position 3
		});

		it("returns commit count being merged", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "7\n";
				}
				return "";
			});

			// Act
			const result = await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(result.commitCount).toBe(7);
		});
	});

	describe("Edge Cases", () => {
		it("returns error if branch has no commits ahead", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "0\n";
				}
				return "";
			});

			// Act
			const result = await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toContain("no commits ahead");
		});

		it("returns error if same branch already in queue", async () => {
			// Arrange
			mockExecSync.mockImplementation((cmd: string) => {
				if (cmd.includes("rev-parse --verify")) {
					return "abc123\n";
				}
				if (cmd.includes("rev-list")) {
					return "3\n";
				}
				return "";
			});
			mockQueue.getItems.mockReturnValue([
				{ taskId: "task-1", branch: "other-branch" },
				{ taskId: "user-abc", branch: "user-feature" },
			]);

			// Act
			const result = await mergeUserCommand({
				branch: "user-feature",
				queue: mockQueue as unknown as MergeQueue,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toContain("already in queue");
		});
	});
});
