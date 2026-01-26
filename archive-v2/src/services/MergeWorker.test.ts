import { beforeEach, describe, expect, it, vi } from "vitest";
import { MergeQueue } from "./MergeQueue.js";
import { MergeWorker } from "./MergeWorker.js";
import { MockGitService } from "./MockGitService.js";

describe("MergeWorker", () => {
	let worker: MergeWorker;
	let queue: MergeQueue;
	let mockGit: MockGitService;

	beforeEach(() => {
		queue = new MergeQueue();
		mockGit = new MockGitService();
		worker = new MergeWorker(mockGit);
	});

	// F25: merge() - 7 tests
	describe("merge()", () => {
		it("emits 'mergeStart' event at beginning of merge()", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			const startHandler = vi.fn();
			worker.on("mergeStart", startHandler);

			// Act
			await worker.merge(item);

			// Assert
			expect(startHandler).toHaveBeenCalledOnce();
			expect(startHandler).toHaveBeenCalledWith({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
			});
		});

		it("returns { success: true, merged: true } when mockGit returns clean merge", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setMergeResult({ success: true, merged: true });

			// Act
			const result = await worker.merge(item);

			// Assert
			expect(result.success).toBe(true);
			expect(result.merged).toBe(true);
		});

		it("returns { hasConflict: true } when mockGit indicates conflict", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setMergeResult({ success: false, hasConflict: true });

			// Act
			const result = await worker.merge(item);

			// Assert
			expect(result.hasConflict).toBe(true);
			expect(result.success).toBe(false);
		});

		it("conflictFiles contains array from mockGit.getConflictFiles()", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setMergeResult({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts", "src/app.ts"],
			});

			// Act
			const result = await worker.merge(item);

			// Assert
			expect(result.conflictFiles).toEqual(["src/index.ts", "src/app.ts"]);
		});

		it("emits 'mergeSuccess' event on success: true", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setMergeResult({ success: true, merged: true });
			const successHandler = vi.fn();
			worker.on("mergeSuccess", successHandler);

			// Act
			await worker.merge(item);

			// Assert
			expect(successHandler).toHaveBeenCalledOnce();
			expect(successHandler).toHaveBeenCalledWith({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
			});
		});

		it("emits 'mergeConflict' event on hasConflict: true", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setMergeResult({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			const conflictHandler = vi.fn();
			worker.on("mergeConflict", conflictHandler);

			// Act
			await worker.merge(item);

			// Assert
			expect(conflictHandler).toHaveBeenCalledOnce();
			expect(conflictHandler).toHaveBeenCalledWith({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				conflictFiles: ["src/index.ts"],
			});
		});

		it("emits 'mergeError' event when mockGit.merge() throws", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			mockGit.setThrowError(new Error("fatal: not a git repository"));
			const errorHandler = vi.fn();
			worker.on("mergeError", errorHandler);

			// Act
			await worker.merge(item);

			// Assert
			expect(errorHandler).toHaveBeenCalledOnce();
			expect(errorHandler).toHaveBeenCalledWith({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				error: "fatal: not a git repository",
			});
		});
	});

	// F25: abort() - 2 tests
	describe("abort()", () => {
		it("calls mockGit.abortMerge() once", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			// Start merge to be in merging state
			mockGit.setMergeResult({ success: false, hasConflict: true });
			await worker.merge(item);

			// Act
			await worker.abort();

			// Assert
			expect(mockGit.abortCalls).toBe(1);
		});

		it("sets isMerging to false after abort completes", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			// We need to test during an actual merge, but since our mock is synchronous,
			// we'll test the state after abort
			mockGit.setMergeResult({ success: false, hasConflict: true });
			await worker.merge(item);

			// Act
			await worker.abort();

			// Assert
			expect(worker.isMerging()).toBe(false);
		});
	});

	// F25: isMerging() - 1 test
	describe("isMerging()", () => {
		it("returns true during merge(), false after completion", async () => {
			// Arrange
			queue.enqueue({
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/ch-001",
				priority: 1,
				dependencies: [],
			});
			const item = queue.dequeue()!;
			let wasMergingDuringMerge = false;

			// Capture isMerging state during merge by using event
			worker.on("mergeStart", () => {
				wasMergingDuringMerge = worker.isMerging();
			});

			// Act
			await worker.merge(item);

			// Assert
			expect(wasMergingDuringMerge).toBe(true);
			expect(worker.isMerging()).toBe(false);
		});
	});
});
