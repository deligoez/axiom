import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RealGitService } from "../services/GitService.js";
import { MergeWorker } from "../services/MergeWorker.js";
import { RebaseRetry } from "../services/RebaseRetry.js";
import {
	abortMerge,
	abortRebase,
	checkoutBranch,
	createBranch,
	createCommit,
	createGitRepo,
	type GitTestRepo,
	getConflictFiles,
	isInMergeConflict,
	setupMergeConflict,
} from "../test-utils/git-fixtures.js";

describe("E2E: MergeService", () => {
	let repo: GitTestRepo;

	beforeEach(() => {
		repo = createGitRepo();
	});

	afterEach(() => {
		// Clean up any in-progress operations
		abortMerge(repo.path);
		abortRebase(repo.path);
		repo.cleanup();
	});

	// Basic Merge Tests (3 tests)

	describe("GitService.merge()", () => {
		it("merges clean branch into main", async () => {
			// Arrange
			createBranch(repo.path, "feature/clean");
			createCommit(repo.path, "Feature work", "feature.txt");
			checkoutBranch(repo.path, "main");

			const git = new RealGitService(repo.path);

			// Act
			const result = await git.merge("feature/clean");

			// Assert
			expect(result.success).toBe(true);
			expect(result.merged).toBe(true);
		});

		it("detects and reports merge conflict", async () => {
			// Arrange
			const { conflictFile } = setupMergeConflict(
				repo.path,
				"feature/conflict",
			);
			const git = new RealGitService(repo.path);

			// Act
			const result = await git.merge("feature/conflict");

			// Assert
			expect(result.success).toBe(false);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictFiles).toContain(conflictFile);
		});

		it("aborts merge on conflict", async () => {
			// Arrange
			setupMergeConflict(repo.path, "feature/abort");
			const git = new RealGitService(repo.path);

			// Trigger the conflict
			await git.merge("feature/abort");
			expect(isInMergeConflict(repo.path)).toBe(true);

			// Act
			await git.abortMerge();

			// Assert
			expect(isInMergeConflict(repo.path)).toBe(false);
		});
	});

	// MergeWorker Tests (2 tests)

	describe("MergeWorker", () => {
		it("emits mergeSuccess on clean merge", async () => {
			// Arrange
			createBranch(repo.path, "feature/worker-clean");
			createCommit(repo.path, "Worker feature", "worker.txt");
			checkoutBranch(repo.path, "main");

			const git = new RealGitService(repo.path);
			const worker = new MergeWorker(git);
			const events: string[] = [];

			worker.on("mergeStart", () => events.push("start"));
			worker.on("mergeSuccess", () => events.push("success"));

			// Act
			const result = await worker.merge({
				taskId: "ch-test",
				branch: "feature/worker-clean",
				worktree: repo.path,
				priority: 1,
				enqueuedAt: Date.now(),
				status: "ready",
				dependencies: [],
				retryCount: 0,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(events).toContain("start");
			expect(events).toContain("success");
		});

		it("emits mergeConflict on conflict", async () => {
			// Arrange
			setupMergeConflict(repo.path, "feature/worker-conflict");
			const git = new RealGitService(repo.path);
			const worker = new MergeWorker(git);
			const events: string[] = [];

			worker.on("mergeConflict", () => events.push("conflict"));

			// Act
			const result = await worker.merge({
				taskId: "ch-test",
				branch: "feature/worker-conflict",
				worktree: repo.path,
				priority: 1,
				enqueuedAt: Date.now(),
				status: "ready",
				dependencies: [],
				retryCount: 0,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.hasConflict).toBe(true);
			expect(events).toContain("conflict");

			// Clean up
			await worker.abort();
		});
	});

	// Rebase Tests (3 tests)

	describe("RebaseRetry", () => {
		it("rebases branch onto main", async () => {
			// Arrange
			createBranch(repo.path, "feature/rebase-clean");
			createCommit(repo.path, "Feature for rebase", "rebase.txt");

			// Create a commit on main after the branch
			checkoutBranch(repo.path, "main");
			createCommit(repo.path, "Main update", "main-update.txt");
			checkoutBranch(repo.path, "feature/rebase-clean");

			const rebase = new RebaseRetry();
			// Change to repo directory for rebase
			const originalCwd = process.cwd();
			process.chdir(repo.path);

			try {
				// Act
				const result = await rebase.rebase("main");

				// Assert
				expect(result.success).toBe(true);
				expect(result.rebased).toBe(true);
			} finally {
				process.chdir(originalCwd);
			}
		});

		it("detects rebase conflict", async () => {
			// Arrange
			setupMergeConflict(repo.path, "feature/rebase-conflict");
			checkoutBranch(repo.path, "feature/rebase-conflict");

			const rebase = new RebaseRetry();
			const originalCwd = process.cwd();
			process.chdir(repo.path);

			try {
				// Act
				const result = await rebase.rebase("main");

				// Assert
				expect(result.success).toBe(false);
				expect(result.hadConflicts).toBe(true);
			} finally {
				abortRebase(repo.path);
				process.chdir(originalCwd);
			}
		});

		it("aborts rebase on conflict with rebaseAndRetry", async () => {
			// Arrange
			setupMergeConflict(repo.path, "feature/rebase-abort");
			checkoutBranch(repo.path, "feature/rebase-abort");

			const rebase = new RebaseRetry();
			const originalCwd = process.cwd();
			process.chdir(repo.path);

			try {
				// Act
				const result = await rebase.rebaseAndRetry("main");

				// Assert
				expect(result.ready).toBe(false);
				expect(result.aborted).toBe(true);
			} finally {
				process.chdir(originalCwd);
			}
		});
	});

	// Conflict File Detection (2 tests)

	describe("Conflict Detection", () => {
		it("getConflictFiles returns files in conflict", async () => {
			// Arrange
			const { conflictFile } = setupMergeConflict(
				repo.path,
				"feature/detect-conflict",
			);
			const git = new RealGitService(repo.path);

			// Trigger conflict
			await git.merge("feature/detect-conflict");

			// Act
			const conflicts = getConflictFiles(repo.path);

			// Assert
			expect(conflicts).toContain(conflictFile);
		});

		it("getConflictFiles returns empty array when no conflict", () => {
			// Act
			const conflicts = getConflictFiles(repo.path);

			// Assert
			expect(conflicts).toEqual([]);
		});
	});
});
