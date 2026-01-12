import { describe, expect, it, vi } from "vitest";
import type { Signal } from "../types/signal.js";
import { AgentCompletionHandler } from "./AgentCompletionHandler.js";
import type { CompletionResultStorage } from "./CompletionResultStorage.js";
import type {
	QualityCommandsManager,
	RunResult,
} from "./QualityCommandsManager.js";

// Helper to create valid Signal
const createSignal = (type: "COMPLETE" | "BLOCKED" = "COMPLETE"): Signal => ({
	type,
	payload: "Done",
	raw: `::signal::${type}::Done::`,
});

// Mock factory helpers
const createMockQualityManager = (
	results: RunResult[] = [],
): QualityCommandsManager =>
	({
		runAll: vi.fn().mockResolvedValue(results),
	}) as unknown as QualityCommandsManager;

const createMockStorage = (): CompletionResultStorage =>
	({
		saveCompletionResult: vi.fn().mockResolvedValue(undefined),
	}) as unknown as CompletionResultStorage;

const createMockGitService = (changes: string = "") => ({
	getDiffStat: vi.fn().mockResolvedValue(changes),
});

const createMockTaskProvider = () => ({
	getTask: vi.fn().mockResolvedValue(null),
	claimTask: vi.fn().mockResolvedValue(undefined),
	releaseTask: vi.fn().mockResolvedValue(undefined),
	getReadyTasks: vi.fn().mockResolvedValue([]),
	closeTask: vi.fn().mockResolvedValue(undefined),
	getTaskStatus: vi.fn().mockResolvedValue(null),
	updateStatus: vi.fn().mockResolvedValue(undefined),
	getTaskLabels: vi.fn().mockResolvedValue([]),
	addLabel: vi.fn().mockResolvedValue(undefined),
	removeLabel: vi.fn().mockResolvedValue(undefined),
	addNote: vi.fn().mockResolvedValue(undefined),
	updateTask: vi.fn().mockResolvedValue(undefined),
});

const createMockEventEmitter = () => ({
	emit: vi.fn(),
});

const createMockMergeService = () => ({
	enqueue: vi.fn().mockResolvedValue(undefined),
});

