import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type GitRunner,
	IterationRollback,
	type StateProvider,
} from "./IterationRollback.js";

describe("IterationRollback", () => {
	let rollback: IterationRollback;
	let mockGitRunner: GitRunner;
	let mockStateProvider: StateProvider;
	let mockRun: ReturnType<typeof vi.fn>;
	let mockGetIterations: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRun = vi.fn();
		mockGitRunner = { run: mockRun as GitRunner["run"] };

		mockGetIterations = vi.fn();
		mockStateProvider = {
			getIterations: mockGetIterations as StateProvider["getIterations"],
		};

		rollback = new IterationRollback(mockStateProvider, mockGitRunner);
	});

	describe("rollback", () => {
		it("finds commits by task ID marker", async () => {
			// Arrange
			const logOutput = `abc123 feat: add feature [ch-abc]
def456 fix: bug fix [ch-abc]`;
			mockRun.mockResolvedValue({ success: true, output: logOutput });
			mockGetIterations.mockReturnValue([
				{ number: 1, startCommit: "initial" },
				{ number: 2, startCommit: "after-iter1" },
			]);

			// Act
			await rollback.rollback("/worktree", "ch-abc", 1);

			// Assert - findTaskCommits is called which uses --grep
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringContaining("--grep"),
				"/worktree",
			);
		});

		it("reads iteration boundaries from state", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });
			mockGetIterations.mockReturnValue([
				{ number: 1, startCommit: "abc123" },
				{ number: 2, startCommit: "def456" },
			]);

			// Act
			await rollback.rollback("/worktree", "ch-abc", 1);

			// Assert
			expect(mockGetIterations).toHaveBeenCalledWith("ch-abc");
		});

		it("resets correct commits for last iteration", async () => {
			// Arrange
			mockRun.mockResolvedValueOnce({
				success: true,
				output: "ghi789 feat: done [ch-abc]",
			});
			mockRun.mockResolvedValue({ success: true, output: "" });
			mockGetIterations.mockReturnValue([
				{ number: 1, startCommit: "abc123" },
				{ number: 2, startCommit: "def456" },
			]);

			// Act
			await rollback.rollback("/worktree", "ch-abc", 1);

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringContaining("git reset --soft def456"),
				"/worktree",
			);
		});

		it("handles multi-iteration rollback (N > 1)", async () => {
			// Arrange
			mockRun.mockResolvedValueOnce({ success: true, output: "" });
			mockRun.mockResolvedValue({ success: true, output: "" });
			mockGetIterations.mockReturnValue([
				{ number: 1, startCommit: "abc123" },
				{ number: 2, startCommit: "def456" },
				{ number: 3, startCommit: "ghi789" },
			]);

			// Act - rollback 2 iterations (undo iter 3 and iter 2)
			await rollback.rollback("/worktree", "ch-abc", 2);

			// Assert - should reset to iteration 2's start (def456)
			// This undoes everything after def456 (iterations 2 and 3)
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringContaining("git reset --soft def456"),
				"/worktree",
			);
		});

		it("handles no matching commits gracefully", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });
			mockGetIterations.mockReturnValue([]);

			// Act
			const result = await rollback.rollback("/worktree", "ch-abc", 1);

			// Assert
			expect(result.success).toBe(false);
			expect(result.revertedCommits).toEqual([]);
		});
	});

	describe("getTaskCommitCount", () => {
		it("counts commits with task marker", async () => {
			// Arrange
			const logOutput = "abc123\ndef456\nghi789";
			mockRun.mockResolvedValue({ success: true, output: logOutput });

			// Act
			const count = await rollback.getTaskCommitCount("/worktree", "ch-abc");

			// Assert
			expect(count).toBe(3);
		});
	});

	describe("findTaskCommits", () => {
		it("returns hashes in reverse chronological order", async () => {
			// Arrange - git log returns most recent first
			const logOutput = "ghi789\ndef456\nabc123";
			mockRun.mockResolvedValue({ success: true, output: logOutput });

			// Act
			const commits = await rollback.findTaskCommits("/worktree", "ch-abc");

			// Assert
			expect(commits).toEqual(["ghi789", "def456", "abc123"]);
		});
	});

	describe("findIterationCommits", () => {
		it("respects state-based boundaries", async () => {
			// Arrange
			mockGetIterations.mockReturnValue([
				{ number: 1, startCommit: "abc123" },
				{ number: 2, startCommit: "def456" },
			]);
			mockRun.mockResolvedValue({
				success: true,
				output: "ghi789\njkl012",
			});

			// Act
			const commits = await rollback.findIterationCommits(
				"/worktree",
				"ch-abc",
				2,
			);

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringContaining("def456..HEAD"),
				"/worktree",
			);
			expect(commits).toEqual(["ghi789", "jkl012"]);
		});
	});

	describe("getIterationBoundaries", () => {
		it("returns correct data from state", async () => {
			// Arrange
			const iterations = [
				{ number: 1, startCommit: "abc123" },
				{ number: 2, startCommit: "def456" },
			];
			mockGetIterations.mockReturnValue(iterations);

			// Act
			const boundaries = await rollback.getIterationBoundaries("ch-abc");

			// Assert
			expect(boundaries).toEqual(iterations);
		});
	});
});
