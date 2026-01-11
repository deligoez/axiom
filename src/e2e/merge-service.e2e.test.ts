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

	// Additional Merge Scenarios (4 tests)

	describe("Additional Merge Scenarios", () => {
		it("performs fast-forward merge when main has no new commits", async () => {
			// Arrange - create branch from main with commits, but main stays unchanged
			createBranch(repo.path, "feature/fast-forward");
			createCommit(repo.path, "FF commit 1", "ff1.txt");
			createCommit(repo.path, "FF commit 2", "ff2.txt");
			checkoutBranch(repo.path, "main");

			const git = new RealGitService(repo.path);

			// Act
			const result = await git.merge("feature/fast-forward");

			// Assert
			expect(result.success).toBe(true);
			expect(result.merged).toBe(true);
		});

		it("handles multi-file conflict with different conflict files", async () => {
			// Arrange - create conflict in multiple files
			const { writeFileSync } = require("node:fs");
			const { join } = require("node:path");
			const { execSync } = require("node:child_process");

			// Create first version on main
			writeFileSync(join(repo.path, "file1.txt"), "file1 main\n");
			writeFileSync(join(repo.path, "file2.txt"), "file2 main\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Add files on main"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			// Create branch and modify both files
			createBranch(repo.path, "feature/multi-conflict");
			writeFileSync(join(repo.path, "file1.txt"), "file1 feature\n");
			writeFileSync(join(repo.path, "file2.txt"), "file2 feature\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Modify files on feature"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			// Modify same files on main
			checkoutBranch(repo.path, "main");
			writeFileSync(join(repo.path, "file1.txt"), "file1 main modified\n");
			writeFileSync(join(repo.path, "file2.txt"), "file2 main modified\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Modify files on main"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			const git = new RealGitService(repo.path);

			// Act
			const result = await git.merge("feature/multi-conflict");

			// Assert
			expect(result.success).toBe(false);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictFiles).toContain("file1.txt");
			expect(result.conflictFiles).toContain("file2.txt");
			expect(result.conflictFiles?.length).toBe(2);
		});

		it("succeeds when only some files would conflict but they're different", async () => {
			// Arrange - modify different files on each branch (no conflict)
			const { writeFileSync } = require("node:fs");
			const { join } = require("node:path");
			const { execSync } = require("node:child_process");

			// Create initial files
			writeFileSync(join(repo.path, "shared.txt"), "shared content\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Add shared file"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			// Feature branch adds new file
			createBranch(repo.path, "feature/partial");
			writeFileSync(join(repo.path, "feature-only.txt"), "feature content\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Add feature file"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			// Main adds different file
			checkoutBranch(repo.path, "main");
			writeFileSync(join(repo.path, "main-only.txt"), "main content\n");
			execSync("git add .", { cwd: repo.path, stdio: "pipe" });
			execSync('git commit -m "Add main file"', {
				cwd: repo.path,
				stdio: "pipe",
			});

			const git = new RealGitService(repo.path);

			// Act
			const result = await git.merge("feature/partial");

			// Assert
			expect(result.success).toBe(true);
			expect(result.merged).toBe(true);
		});

		it("detects conflict markers in file content after merge failure", async () => {
			// Arrange
			const { readFileSync } = require("node:fs");
			const { join } = require("node:path");

			const { conflictFile } = setupMergeConflict(repo.path, "feature/markers");
			const git = new RealGitService(repo.path);

			// Act
			await git.merge("feature/markers");

			// Assert - check conflict markers exist in file
			const content = readFileSync(join(repo.path, conflictFile), "utf-8");
			expect(content).toContain("<<<<<<<");
			expect(content).toContain("=======");
			expect(content).toContain(">>>>>>>");
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
