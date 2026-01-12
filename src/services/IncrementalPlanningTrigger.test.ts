import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskProvider, TaskProviderTask } from "../types/task-provider.js";
import { IncrementalPlanningTrigger } from "./IncrementalPlanningTrigger.js";
import type { PlanAgent } from "./PlanAgent.js";
import type { PlanningHorizonManager } from "./PlanningHorizonManager.js";
import type { SpecEvolutionTracker } from "./SpecEvolutionTracker.js";

describe("IncrementalPlanningTrigger", () => {
	let trigger: IncrementalPlanningTrigger;
	let mockTaskProvider: TaskProvider;
	let mockHorizonManager: PlanningHorizonManager;
	let mockSpecTracker: SpecEvolutionTracker;
	let mockPlanAgent: PlanAgent;
	let eventEmitter: EventEmitter;

	const createMockTask = (id: string, title: string): TaskProviderTask => ({
		id,
		title,
		description: "",
		priority: 1,
		status: "open",
		labels: [],
		dependencies: [],
	});

	beforeEach(() => {
		mockTaskProvider = {
			getReadyTasks: vi.fn().mockResolvedValue([]),
		} as unknown as TaskProvider;

		mockHorizonManager = {
			getHorizonConfig: vi.fn().mockReturnValue({
				minReadyTasks: 3,
				stopConditions: ["specComplete", "decisionPoint"],
			}),
			getStopConditions: vi
				.fn()
				.mockReturnValue(["specComplete", "decisionPoint"]),
			shouldStopPlanning: vi.fn().mockReturnValue(false),
			advanceHorizon: vi.fn(),
		} as unknown as PlanningHorizonManager;

		mockSpecTracker = {
			getNextPlanningSection: vi.fn().mockReturnValue("Next Section"),
			isSpecComplete: vi.fn().mockReturnValue(false),
			markSectionTasked: vi.fn(),
		} as unknown as SpecEvolutionTracker;

		mockPlanAgent = {
			start: vi.fn().mockResolvedValue(undefined),
			send: vi.fn().mockResolvedValue("## Task 1: Test Task"),
			extractTasks: vi.fn().mockReturnValue([{ title: "Test Task" }]),
			stop: vi.fn().mockResolvedValue(undefined),
		} as unknown as PlanAgent;

		eventEmitter = new EventEmitter();

		trigger = new IncrementalPlanningTrigger({
			taskProvider: mockTaskProvider,
			horizonManager: mockHorizonManager,
			specTracker: mockSpecTracker,
			planAgent: mockPlanAgent,
			eventEmitter,
		});
	});

	describe("checkTriggerCondition", () => {
		it("should return true if ready count < minReadyTasks", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
				createMockTask("ch-2", "Task 2"),
			]);

			// Act
			const result = await trigger.checkTriggerCondition();

			// Assert
			expect(result).toBe(true);
		});

		it("should return false if ready count >= minReadyTasks", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
				createMockTask("ch-2", "Task 2"),
				createMockTask("ch-3", "Task 3"),
				createMockTask("ch-4", "Task 4"),
			]);

			// Act
			const result = await trigger.checkTriggerCondition();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("getReadyTaskCount", () => {
		it("should query Beads for ready task count", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
				createMockTask("ch-2", "Task 2"),
				createMockTask("ch-3", "Task 3"),
			]);

			// Act
			const count = await trigger.getReadyTaskCount();

			// Assert
			expect(count).toBe(3);
			expect(mockTaskProvider.getReadyTasks).toHaveBeenCalledWith({
				excludeLabels: ["deferred"],
			});
		});
	});

	describe("triggerPlanning", () => {
		it("should initiate Plan Agent for next spec section", async () => {
			// Arrange
			vi.mocked(mockSpecTracker.getNextPlanningSection).mockReturnValue(
				"## Features",
			);

			// Act
			await trigger.triggerPlanning();

			// Assert
			expect(mockPlanAgent.start).toHaveBeenCalled();
			expect(mockPlanAgent.send).toHaveBeenCalledWith(
				expect.stringContaining("## Features"),
			);
		});

		it("should emit planning:triggered event when planning starts", async () => {
			// Arrange
			const eventHandler = vi.fn();
			eventEmitter.on("planning:triggered", eventHandler);

			// Act
			await trigger.triggerPlanning();

			// Assert
			expect(eventHandler).toHaveBeenCalledWith({
				section: "Next Section",
			});
		});

		it("should emit planning:complete event when planning finishes", async () => {
			// Arrange
			const eventHandler = vi.fn();
			eventEmitter.on("planning:complete", eventHandler);
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue([
				{ title: "Task A" },
				{ title: "Task B" },
			]);

			// Act
			await trigger.triggerPlanning();

			// Assert
			expect(eventHandler).toHaveBeenCalledWith({
				section: "Next Section",
				taskCount: 2,
			});
		});

		it("should not trigger if spec is complete", async () => {
			// Arrange
			vi.mocked(mockSpecTracker.isSpecComplete).mockReturnValue(true);

			// Act
			const result = await trigger.triggerPlanning();

			// Assert
			expect(result).toBe(false);
			expect(mockPlanAgent.start).not.toHaveBeenCalled();
		});
	});

	describe("onTaskComplete", () => {
		it("should check if planning needed after task completion", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
			]);

			// Act
			await trigger.onTaskComplete("ch-done");

			// Assert
			expect(mockTaskProvider.getReadyTasks).toHaveBeenCalled();
		});

		it("should trigger planning if ready count drops below threshold", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
			]);

			// Act
			await trigger.onTaskComplete("ch-done");

			// Assert
			expect(mockPlanAgent.start).toHaveBeenCalled();
		});

		it("should not trigger planning if ready count is sufficient", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([
				createMockTask("ch-1", "Task 1"),
				createMockTask("ch-2", "Task 2"),
				createMockTask("ch-3", "Task 3"),
				createMockTask("ch-4", "Task 4"),
			]);

			// Act
			await trigger.onTaskComplete("ch-done");

			// Assert
			expect(mockPlanAgent.start).not.toHaveBeenCalled();
		});
	});

	describe("stopConditions", () => {
		it("should respect specComplete stop condition", async () => {
			// Arrange
			vi.mocked(mockHorizonManager.shouldStopPlanning).mockReturnValue(true);
			vi.mocked(mockSpecTracker.isSpecComplete).mockReturnValue(true);

			// Act
			const result = await trigger.triggerPlanning();

			// Assert
			expect(result).toBe(false);
		});

		it("should check stopConditions from PlanningHorizonManager", async () => {
			// Arrange
			vi.mocked(mockTaskProvider.getReadyTasks).mockResolvedValue([]);

			// Act
			await trigger.checkTriggerCondition();

			// Assert
			expect(mockHorizonManager.getHorizonConfig).toHaveBeenCalled();
		});
	});
});