describe("AgentCompletionHandler", () => {
	const defaultConfig = {
		autoApprove: {
			enabled: true,
			maxIterations: 3,
			requireQualityPass: true,
		},
	};

	describe("handleCompletion", () => {
		it("runs quality commands via QualityCommandsManager.runAll()", async () => {
			// Arrange
			const qualityManager = createMockQualityManager([
				{ name: "test", success: true, output: "", duration: 100 },
			]);
			const handler = new AgentCompletionHandler({
				qualityManager,
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider: createMockTaskProvider(),
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(qualityManager.runAll).toHaveBeenCalled();
		});

		it("collects git changes via git diff --stat", async () => {
			// Arrange
			const gitService = createMockGitService(
				"src/file.ts | 10 +++++-----\n1 file changed, 5 insertions(+), 5 deletions(-)",
			);
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(),
				storage: createMockStorage(),
				gitService,
				taskProvider: createMockTaskProvider(),
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(gitService.getDiffStat).toHaveBeenCalledWith("/test/worktree");
		});

		it("builds TaskCompletionResult with all data", async () => {
			// Arrange
			const storage = createMockStorage();
			const qualityResults: RunResult[] = [
				{ name: "test", success: true, output: "ok", duration: 100 },
			];
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(qualityResults),
				storage,
				gitService: createMockGitService("src/file.ts | 5 +++++"),
				taskProvider: createMockTaskProvider(),
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 2,
				duration: 5000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(storage.saveCompletionResult).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({
					taskId: "task-1",
					agentId: "agent-1",
					iterations: 2,
					duration: 5000,
					signal: expect.objectContaining({ type: "COMPLETE" }),
				}),
			);
		});

		it("saves completion result via CompletionResultStorage", async () => {
			// Arrange
			const storage = createMockStorage();
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(),
				storage,
				gitService: createMockGitService(),
				taskProvider: createMockTaskProvider(),
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(storage.saveCompletionResult).toHaveBeenCalledWith(
				"task-1",
				expect.any(Object),
			);
		});

		it("auto-approves and closes task when conditions met", async () => {
			// Arrange
			const taskProvider = createMockTaskProvider();
			const mergeService = createMockMergeService();
			const qualityResults: RunResult[] = [
				{ name: "test", success: true, output: "ok", duration: 100 },
			];
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(qualityResults),
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider,
				eventEmitter: createMockEventEmitter(),
				mergeService,
				config: {
					autoApprove: {
						enabled: true,
						maxIterations: 3,
						requireQualityPass: true,
					},
				},
			});

			// Act
			const result = await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
				branch: "agent/task-1",
			});

			// Assert
			expect(result.autoApproved).toBe(true);
			expect(taskProvider.closeTask).toHaveBeenCalledWith("task-1");
			expect(mergeService.enqueue).toHaveBeenCalled();
		});

		it("sets task to reviewing when not auto-approvable", async () => {
			// Arrange
			const taskProvider = createMockTaskProvider();
			const qualityResults: RunResult[] = [
				{ name: "test", success: false, output: "fail", duration: 100 },
			];
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(qualityResults),
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider,
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: {
					autoApprove: {
						enabled: true,
						maxIterations: 3,
						requireQualityPass: true,
					},
				},
			});

			// Act
			const result = await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(result.autoApproved).toBe(false);
			expect(taskProvider.updateStatus).toHaveBeenCalledWith(
				"task-1",
				"reviewing",
			);
			expect(taskProvider.closeTask).not.toHaveBeenCalled();
		});

		it("sends TASK_COMPLETED event to event emitter", async () => {
			// Arrange
			const eventEmitter = createMockEventEmitter();
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(),
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider: createMockTaskProvider(),
				eventEmitter,
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				"TASK_COMPLETED",
				expect.objectContaining({
					taskId: "task-1",
				}),
			);
		});

		it("does not auto-approve when auto-approve is disabled", async () => {
			// Arrange
			const taskProvider = createMockTaskProvider();
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager([
					{ name: "test", success: true, output: "ok", duration: 100 },
				]),
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider,
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: {
					autoApprove: {
						enabled: false,
						maxIterations: 3,
						requireQualityPass: true,
					},
				},
			});

			// Act
			const result = await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(result.autoApproved).toBe(false);
			expect(taskProvider.closeTask).not.toHaveBeenCalled();
		});

		it("does not auto-approve when iterations exceed max", async () => {
			// Arrange
			const taskProvider = createMockTaskProvider();
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager([
					{ name: "test", success: true, output: "ok", duration: 100 },
				]),
				storage: createMockStorage(),
				gitService: createMockGitService(),
				taskProvider,
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: {
					autoApprove: {
						enabled: true,
						maxIterations: 2,
						requireQualityPass: true,
					},
				},
			});

			// Act
			const result = await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 3, // Exceeds maxIterations
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(result.autoApproved).toBe(false);
			expect(taskProvider.updateStatus).toHaveBeenCalledWith(
				"task-1",
				"reviewing",
			);
		});
	});

	describe("git change parsing", () => {
		it("parses git diff --stat output into FileChange array", async () => {
			// Arrange
			const storage = createMockStorage();
			const gitService = createMockGitService(
				"src/file.ts  | 10 +++++++---\nsrc/new.ts   |  5 +++++\ndeleted.ts   |  3 ---\n3 files changed, 12 insertions(+), 6 deletions(-)",
			);
			const handler = new AgentCompletionHandler({
				qualityManager: createMockQualityManager(),
				storage,
				gitService,
				taskProvider: createMockTaskProvider(),
				eventEmitter: createMockEventEmitter(),
				mergeService: createMockMergeService(),
				config: defaultConfig,
			});

			// Act
			await handler.handleCompletion({
				taskId: "task-1",
				agentId: "agent-1",
				iterations: 1,
				duration: 1000,
				signal: createSignal(),
				worktreePath: "/test/worktree",
			});

			// Assert
			expect(storage.saveCompletionResult).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({
					changes: expect.arrayContaining([
						expect.objectContaining({ path: "src/file.ts" }),
					]),
				}),
			);
		});
	});
});
