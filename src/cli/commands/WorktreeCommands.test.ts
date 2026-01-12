/**
 * WorktreeCommands - CLI commands for worktree management
 *
 * Tests for:
 * - chorus worktree clean <task-id>
 * - chorus worktree clean --failed
 * - chorus worktree clean --all
 * - chorus worktree list
 * - chorus worktree list --orphaned
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorktreeInfo } from "../../services/WorktreeService.js";
import { WorktreeNotFoundError } from "../../services/WorktreeService.js";
import type { TaskProviderTask } from "../../types/task-provider.js";
import { WorktreeCommands } from "./WorktreeCommands.js";

// Mock dependencies
const mockWorktreeService = {
	remove: vi.fn(),
	list: vi.fn(),
	prune: vi.fn(),
	exists: vi.fn(),
};

const mockTaskProvider = {
	getInProgressTasks: vi.fn(),
};

describe("WorktreeCommands", () => {
	let commands: WorktreeCommands;

	beforeEach(() => {
		vi.clearAllMocks();
		commands = new WorktreeCommands(
			mockWorktreeService as unknown as WorktreeCommands["worktreeService"],
			mockTaskProvider as unknown as WorktreeCommands["taskProvider"],
		);
	});

	// ============================================================================
	// clean <task-id> - 3 tests
	// ============================================================================
	describe("clean <task-id>", () => {
		it("removes worktree via WorktreeService.remove() with force", async () => {
			// Arrange
			mockWorktreeService.remove.mockResolvedValue(undefined);

			// Act
			await commands.cleanTaskWorktree("ch-123");

			// Assert
			expect(mockWorktreeService.remove).toHaveBeenCalledWith(
				"claude",
				"ch-123",
				{ force: true, deleteBranch: true },
			);
		});

		it("throws error if worktree doesn't exist", async () => {
			// Arrange
			mockWorktreeService.remove.mockRejectedValue(
				new WorktreeNotFoundError("claude", "ch-123"),
			);

			// Act & Assert
			await expect(commands.cleanTaskWorktree("ch-123")).rejects.toThrow(
				WorktreeNotFoundError,
			);
		});

		it("returns success message with task ID", async () => {
			// Arrange
			mockWorktreeService.remove.mockResolvedValue(undefined);

			// Act
			const result = await commands.cleanTaskWorktree("ch-456");

			// Assert
			expect(result).toBe("Cleaned worktree for ch-456");
		});
	});

	// ============================================================================
	// clean --failed - 3 tests
	// ============================================================================
	describe("clean --failed", () => {
		it("gets tasks with failed=true OR timeout=true via list", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockTaskProvider.getInProgressTasks.mockResolvedValue([]);
			mockWorktreeService.remove.mockResolvedValue(undefined);

			// Act
			await commands.cleanFailedWorktrees();

			// Assert
			expect(mockWorktreeService.list).toHaveBeenCalled();
		});

		it("removes worktree for each orphaned task", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
				{
					path: "/proj/.worktrees/claude-ch-002",
					branch: "agent/claude/ch-002",
					agentType: "claude",
					taskId: "ch-002",
				},
			];
			// No tasks are in progress - so both worktrees are orphaned/failed
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockTaskProvider.getInProgressTasks.mockResolvedValue([]);
			mockWorktreeService.remove.mockResolvedValue(undefined);

			// Act
			await commands.cleanFailedWorktrees();

			// Assert
			expect(mockWorktreeService.remove).toHaveBeenCalledTimes(2);
		});

		it("returns count of cleaned worktrees", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
				{
					path: "/proj/.worktrees/claude-ch-002",
					branch: "agent/claude/ch-002",
					agentType: "claude",
					taskId: "ch-002",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockTaskProvider.getInProgressTasks.mockResolvedValue([]);
			mockWorktreeService.remove.mockResolvedValue(undefined);

			// Act
			const result = await commands.cleanFailedWorktrees();

			// Assert
			expect(result).toBe("Cleaned 2 worktrees for failed/timeout tasks");
		});
	});

	// ============================================================================
	// clean --all - 3 tests
	// ============================================================================
	describe("clean --all", () => {
		it("requires confirmation unless --yes flag is passed", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);

			// Act
			const result = await commands.cleanAllWorktrees(false);

			// Assert - requires confirmation, does not remove
			expect(result).toBe("Confirmation required. Use --yes to confirm.");
			expect(mockWorktreeService.remove).not.toHaveBeenCalled();
		});

		it("removes all worktrees in .worktrees/ when confirmed", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
				{
					path: "/proj/.worktrees/claude-ch-002",
					branch: "agent/claude/ch-002",
					agentType: "claude",
					taskId: "ch-002",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockWorktreeService.remove.mockResolvedValue(undefined);
			mockWorktreeService.prune.mockResolvedValue(undefined);

			// Act
			await commands.cleanAllWorktrees(true);

			// Assert
			expect(mockWorktreeService.remove).toHaveBeenCalledTimes(2);
		});

		it("runs git worktree prune after removal", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockWorktreeService.remove.mockResolvedValue(undefined);
			mockWorktreeService.prune.mockResolvedValue(undefined);

			// Act
			await commands.cleanAllWorktrees(true);

			// Assert
			expect(mockWorktreeService.prune).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// list - 2 tests
	// ============================================================================
	describe("list", () => {
		it("lists all worktrees with task info", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
				{
					path: "/proj/.worktrees/claude-ch-002",
					branch: "agent/claude/ch-002",
					agentType: "claude",
					taskId: "ch-002",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);

			// Act
			const result = await commands.listWorktrees();

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0].taskId).toBe("ch-001");
			expect(result[1].taskId).toBe("ch-002");
		});

		it("returns empty list if no worktrees", async () => {
			// Arrange
			mockWorktreeService.list.mockReturnValue([]);

			// Act
			const result = await commands.listWorktrees();

			// Assert
			expect(result).toEqual([]);
		});
	});

	// ============================================================================
	// list --orphaned - 2 tests
	// ============================================================================
	describe("list --orphaned", () => {
		it("identifies worktrees without matching in-progress task", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
				{
					path: "/proj/.worktrees/claude-ch-002",
					branch: "agent/claude/ch-002",
					agentType: "claude",
					taskId: "ch-002",
				},
			];
			const inProgressTasks: TaskProviderTask[] = [
				{
					id: "ch-001",
					title: "Task 1",
					priority: 1,
					status: "in_progress",
					labels: [],
					dependencies: [],
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockTaskProvider.getInProgressTasks.mockResolvedValue(inProgressTasks);

			// Act
			const result = await commands.listOrphanedWorktrees();

			// Assert - ch-002 is orphaned (not in progress)
			expect(result).toHaveLength(1);
			expect(result[0].taskId).toBe("ch-002");
		});

		it("shows suggested action for each orphan", async () => {
			// Arrange
			const worktrees: WorktreeInfo[] = [
				{
					path: "/proj/.worktrees/claude-ch-001",
					branch: "agent/claude/ch-001",
					agentType: "claude",
					taskId: "ch-001",
				},
			];
			mockWorktreeService.list.mockReturnValue(worktrees);
			mockTaskProvider.getInProgressTasks.mockResolvedValue([]);

			// Act
			const result = await commands.listOrphanedWorktrees();

			// Assert
			expect(result[0].suggestedAction).toBe("chorus worktree clean ch-001");
		});
	});
});
