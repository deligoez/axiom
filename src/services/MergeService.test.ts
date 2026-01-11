import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MergeServiceDeps } from "./MergeService.js";
import { MergeService } from "./MergeService.js";

describe("MergeService", () => {
	let service: MergeService;
	let deps: MergeServiceDeps;

	beforeEach(() => {
		deps = {
			mergeQueue: {
				enqueue: vi.fn(),
				dequeue: vi.fn().mockReturnValue(null),
				getStats: vi.fn().mockReturnValue({ pending: 0, processing: 0 }),
				markCompleted: vi.fn(),
			} as unknown as MergeServiceDeps["mergeQueue"],
			mergeWorker: {
				merge: vi.fn(),
			} as unknown as MergeServiceDeps["mergeWorker"],
			conflictClassifier: {
				analyze: vi.fn(),
			} as unknown as MergeServiceDeps["conflictClassifier"],
			autoResolver: {
				resolve: vi.fn(),
			} as unknown as MergeServiceDeps["autoResolver"],
			rebaseRetry: {
				rebaseAndRetry: vi.fn(),
			} as unknown as MergeServiceDeps["rebaseRetry"],
			resolverAgent: {
				resolve: vi.fn(),
			} as unknown as MergeServiceDeps["resolverAgent"],
			humanEscalation: {
				escalate: vi.fn(),
			} as unknown as MergeServiceDeps["humanEscalation"],
			worktreeService: {
				remove: vi.fn(),
			} as unknown as MergeServiceDeps["worktreeService"],
			eventEmitter: new EventEmitter(),
		};
		service = new MergeService(deps);
	});

	const createMergeItem = () => ({
		taskId: "task-1",
		branch: "feature/task-1",
		worktree: "/worktrees/task-1",
		priority: 1,
	});

	// F31: enqueue() - 1 test
	describe("enqueue()", () => {
		it("calls deps.mergeQueue.enqueue() with the provided MergeItem", () => {
			// Arrange
			const item = createMergeItem();

			// Act
			service.enqueue(item);

			// Assert
			expect(deps.mergeQueue.enqueue).toHaveBeenCalledWith({
				taskId: item.taskId,
				branch: item.branch,
				worktree: item.worktree,
				priority: item.priority,
				dependencies: [],
			});
		});
	});

	// F31: start() / stop() - 2 tests
	describe("start() / stop()", () => {
		it("start() sets isRunning=true and begins polling queue", async () => {
			// Arrange
			vi.mocked(deps.mergeQueue.dequeue).mockReturnValue(null);

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 10));

			// Assert
			expect(service.isRunning()).toBe(true);
			expect(deps.mergeQueue.dequeue).toHaveBeenCalled();

			// Cleanup
			service.stop();
		});

		it("stop() sets isRunning=false after current process completes", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue).mockReturnValueOnce(
				item as unknown as null,
			);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: true,
				merged: true,
			});
			vi.mocked(deps.worktreeService.remove).mockResolvedValue(undefined);

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 10));
			service.stop();
			await new Promise((r) => setTimeout(r, 10));

			// Assert
			expect(service.isRunning()).toBe(false);
		});
	});

	// F31: getQueueStatus() / isRunning() - 2 tests
	describe("getQueueStatus() / isRunning()", () => {
		it("getQueueStatus() returns result of deps.mergeQueue.getStats()", () => {
			// Arrange
			const stats = {
				pending: 5,
				processing: 2,
				waiting: 0,
				completed: 0,
				failed: 0,
			};
			vi.mocked(deps.mergeQueue.getStats).mockReturnValue(stats);

			// Act
			const result = service.getQueueStatus();

			// Assert
			expect(result).toEqual(stats);
			expect(deps.mergeQueue.getStats).toHaveBeenCalled();
		});

		it("isRunning() returns internal running state boolean", () => {
			// Arrange - initially not running

			// Act & Assert
			expect(service.isRunning()).toBe(false);

			service.start();
			expect(service.isRunning()).toBe(true);

			service.stop();
		});
	});

	// F31: Conflict Resolution Orchestration - 5 tests
	describe("Conflict Resolution Orchestration", () => {
		it("on conflict, calls deps.conflictClassifier.analyze()", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "SIMPLE" }],
				overallType: "SIMPLE",
			});
			vi.mocked(deps.autoResolver.resolve).mockResolvedValue({
				success: true,
			});

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert
			expect(deps.conflictClassifier.analyze).toHaveBeenCalled();
		});

		it("for SIMPLE conflicts, calls deps.autoResolver.resolve()", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "SIMPLE" }],
				overallType: "SIMPLE",
			});
			vi.mocked(deps.autoResolver.resolve).mockResolvedValue({
				success: true,
			});

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert
			expect(deps.autoResolver.resolve).toHaveBeenCalled();
		});

		it("for MEDIUM conflicts, calls deps.rebaseRetry.rebaseAndRetry()", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "MEDIUM" }],
				overallType: "MEDIUM",
			});
			vi.mocked(deps.rebaseRetry.rebaseAndRetry).mockResolvedValue({
				ready: true,
			});

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert
			expect(deps.rebaseRetry.rebaseAndRetry).toHaveBeenCalled();
		});

		it("for COMPLEX conflicts, calls deps.resolverAgent.resolve()", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "COMPLEX" }],
				overallType: "COMPLEX",
			});
			vi.mocked(deps.resolverAgent.resolve).mockResolvedValue({
				success: true,
				resolved: true,
			});

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert
			expect(deps.resolverAgent.resolve).toHaveBeenCalled();
		});

		it("on all resolution failures, calls deps.humanEscalation.escalate()", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "COMPLEX" }],
				overallType: "COMPLEX",
			});
			vi.mocked(deps.resolverAgent.resolve).mockResolvedValue({
				success: false,
				needsHuman: true,
			});
			vi.mocked(deps.humanEscalation.escalate).mockResolvedValue({
				action: "merged",
			});

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert
			expect(deps.humanEscalation.escalate).toHaveBeenCalled();
		});
	});

	// F31: Worktree Cleanup - 2 tests
	describe("Worktree Cleanup", () => {
		it("on successful merge, calls deps.worktreeService.remove(worktreePath)", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: true,
				merged: true,
			});
			vi.mocked(deps.worktreeService.remove).mockResolvedValue(undefined);

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert - remove is called with agentType and taskId parsed from path
			expect(deps.worktreeService.remove).toHaveBeenCalled();
		});

		it("on human-resolved merge, calls deps.worktreeService.remove(worktreePath)", async () => {
			// Arrange
			const item = createMergeItem();
			vi.mocked(deps.mergeQueue.dequeue)
				.mockReturnValueOnce(item as unknown as null)
				.mockReturnValue(null);
			vi.mocked(deps.mergeWorker.merge).mockResolvedValue({
				success: false,
				hasConflict: true,
				conflictFiles: ["src/index.ts"],
			});
			vi.mocked(deps.conflictClassifier.analyze).mockReturnValue({
				files: [{ file: "src/index.ts", type: "COMPLEX" }],
				overallType: "COMPLEX",
			});
			vi.mocked(deps.resolverAgent.resolve).mockResolvedValue({
				success: false,
				needsHuman: true,
			});
			vi.mocked(deps.humanEscalation.escalate).mockResolvedValue({
				action: "merged",
			});
			vi.mocked(deps.worktreeService.remove).mockResolvedValue(undefined);

			// Act
			service.start();
			await new Promise((r) => setTimeout(r, 50));
			service.stop();

			// Assert - remove is called with agentType and taskId parsed from path
			expect(deps.worktreeService.remove).toHaveBeenCalled();
		});
	});
});
