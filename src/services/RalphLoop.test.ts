import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
	} as unknown as SlotManager;
}

describe("RalphLoop", () => {
	let orchestrator: Orchestrator;
	let slotManager: SlotManager;
	let eventEmitter: EventEmitter;
	let ralphLoop: RalphLoop;

	beforeEach(() => {
		orchestrator = createMockOrchestrator();
		slotManager = createMockSlotManager();
		eventEmitter = new EventEmitter();
		ralphLoop = new RalphLoop({
			orchestrator,
			slotManager,
			eventEmitter,
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
});
