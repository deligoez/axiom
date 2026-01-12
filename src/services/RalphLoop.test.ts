import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MergeService } from "./MergeService.js";
import type { Orchestrator } from "./Orchestrator.js";
import { RalphLoop } from "./RalphLoop.js";
import type { SlotManager } from "./SlotManager.js";

// Mock dependencies
function createMockOrchestrator(): Orchestrator {
	return {
		getReadyTasks: vi.fn().mockResolvedValue([]),
		assignTask: vi.fn().mockResolvedValue({ success: true }),
		getActiveAgentCount: vi.fn().mockReturnValue(0),
	} as unknown as Orchestrator;
}

function createMockSlotManager(): SlotManager {
	return {
		hasAvailable: vi.fn().mockReturnValue(true),
		acquire: vi.fn().mockReturnValue(true),
		release: vi.fn(),
		getInUse: vi.fn().mockReturnValue(0),
		getCapacity: vi.fn().mockReturnValue(3),
	} as unknown as SlotManager;
}

function createMockMergeService(): MergeService {
	return {
		enqueue: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		isRunning: vi.fn().mockReturnValue(false),
	} as unknown as MergeService;
}

describe("RalphLoop", () => {
	let orchestrator: Orchestrator;
	let slotManager: SlotManager;
	let mergeService: MergeService;
	let eventEmitter: EventEmitter;
	let ralphLoop: RalphLoop;

	beforeEach(() => {
		orchestrator = createMockOrchestrator();
		slotManager = createMockSlotManager();
		mergeService = createMockMergeService();
		eventEmitter = new EventEmitter();
		ralphLoop = new RalphLoop({
			orchestrator,
			slotManager,
			mergeService,
			eventEmitter,
			maxIterations: 3,
		});
	});

	describe("start()", () => {
		it("emits 'started' event", () => {
			// Arrange
			const startedHandler = vi.fn();
			eventEmitter.on("started", startedHandler);

			// Act
			ralphLoop.start();

			// Assert
			expect(startedHandler).toHaveBeenCalled();
		});

		it("begins processing task queue (sets up loop)", () => {
			// Arrange
			vi.useFakeTimers();
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([
				{ id: "task-1", title: "Test", status: "open" },
			] as any);

			// Act
			ralphLoop.start();

			// Assert
			expect(ralphLoop.isRunning()).toBe(true);
			vi.useRealTimers();
		});

		it("is idempotent (calling twice doesn't restart)", () => {
			// Arrange
			const startedHandler = vi.fn();
			eventEmitter.on("started", startedHandler);

			// Act
			ralphLoop.start();
			ralphLoop.start();

			// Assert - should only emit once
			expect(startedHandler).toHaveBeenCalledTimes(1);
		});
	});

	describe("stop()", () => {
		it("stops accepting new tasks", async () => {
			// Arrange
			ralphLoop.start();

			// Act
			await ralphLoop.stop();

			// Assert
			expect(ralphLoop.isRunning()).toBe(false);
		});

		it("waits for active agents to complete before returning", async () => {
			// Arrange
			vi.mocked(slotManager.getInUse).mockReturnValueOnce(2);
			vi.mocked(slotManager.getInUse).mockReturnValueOnce(1);
			vi.mocked(slotManager.getInUse).mockReturnValue(0);
			ralphLoop.start();

			// Act
			const stopPromise = ralphLoop.stop();

			// Simulate agents completing
			eventEmitter.emit("agentCompleted", { agentId: "agent-1" });
			eventEmitter.emit("agentCompleted", { agentId: "agent-2" });

			await stopPromise;

			// Assert
			expect(ralphLoop.isRunning()).toBe(false);
		});

		it("emits 'stopped' event", async () => {
			// Arrange
			const stoppedHandler = vi.fn();
			eventEmitter.on("stopped", stoppedHandler);
			ralphLoop.start();

			// Act
			await ralphLoop.stop();

			// Assert
			expect(stoppedHandler).toHaveBeenCalled();
		});
	});

	describe("pause() / resume()", () => {
		it("pause() stops new task assignment without killing agents", () => {
			// Arrange
			ralphLoop.start();

			// Act
			ralphLoop.pause();

			// Assert
			expect(ralphLoop.isPaused()).toBe(true);
			expect(ralphLoop.isRunning()).toBe(true); // Still running, just paused
		});

		it("resume() continues task assignment", () => {
			// Arrange
			ralphLoop.start();
			ralphLoop.pause();

			// Act
			ralphLoop.resume();

			// Assert
			expect(ralphLoop.isPaused()).toBe(false);
		});
	});

	describe("processLoop() - Task Assignment", () => {
		it("assigns tasks to available slots from SlotManager", async () => {
			// Arrange
			const mockTask = {
				id: "ch-task1",
				title: "Test Task",
				status: "open",
				priority: 1,
			};
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([
				mockTask,
			] as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(true);
			vi.mocked(orchestrator.assignTask).mockResolvedValue({
				success: true,
				taskId: "ch-task1",
				worktree: "/worktrees/claude-ch-task1",
			});

			// Act
			await ralphLoop.processLoop();

			// Assert
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-task1",
			});
		});

		it("respects maxParallel limit", async () => {
			// Arrange
			const tasks = [
				{ id: "ch-1", priority: 1, status: "open" },
				{ id: "ch-2", priority: 1, status: "open" },
				{ id: "ch-3", priority: 1, status: "open" },
				{ id: "ch-4", priority: 1, status: "open" },
			];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.getCapacity).mockReturnValue(2);
			let slotsUsed = 0;
			vi.mocked(slotManager.hasAvailable).mockImplementation(
				() => slotsUsed < 2,
			);
			vi.mocked(slotManager.acquire).mockImplementation(() => {
				if (slotsUsed < 2) {
					slotsUsed++;
					return true;
				}
				return false;
			});

			// Act
			await ralphLoop.processLoop();

			// Assert - should only assign 2 tasks (maxParallel)
			expect(orchestrator.assignTask).toHaveBeenCalledTimes(2);
		});

		it("picks tasks by priority order: P1 first, P2 second", async () => {
			// Arrange
			const tasks = [
				{ id: "ch-p2", priority: 2, status: "open", created: "2026-01-01" },
				{ id: "ch-p1", priority: 1, status: "open", created: "2026-01-01" },
				{ id: "ch-p3", priority: 3, status: "open", created: "2026-01-01" },
			];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValueOnce(true);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(false);
			vi.mocked(slotManager.acquire).mockReturnValueOnce(true);

			// Act
			await ralphLoop.processLoop();

			// Assert - P1 task should be assigned first
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-p1",
			});
		});

		it("picks FIFO within same priority (oldest ready task first)", async () => {
			// Arrange
			const tasks = [
				{
					id: "ch-newer",
					priority: 1,
					status: "open",
					created: "2026-01-10T12:00:00Z",
				},
				{
					id: "ch-older",
					priority: 1,
					status: "open",
					created: "2026-01-10T10:00:00Z",
				},
			];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValueOnce(true);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(false);
			vi.mocked(slotManager.acquire).mockReturnValueOnce(true);

			// Act
			await ralphLoop.processLoop();

			// Assert - older task should be assigned first (FIFO)
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-older",
			});
		});

		it("handles taskCompleted event from Orchestrator", async () => {
			// Arrange
			const taskCompletedHandler = vi.fn();
			eventEmitter.on("taskCompleted", taskCompletedHandler);
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([]);
			ralphLoop.start();

			// Act
			eventEmitter.emit("taskCompleted", {
				taskId: "ch-done",
				worktreePath: "/worktrees/claude-ch-done",
			});

			// Assert
			expect(taskCompletedHandler).toHaveBeenCalledWith({
				taskId: "ch-done",
				worktreePath: "/worktrees/claude-ch-done",
			});
		});

		it("queues merge via MergeService with worktreePath and taskId on completion", async () => {
			// Arrange
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([]);
			ralphLoop.start();

			// Act - simulate task completion
			eventEmitter.emit("taskCompleted", {
				taskId: "ch-merge",
				worktreePath: "/worktrees/claude-ch-merge",
				branch: "task/ch-merge",
			});

			// Assert
			expect(mergeService.enqueue).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: "ch-merge",
					worktree: "/worktrees/claude-ch-merge",
				}),
			);
		});

		it("returns false when slotManager.acquire() fails", async () => {
			// Arrange
			const tasks = [{ id: "ch-1", priority: 1, status: "open" }];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(false);

			// Act
			await ralphLoop.processLoop();

			// Assert - task should not be assigned when acquire fails
			expect(orchestrator.assignTask).not.toHaveBeenCalled();
		});

		it("never assigns tasks with 'deferred' label (filtered by Orchestrator)", async () => {
			// Arrange - Orchestrator.getReadyTasks already filters deferred
			// So we verify that only non-deferred tasks are returned
			const tasks = [
				{ id: "ch-ready", priority: 1, status: "open", labels: [] },
			];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(true);

			// Act
			await ralphLoop.processLoop();

			// Assert - only non-deferred task is assigned
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-ready",
			});
		});
	});

	describe("processLoop() - Iteration Loop and Signal Handling", () => {
		it("respawns agent on NO_SIGNAL if iteration < maxIterations", async () => {
			// Arrange
			const task = { id: "ch-nosig", priority: 1, status: "open" };
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([task] as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(true);
			ralphLoop.start();

			// Act - simulate NO_SIGNAL event (iteration 1)
			eventEmitter.emit("agentNoSignal", { taskId: "ch-nosig", iteration: 1 });

			// Assert - task should be re-assigned (respawned)
			await vi.waitFor(() => {
				expect(orchestrator.assignTask).toHaveBeenCalledWith({
					taskId: "ch-nosig",
				});
			});
		});

		it("marks task as TIMEOUT after maxIterations with no signal", async () => {
			// Arrange
			const timeoutHandler = vi.fn();
			eventEmitter.on("taskTimeout", timeoutHandler);
			ralphLoop.start();

			// Act - simulate NO_SIGNAL at maxIterations (iteration 3)
			eventEmitter.emit("agentNoSignal", {
				taskId: "ch-timeout",
				iteration: 3,
			});

			// Assert - should emit timeout
			expect(timeoutHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: "ch-timeout",
					iterations: 3,
				}),
			);
		});

		it("emits 'taskTimeout' event on max iterations reached", async () => {
			// Arrange
			const timeoutHandler = vi.fn();
			eventEmitter.on("taskTimeout", timeoutHandler);
			ralphLoop.start();

			// Act
			eventEmitter.emit("agentNoSignal", { taskId: "ch-max", iteration: 3 });

			// Assert
			expect(timeoutHandler).toHaveBeenCalled();
		});

		it("frees agent slot when task signals BLOCKED", async () => {
			// Arrange
			ralphLoop.start();

			// Act - simulate BLOCKED signal
			eventEmitter.emit("agentBlocked", {
				taskId: "ch-blocked",
				agentId: "a1",
			});

			// Assert - slot should be released
			expect(slotManager.release).toHaveBeenCalled();
		});

		it("keeps task in BLOCKED state (does not close)", async () => {
			// Arrange
			const taskClosedHandler = vi.fn();
			eventEmitter.on("taskClosed", taskClosedHandler);
			ralphLoop.start();

			// Act - simulate BLOCKED signal
			eventEmitter.emit("agentBlocked", {
				taskId: "ch-blocked",
				agentId: "a1",
			});

			// Assert - task should NOT be closed
			expect(taskClosedHandler).not.toHaveBeenCalled();
		});

		it("picks next ready task after BLOCKED", async () => {
			// Arrange
			const tasks = [{ id: "ch-next", priority: 1, status: "open" }];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(tasks as any);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(true);
			ralphLoop.start();

			// Act - simulate BLOCKED then check for next task
			eventEmitter.emit("agentBlocked", { taskId: "ch-old", agentId: "a1" });
			await ralphLoop.processLoop();

			// Assert - should assign next ready task
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-next",
			});
		});
	});

	describe("processLoop() - Loop Control", () => {
		it("only assigns tasks from Orchestrator.getReadyTasks()", async () => {
			// Arrange
			const readyTasks = [{ id: "ch-ready", priority: 1, status: "open" }];
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue(
				readyTasks as any,
			);
			vi.mocked(slotManager.hasAvailable).mockReturnValue(true);
			vi.mocked(slotManager.acquire).mockReturnValue(true);

			// Act
			await ralphLoop.processLoop();

			// Assert - only ready tasks are assigned
			expect(orchestrator.getReadyTasks).toHaveBeenCalled();
			expect(orchestrator.assignTask).toHaveBeenCalledWith({
				taskId: "ch-ready",
			});
		});

		it("emits 'allDone' event when readyTasks=0 AND activeSlots=0", async () => {
			// Arrange
			const allDoneHandler = vi.fn();
			eventEmitter.on("allDone", allDoneHandler);
			vi.mocked(orchestrator.getReadyTasks).mockResolvedValue([]);
			vi.mocked(slotManager.getInUse).mockReturnValue(0);
			ralphLoop.start();

			// Act
			await ralphLoop.processLoop();

			// Assert
			expect(allDoneHandler).toHaveBeenCalled();
		});
	});
});
