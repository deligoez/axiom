import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanReviewConfig } from "../types/config.js";
import type { PlanReviewResult, TaskUpdate } from "./PlanReviewLoop.js";
import { TaskUpdater } from "./TaskUpdater.js";

// Mock TaskProvider
const mockTaskProvider = {
	updateTask: vi.fn(),
	addLabel: vi.fn(),
	closeTask: vi.fn(),
};

// Mock OrchestrationStore for checking running agents
const mockOrchestrationStore = {
	getAgentByTaskId: vi.fn(),
};

function createMockConfig(
	overrides: Partial<PlanReviewConfig> = {},
): PlanReviewConfig {
	return {
		enabled: true,
		maxIterations: 3,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "none",
		requireApproval: ["redundant"],
		...overrides,
	};
}

function createMockResult(
	overrides: Partial<PlanReviewResult> = {},
): PlanReviewResult {
	return {
		iterations: 1,
		totalUpdates: [],
		redundantTasks: [],
		earlyStop: true,
		...overrides,
	};
}

function createUpdate(taskId: string, field = "description"): TaskUpdate {
	return {
		taskId,
		field,
		oldValue: "old value",
		newValue: "new value",
	};
}

describe("TaskUpdater", () => {
	let updater: TaskUpdater;
	let tempDir: string;

	beforeEach(() => {
		vi.clearAllMocks();
		mockTaskProvider.updateTask.mockResolvedValue(undefined);
		mockTaskProvider.addLabel.mockResolvedValue(undefined);
		mockTaskProvider.closeTask.mockResolvedValue(undefined);
		mockOrchestrationStore.getAgentByTaskId.mockReturnValue(null);

		// Create temp directory for pending updates
		tempDir = join("/tmp", `task-updater-test-${Date.now()}`);
		mkdirSync(join(tempDir, ".chorus"), { recursive: true });

		updater = new TaskUpdater({
			taskProvider: mockTaskProvider as never,
			orchestrationStore: mockOrchestrationStore as never,
			projectDir: tempDir,
		});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("applyTaskUpdates - Core Functionality", () => {
		it("processes review results and returns summary", async () => {
			// Arrange
			const result = createMockResult({
				totalUpdates: [createUpdate("ch-task1")],
			});
			const config = createMockConfig({ autoApply: "all" });

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(summary.applied).toHaveLength(1);
			expect(summary.pending).toHaveLength(0);
			expect(summary.queued).toHaveLength(0);
			expect(summary.failed).toHaveLength(0);
		});

		it("auto-applies changes matching autoApply level 'all'", async () => {
			// Arrange
			const result = createMockResult({
				totalUpdates: [
					createUpdate("ch-task1", "description"),
					createUpdate("ch-task2", "title"),
				],
			});
			const config = createMockConfig({ autoApply: "all" });

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(mockTaskProvider.updateTask).toHaveBeenCalledTimes(2);
			expect(summary.applied).toHaveLength(2);
		});

		it("auto-applies only minor changes when autoApply is 'minor'", async () => {
			// Arrange
			const result = createMockResult({
				totalUpdates: [
					createUpdate("ch-task1", "acceptance_criteria"), // minor
					createUpdate("ch-task2", "title"), // not minor
				],
			});
			const config = createMockConfig({ autoApply: "minor" });

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(summary.applied).toHaveLength(1);
			expect(summary.applied[0].field).toBe("acceptance_criteria");
			expect(summary.pending).toHaveLength(1);
			expect(summary.pending[0].field).toBe("title");
		});

		it("queues all changes when autoApply is 'none'", async () => {
			// Arrange
			const result = createMockResult({
				totalUpdates: [createUpdate("ch-task1")],
			});
			const config = createMockConfig({ autoApply: "none" });

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(mockTaskProvider.updateTask).not.toHaveBeenCalled();
			expect(summary.applied).toHaveLength(0);
			expect(summary.pending).toHaveLength(1);
		});

		it("applyUpdate modifies task via TaskProvider", async () => {
			// Arrange
			const update = createUpdate("ch-task1", "description");
			const result = createMockResult({ totalUpdates: [update] });
			const config = createMockConfig({ autoApply: "all" });

			// Act
			await updater.applyTaskUpdates(result, config);

			// Assert
			expect(mockTaskProvider.updateTask).toHaveBeenCalledWith(
				"ch-task1",
				"description",
				"new value",
			);
		});

		it("markRedundant closes task with 'redundant' label", async () => {
			// Arrange
			const result = createMockResult({
				redundantTasks: ["ch-old1", "ch-old2"],
			});
			// autoApply: all but redundant requires approval
			const config = createMockConfig({
				autoApply: "all",
				requireApproval: [],
			});

			// Act
			await updater.applyTaskUpdates(result, config);

			// Assert
			expect(mockTaskProvider.addLabel).toHaveBeenCalledWith(
				"ch-old1",
				"redundant",
			);
			expect(mockTaskProvider.closeTask).toHaveBeenCalledWith("ch-old1");
			expect(mockTaskProvider.addLabel).toHaveBeenCalledWith(
				"ch-old2",
				"redundant",
			);
			expect(mockTaskProvider.closeTask).toHaveBeenCalledWith("ch-old2");
		});

		it("queues redundant marking when requireApproval includes 'redundant'", async () => {
			// Arrange
			const result = createMockResult({
				redundantTasks: ["ch-old1"],
			});
			const config = createMockConfig({
				autoApply: "all",
				requireApproval: ["redundant"],
			});

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(mockTaskProvider.closeTask).not.toHaveBeenCalled();
			expect(summary.pending).toHaveLength(1);
			expect(summary.pending[0].field).toBe("_redundant");
		});

		it("returns summary with applied, pending, queued, failed", async () => {
			// Arrange
			mockTaskProvider.updateTask
				.mockResolvedValueOnce(undefined) // success
				.mockRejectedValueOnce(new Error("Update failed")); // failure

			const result = createMockResult({
				totalUpdates: [
					createUpdate("ch-task1"),
					createUpdate("ch-task2"),
					createUpdate("ch-task3"),
				],
			});
			const config = createMockConfig({ autoApply: "all" });

			// Mock: task3 is in progress
			mockOrchestrationStore.getAgentByTaskId.mockImplementation(
				(taskId: string) => (taskId === "ch-task3" ? { id: "agent-1" } : null),
			);

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(summary.applied).toHaveLength(1);
			expect(summary.failed).toHaveLength(1);
			expect(summary.failed[0].error).toBe("Update failed");
			expect(summary.queued).toHaveLength(1);
		});

		it("handles empty results gracefully", async () => {
			// Arrange
			const result = createMockResult();
			const config = createMockConfig();

			// Act
			const summary = await updater.applyTaskUpdates(result, config);

			// Assert
			expect(summary.applied).toHaveLength(0);
			expect(summary.pending).toHaveLength(0);
			expect(summary.queued).toHaveLength(0);
			expect(summary.failed).toHaveLength(0);
		});
	});

	describe("In-Progress Task Handling", () => {
		it("isTaskInProgress returns true when task has running agent", async () => {
			// Arrange
			mockOrchestrationStore.getAgentByTaskId.mockReturnValue({
				id: "agent-1",
				status: "running",
			});

			// Act
			const inProgress = await updater.isTaskInProgress("ch-task1");

			// Assert
			expect(inProgress).toBe(true);
		});

		it("queues in-progress task updates to pending-task-updates.json", async () => {
			// Arrange
			mockOrchestrationStore.getAgentByTaskId.mockReturnValue({
				id: "agent-1",
			});
			const result = createMockResult({
				totalUpdates: [createUpdate("ch-task1")],
			});
			const config = createMockConfig({ autoApply: "all" });

			// Act
			await updater.applyTaskUpdates(result, config);

			// Assert
			const pendingPath = join(tempDir, ".chorus", "pending-task-updates.json");
			expect(existsSync(pendingPath)).toBe(true);
		});

		it("getQueuedUpdates returns pending updates for a task", async () => {
			// Arrange - write some pending updates
			const pendingPath = join(tempDir, ".chorus", "pending-task-updates.json");
			const pending = {
				"ch-task1": [createUpdate("ch-task1", "description")],
				"ch-task2": [createUpdate("ch-task2", "title")],
			};
			writeFileSync(pendingPath, JSON.stringify(pending));

			// Act
			const updates = await updater.getQueuedUpdates("ch-task1");

			// Assert
			expect(updates).toHaveLength(1);
			expect(updates[0].taskId).toBe("ch-task1");
		});
	});
});
