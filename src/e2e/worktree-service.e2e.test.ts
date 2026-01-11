import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	branchExists,
	createCommit,
	createGitRepoWithChorus,
	type GitTestRepo,
	listWorktrees,
	mergeBranch,
} from "../test-utils/git-fixtures.js";

describe("E2E: WorktreeService", () => {
	let repo: GitTestRepo;
	let service: WorktreeService;

	beforeEach(() => {
		repo = createGitRepoWithChorus();
		service = new WorktreeService(repo.path);
	});

	afterEach(() => {
		repo.cleanup();
	});

	// create() E2E tests (4 tests)

	it("creates worktree in .worktrees/ directory", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-test1";

		// Act
		const result = await service.create(agentType, taskId);

		// Assert
		expect(existsSync(result.path)).toBe(true);
		expect(result.path).toBe(join(repo.path, ".worktrees", "claude-ch-test1"));
	});

	it("creates branch with agent/type/taskId pattern", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-abc123";

		// Act
		await service.create(agentType, taskId);

		// Assert
		expect(branchExists(repo.path, "agent/claude/ch-abc123")).toBe(true);
	});

	it("creates .agent/scratchpad.md in worktree", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-scratch";

		// Act
		const result = await service.create(agentType, taskId);

		// Assert
		const scratchpadPath = join(result.path, ".agent", "scratchpad.md");
		expect(existsSync(scratchpadPath)).toBe(true);

		const content = readFileSync(scratchpadPath, "utf-8");
		expect(content).toContain("ch-scratch");
	});

	it("throws WorktreeExistsError if worktree already exists", async () => {
		// Arrange
		await service.create("claude", "ch-exists");

		// Act & Assert
		await expect(service.create("claude", "ch-exists")).rejects.toThrow(
			"already exists",
		);
	});

	// remove() E2E tests (3 tests)

	it("removes worktree directory with force", async () => {
		// Arrange
		const result = await service.create("claude", "ch-remove");
		expect(existsSync(result.path)).toBe(true);

		// Act - use force because .agent/scratchpad.md is untracked
		await service.remove("claude", "ch-remove", {
			deleteBranch: false,
			force: true,
		});

		// Assert
		expect(existsSync(result.path)).toBe(false);
	});

	it("deletes merged branch with deleteBranch: true", async () => {
		// Arrange
		const worktree = await service.create("claude", "ch-merged");

		// Create a commit in the worktree
		createCommit(worktree.path, "Feature work");

		// Merge the branch into main
		mergeBranch(repo.path, "agent/claude/ch-merged");

		// Remove the worktree
		await service.remove("claude", "ch-merged", { deleteBranch: true });

		// Assert - branch should be deleted
		expect(branchExists(repo.path, "agent/claude/ch-merged")).toBe(false);
	});

	it("keeps unmerged branch without error", async () => {
		// Arrange
		const worktree = await service.create("claude", "ch-unmerged");

		// Create a commit in the worktree (but don't merge)
		createCommit(worktree.path, "Unmerged work");

		// Act - should not throw
		await service.remove("claude", "ch-unmerged", { deleteBranch: true });

		// Assert - branch should still exist (not merged)
		expect(branchExists(repo.path, "agent/claude/ch-unmerged")).toBe(true);
	});

	// list() E2E tests (2 tests)

	it("lists all agent worktrees (excludes main)", async () => {
		// Arrange
		await service.create("claude", "ch-list1");
		await service.create("aider", "ch-list2");

		// Act
		const worktrees = service.list();

		// Assert
		expect(worktrees).toHaveLength(2);
		expect(worktrees.map((w) => w.taskId)).toContain("ch-list1");
		expect(worktrees.map((w) => w.taskId)).toContain("ch-list2");
		expect(worktrees.map((w) => w.agentType)).toContain("claude");
		expect(worktrees.map((w) => w.agentType)).toContain("aider");
	});

	it("returns empty array for no worktrees", () => {
		// Act
		const worktrees = service.list();

		// Assert
		expect(worktrees).toEqual([]);
	});

	// Query E2E tests (2 tests)

	it("exists() returns true for existing worktree", async () => {
		// Arrange
		await service.create("claude", "ch-exist");

		// Act & Assert
		expect(service.exists("claude", "ch-exist")).toBe(true);
		expect(service.exists("claude", "ch-nonexistent")).toBe(false);
	});

	it("getInfo() returns headSha from real git", async () => {
		// Arrange
		const worktree = await service.create("claude", "ch-info");

		// Create a commit to have a unique SHA
		const commitSha = createCommit(worktree.path, "Test commit");

		// Act
		const info = await service.getInfo("claude", "ch-info");

		// Assert
		expect(info.headSha).toBe(commitSha);
		expect(info.branch).toBe("agent/claude/ch-info");
		expect(info.agentType).toBe("claude");
		expect(info.taskId).toBe("ch-info");
	});

	// Edge case test

	it("works with worktree containing uncommitted changes", async () => {
		// Arrange
		const worktree = await service.create("claude", "ch-dirty");

		// Create uncommitted changes
		const filePath = join(worktree.path, "dirty-file.txt");
		require("node:fs").writeFileSync(filePath, "Uncommitted changes\n");

		// Act - remove with force
		await service.remove("claude", "ch-dirty", {
			force: true,
			deleteBranch: false,
		});

		// Assert
		expect(existsSync(worktree.path)).toBe(false);
	});

	// removeAll() E2E test

	it("removeAll() removes all agent worktrees with force", async () => {
		// Arrange
		await service.create("claude", "ch-all1");
		await service.create("aider", "ch-all2");
		expect(service.list()).toHaveLength(2);

		// Act - use force because worktrees have untracked .agent/ files
		await service.removeAll({ force: true });

		// Assert
		expect(service.list()).toHaveLength(0);
		const worktrees = listWorktrees(repo.path);
		expect(worktrees).toHaveLength(1); // Only main worktree remains
	});
});
