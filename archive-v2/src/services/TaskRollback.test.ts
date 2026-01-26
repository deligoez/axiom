import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type DependentProvider,
	type GitRunner,
	TaskRollback,
	type TaskStatusUpdater,
} from "./TaskRollback.js";

describe("TaskRollback", () => {
	let rollback: TaskRollback;
	let mockGitRunner: GitRunner;
	let mockStatusUpdater: TaskStatusUpdater;
	let mockDependentProvider: DependentProvider;
	let mockRun: ReturnType<typeof vi.fn>;
	let mockSetPending: ReturnType<typeof vi.fn>;
	let mockGetDependents: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRun = vi.fn();
		mockGitRunner = { run: mockRun as GitRunner["run"] };

		mockSetPending = vi.fn();
		mockStatusUpdater = {
			setPending: mockSetPending as TaskStatusUpdater["setPending"],
		};

		mockGetDependents = vi.fn();
		mockDependentProvider = {
			getDependents: mockGetDependents as DependentProvider["getDependents"],
		};

		rollback = new TaskRollback(
			mockGitRunner,
			mockStatusUpdater,
			mockDependentProvider,
		);
	});

	describe("rollback", () => {
		it("finds commits using git log --grep=[task-id]", async () => {
			// Arrange
			mockRun.mockResolvedValueOnce({
				success: true,
				output: "abc123\ndef456",
			});
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await rollback.rollback("/worktree", "ch-abc");

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringContaining('--grep="[ch-abc]"'),
				"/worktree",
			);
		});

		it("reverts commits in reverse chronological order", async () => {
			// Arrange
			// git log returns most recent first: abc123, def456
			mockRun.mockResolvedValueOnce({
				success: true,
				output: "abc123\ndef456",
			});
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await rollback.rollback("/worktree", "ch-abc");

			// Assert - revert calls should be in order: abc123 first (most recent), then def456
			const revertCalls = mockRun.mock.calls.filter(([cmd]) =>
				cmd.includes("git revert"),
			);
			expect(revertCalls[0][0]).toContain("abc123");
			expect(revertCalls[1][0]).toContain("def456");
		});

		it("returns task to pending status", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "abc123" });

			// Act
			await rollback.rollback("/worktree", "ch-abc");

			// Assert
			expect(mockSetPending).toHaveBeenCalledWith("ch-abc");
		});

		it("returns RollbackResult with revertedCommits list", async () => {
			// Arrange
			mockRun.mockResolvedValueOnce({
				success: true,
				output: "abc123\ndef456",
			});
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const result = await rollback.rollback("/worktree", "ch-abc");

			// Assert
			expect(result.success).toBe(true);
			expect(result.level).toBe("task");
			expect(result.revertedCommits).toEqual(["abc123", "def456"]);
			expect(result.affectedTasks).toEqual(["ch-abc"]);
		});
	});

	describe("rollbackWithDependents", () => {
		it("gets dependent tasks recursively", async () => {
			// Arrange
			mockGetDependents.mockResolvedValueOnce(["ch-def"]); // ch-abc dependents
			mockGetDependents.mockResolvedValueOnce([]); // ch-def has no dependents
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await rollback.rollbackWithDependents("/worktree", "ch-abc");

			// Assert
			expect(mockGetDependents).toHaveBeenCalledWith("ch-abc");
			expect(mockGetDependents).toHaveBeenCalledWith("ch-def");
		});

		it("orders correctly - leaves first, root last", async () => {
			// Arrange
			// ch-abc has dependents ch-def and ch-xyz
			// ch-def has dependent ch-ghi
			mockGetDependents.mockImplementation(async (taskId: string) => {
				if (taskId === "ch-abc") return ["ch-def", "ch-xyz"];
				if (taskId === "ch-def") return ["ch-ghi"];
				return [];
			});
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const result = await rollback.rollbackWithDependents(
				"/worktree",
				"ch-abc",
			);

			// Assert - order should be: ch-ghi, ch-def, ch-xyz, ch-abc (depth-first, leaves first)
			// ch-ghi first (leaf), ch-def after its dependent, ch-xyz (leaf), ch-abc (root)
			expect(result.affectedTasks).toEqual([
				"ch-ghi",
				"ch-def",
				"ch-xyz",
				"ch-abc",
			]);
		});

		it("reverts each task commits", async () => {
			// Arrange
			mockGetDependents.mockResolvedValueOnce(["ch-def"]);
			mockGetDependents.mockResolvedValueOnce([]);
			mockRun.mockResolvedValue({ success: true, output: "commit1" });

			// Act
			await rollback.rollbackWithDependents("/worktree", "ch-abc");

			// Assert - should find commits for both tasks
			const grepCalls = mockRun.mock.calls.filter(([cmd]) =>
				cmd.includes("--grep"),
			);
			const taskIds = grepCalls.map(([cmd]) => {
				const match = cmd.match(/--grep="\[(ch-[a-z]+)\]"/);
				return match?.[1];
			});
			expect(taskIds).toContain("ch-def");
			expect(taskIds).toContain("ch-abc");
		});

		it("sets all tasks to pending", async () => {
			// Arrange
			mockGetDependents.mockResolvedValueOnce(["ch-def"]);
			mockGetDependents.mockResolvedValueOnce([]);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await rollback.rollbackWithDependents("/worktree", "ch-abc");

			// Assert
			expect(mockSetPending).toHaveBeenCalledWith("ch-def");
			expect(mockSetPending).toHaveBeenCalledWith("ch-abc");
		});
	});

	describe("findTaskCommits", () => {
		it("returns commits for task", async () => {
			// Arrange
			mockRun.mockResolvedValue({
				success: true,
				output: "abc123\ndef456\nghi789",
			});

			// Act
			const commits = await rollback.findTaskCommits("/worktree", "ch-abc");

			// Assert
			expect(commits).toEqual(["abc123", "def456", "ghi789"]);
		});

		it("returns empty array for unknown task", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const commits = await rollback.findTaskCommits("/worktree", "ch-unknown");

			// Assert
			expect(commits).toEqual([]);
		});
	});

	describe("getRollbackOrder", () => {
		it("returns topologically sorted task IDs - leaves first", async () => {
			// Arrange
			mockGetDependents.mockImplementation(async (taskId: string) => {
				if (taskId === "ch-abc") return ["ch-def"];
				if (taskId === "ch-def") return ["ch-ghi"];
				return [];
			});

			// Act
			const order = await rollback.getRollbackOrder("ch-abc");

			// Assert - ch-ghi first (leaf), then ch-def, then ch-abc (root)
			expect(order).toEqual(["ch-ghi", "ch-def", "ch-abc"]);
		});
	});
});
