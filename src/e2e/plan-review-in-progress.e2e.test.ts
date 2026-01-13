import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	PlanReviewResult,
	TaskUpdate,
} from "../services/PlanReviewLoop.js";
import { QueuedUpdateApplier } from "../services/QueuedUpdateApplier.js";
import { TaskUpdater } from "../services/TaskUpdater.js";
import type { PlanReviewConfig } from "../types/config.js";

/**
 * E2E tests for Plan Review with in-progress tasks.
 *
 * Verifies that when Plan Review wants to update a task that's
 * currently being worked on by an agent, the update is queued
 * rather than applied immediately.
 */
describe("E2E: Plan Review with In-Progress Task", () => {
	let testDir: string;
	let queuePath: string;
	let tasksInProgress: Set<string>;

	// Mock TaskProvider
	const mockTaskProvider = {
		updateTask: vi.fn().mockResolvedValue(undefined),
		labelAdd: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		listAll: vi.fn().mockResolvedValue([]),
	};

	// Mock OrchestrationStore - tracks in-progress tasks
	const mockOrchestrationStore = {
		getAgentByTaskId: vi.fn().mockImplementation((taskId: string) => {
			return tasksInProgress.has(taskId) ? { id: `agent-${taskId}` } : null;
		}),
	};

	function createConfig(
		overrides: Partial<PlanReviewConfig> = {},
	): PlanReviewConfig {
		return {
			enabled: true,
			maxIterations: 3,
			triggerOn: ["cross_cutting", "architectural"],
			autoApply: "all",
			requireApproval: [],
			...overrides,
		};
	}

	beforeEach(async () => {
		vi.clearAllMocks();
		testDir = await mkdtemp(join(tmpdir(), "chorus-plan-review-e2e-"));
		mkdirSync(join(testDir, ".chorus"), { recursive: true });
		queuePath = join(testDir, ".chorus", "pending-task-updates.json");
		tasksInProgress = new Set();
	});

	afterEach(async () => {
		try {
			await rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("queues update for in_progress task (not immediate)", async () => {
		// Arrange
		const taskA = "ch-taskA";
		tasksInProgress.add(taskA); // Task A is in progress

		const taskUpdater = new TaskUpdater({
			taskProvider: mockTaskProvider as never,
			orchestrationStore: mockOrchestrationStore as never,
			projectDir: testDir,
		});

		// Simulate Plan Review result that wants to update task A
		const reviewResult: PlanReviewResult = {
			iterations: 1,
			totalUpdates: [
				{
					taskId: taskA,
					field: "acceptance_criteria",
					oldValue: "old criteria",
					newValue: "updated criteria from cross-cutting learning",
				},
			],
			redundantTasks: [],
			earlyStop: true,
		};

		// Act
		const result = await taskUpdater.applyTaskUpdates(
			reviewResult,
			createConfig(),
		);

		// Assert
		expect(result.queued).toHaveLength(1);
		expect(result.queued[0].taskId).toBe(taskA);
		expect(result.applied).toHaveLength(0);
		expect(mockTaskProvider.updateTask).not.toHaveBeenCalled();
	});

	it("creates queue file with correct update structure", async () => {
		// Arrange
		const taskA = "ch-taskA";
		tasksInProgress.add(taskA);

		const taskUpdater = new TaskUpdater({
			taskProvider: mockTaskProvider as never,
			orchestrationStore: mockOrchestrationStore as never,
			projectDir: testDir,
		});

		const reviewResult: PlanReviewResult = {
			iterations: 1,
			totalUpdates: [
				{
					taskId: taskA,
					field: "description",
					oldValue: "old desc",
					newValue: "new desc",
				},
			],
			redundantTasks: [],
			earlyStop: true,
		};

		// Act
		await taskUpdater.applyTaskUpdates(reviewResult, createConfig());

		// Assert
		const queueContent = JSON.parse(readFileSync(queuePath, "utf-8"));
		expect(queueContent[taskA]).toBeDefined();
		expect(queueContent[taskA]).toHaveLength(1);
		expect(queueContent[taskA][0]).toEqual({
			taskId: taskA,
			field: "description",
			oldValue: "old desc",
			newValue: "new desc",
		});
	});

	it("applies update immediately for open task", async () => {
		// Arrange
		const openTask = "ch-openTask";
		// openTask is NOT in tasksInProgress - it's open

		const taskUpdater = new TaskUpdater({
			taskProvider: mockTaskProvider as never,
			orchestrationStore: mockOrchestrationStore as never,
			projectDir: testDir,
		});

		const reviewResult: PlanReviewResult = {
			iterations: 1,
			totalUpdates: [
				{
					taskId: openTask,
					field: "title",
					newValue: "Updated title",
				},
			],
			redundantTasks: [],
			earlyStop: true,
		};

		// Act
		const result = await taskUpdater.applyTaskUpdates(
			reviewResult,
			createConfig(),
		);

		// Assert
		expect(result.applied).toHaveLength(1);
		expect(result.queued).toHaveLength(0);
		expect(mockTaskProvider.updateTask).toHaveBeenCalledWith(
			openTask,
			"title",
			"Updated title",
		);
	});

	it("applies queued update at next iteration via QueuedUpdateApplier", async () => {
		// Arrange - First queue an update
		const taskA = "ch-taskA";
		const queuedUpdate: TaskUpdate = {
			taskId: taskA,
			field: "acceptance_criteria",
			oldValue: "old",
			newValue: "new criteria",
		};
		writeFileSync(queuePath, JSON.stringify({ [taskA]: [queuedUpdate] }));

		const applier = new QueuedUpdateApplier({
			queuePath,
			taskProvider: mockTaskProvider as never,
		});

		// Act - Simulate next iteration applying queued updates
		const applied = await applier.applyAndClearUpdates(taskA);

		// Assert
		expect(applied).toHaveLength(1);
		expect(applied[0].field).toBe("acceptance_criteria");
		expect(mockTaskProvider.updateTask).toHaveBeenCalledWith(
			taskA,
			"acceptance_criteria",
			"new criteria",
		);
	});

	it("clears queue after successful application", async () => {
		// Arrange
		const taskA = "ch-taskA";
		const taskB = "ch-taskB";
		writeFileSync(
			queuePath,
			JSON.stringify({
				[taskA]: [{ taskId: taskA, field: "f1", newValue: "v1" }],
				[taskB]: [{ taskId: taskB, field: "f2", newValue: "v2" }],
			}),
		);

		const applier = new QueuedUpdateApplier({
			queuePath,
			taskProvider: mockTaskProvider as never,
		});

		// Act
		await applier.applyAndClearUpdates(taskA);

		// Assert - taskA cleared, taskB remains
		const remaining = JSON.parse(readFileSync(queuePath, "utf-8"));
		expect(remaining[taskA]).toBeUndefined();
		expect(remaining[taskB]).toBeDefined();
	});

	it("applies multiple queued updates in order", async () => {
		// Arrange
		const taskA = "ch-taskA";
		const updates: TaskUpdate[] = [
			{ taskId: taskA, field: "title", newValue: "title1" },
			{ taskId: taskA, field: "description", newValue: "desc1" },
			{ taskId: taskA, field: "acceptance_criteria", newValue: "criteria1" },
		];
		writeFileSync(queuePath, JSON.stringify({ [taskA]: updates }));

		const applier = new QueuedUpdateApplier({
			queuePath,
			taskProvider: mockTaskProvider as never,
		});

		// Act
		const applied = await applier.applyAndClearUpdates(taskA);

		// Assert - all updates applied in order
		expect(applied).toHaveLength(3);
		expect(mockTaskProvider.updateTask).toHaveBeenCalledTimes(3);

		// Verify order
		const calls = mockTaskProvider.updateTask.mock.calls;
		expect(calls[0]).toEqual([taskA, "title", "title1"]);
		expect(calls[1]).toEqual([taskA, "description", "desc1"]);
		expect(calls[2]).toEqual([taskA, "acceptance_criteria", "criteria1"]);
	});
});
