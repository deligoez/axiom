import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	AgentState,
	ChorusState,
	MergeQueueItem,
} from "../types/state.js";
import {
	type CommandRunner,
	type MergeQueueProvider,
	SessionRecovery,
	type StateProvider,
	type TaskReleaseProvider,
	type WorktreeManager,
} from "./SessionRecovery.js";

describe("SessionRecovery", () => {
	let recovery: SessionRecovery;
	let mockStateProvider: StateProvider;
	let mockMergeQueueProvider: MergeQueueProvider;
	let mockTaskProvider: TaskReleaseProvider;
	let mockWorktreeManager: WorktreeManager;
	let mockCommandRunner: CommandRunner;

	let mockLoad: ReturnType<typeof vi.fn>;
	let mockSave: ReturnType<typeof vi.fn>;
	let mockGetRunningAgents: ReturnType<typeof vi.fn>;
	let mockRemoveAgent: ReturnType<typeof vi.fn>;
	let mockEnqueue: ReturnType<typeof vi.fn>;
	let mockReopenTask: ReturnType<typeof vi.fn>;
	let mockRemoveWorktree: ReturnType<typeof vi.fn>;
	let mockRunCommand: ReturnType<typeof vi.fn>;

	const createMockState = (
		agents: Record<string, AgentState> = {},
	): ChorusState => ({
		version: "1.0",
		sessionId: "test-session",
		startedAt: Date.now(),
		mode: "semi-auto",
		paused: false,
		agents,
		mergeQueue: [],
		checkpoint: null,
		stats: {
			tasksCompleted: 0,
			tasksFailed: 0,
			mergesAuto: 0,
			mergesManual: 0,
			totalIterations: 0,
			totalRuntime: 0,
		},
	});

	const createMockAgent = (
		id: string,
		taskId: string,
		pid: number,
	): AgentState => ({
		id,
		type: "claude",
		pid,
		taskId,
		worktree: `/worktrees/${id}`,
		branch: `agent/claude/${taskId}`,
		iteration: 1,
		startedAt: Date.now(),
		status: "running",
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockLoad = vi.fn();
		mockSave = vi.fn();
		mockGetRunningAgents = vi.fn();
		mockRemoveAgent = vi.fn();
		mockStateProvider = {
			load: mockLoad as StateProvider["load"],
			save: mockSave as StateProvider["save"],
			getRunningAgents:
				mockGetRunningAgents as StateProvider["getRunningAgents"],
			removeAgent: mockRemoveAgent as StateProvider["removeAgent"],
		};

		mockEnqueue = vi.fn();
		mockMergeQueueProvider = {
			enqueue: mockEnqueue as MergeQueueProvider["enqueue"],
		};

		mockReopenTask = vi.fn();
		mockTaskProvider = {
			releaseTask: mockReopenTask as TaskReleaseProvider["releaseTask"],
		};

		mockRemoveWorktree = vi.fn();
		mockWorktreeManager = {
			remove: mockRemoveWorktree as WorktreeManager["remove"],
		};

		mockRunCommand = vi.fn();
		mockCommandRunner = {
			run: mockRunCommand as CommandRunner["run"],
		};

		recovery = new SessionRecovery(
			mockStateProvider,
			mockMergeQueueProvider,
			mockTaskProvider,
			mockWorktreeManager,
			mockCommandRunner,
		);
	});

	describe("needsRecovery", () => {
		it("returns true if state has agents with running status", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);

			// Act
			const result = await recovery.needsRecovery();

			// Assert
			expect(result).toBe(true);
		});

		it("returns false for clean/empty state", async () => {
			// Arrange
			mockLoad.mockReturnValue(createMockState({}));
			mockGetRunningAgents.mockReturnValue([]);

			// Act
			const result = await recovery.needsRecovery();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("recover", () => {
		it("loads persisted state from state.json", async () => {
			// Arrange
			mockLoad.mockReturnValue(createMockState({}));
			mockGetRunningAgents.mockReturnValue([]);

			// Act
			await recovery.recover();

			// Assert
			expect(mockLoad).toHaveBeenCalled();
		});

		it("kills orphan processes when PID exists", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);
			mockRunCommand.mockResolvedValue({ success: true, output: "" }); // PID exists

			// Act
			await recovery.recover();

			// Assert
			expect(mockRunCommand).toHaveBeenCalledWith("kill -0 12345");
			expect(mockRunCommand).toHaveBeenCalledWith("kill 12345");
		});

		it("logs error and continues if task reopen fails", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);
			mockRunCommand.mockRejectedValue({ code: "ESRCH" }); // Process gone
			mockReopenTask.mockRejectedValue(new Error("BD error"));

			// Act
			const result = await recovery.recover();

			// Assert
			expect(
				result.errors.some((e) => e.includes("Failed to check/kill PID 12345")),
			).toBe(true);
			expect(result.recovered).toBe(true);
		});

		it("returns crashed agent tasks to pending", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);
			// PID doesn't exist - ESRCH
			mockRunCommand.mockRejectedValue({ code: "ESRCH" });

			// Act
			await recovery.recover();

			// Assert
			expect(mockReopenTask).toHaveBeenCalledWith("ch-001");
		});

		it("returns RecoveryResult with restoredTasks, cleanedWorktrees, errors", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);
			mockRunCommand.mockRejectedValue({ code: "ESRCH" }); // Process gone

			// Act
			const result = await recovery.recover();

			// Assert
			expect(result).toEqual(
				expect.objectContaining({
					recovered: true,
					restoredTasks: ["ch-001"],
					cleanedWorktrees: expect.any(Array),
					resumedMergeItems: expect.any(Number),
					errors: expect.any(Array),
				}),
			);
		});
	});

	describe("processExists", () => {
		it("returns true when process is running", async () => {
			// Arrange
			mockRunCommand.mockResolvedValue({ success: true, output: "" });

			// Act
			const result = await recovery.processExists(12345);

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when process doesn't exist (ESRCH)", async () => {
			// Arrange
			mockRunCommand.mockRejectedValue({ code: "ESRCH" });

			// Act
			const result = await recovery.processExists(12345);

			// Assert
			expect(result).toBe(false);
		});

		it("returns true when permission denied (EACCES) - conservative", async () => {
			// Arrange
			mockRunCommand.mockRejectedValue({ code: "EACCES" });

			// Act
			const result = await recovery.processExists(12345);

			// Assert
			expect(result).toBe(true);
		});
	});

	describe("resumeMergeQueue", () => {
		it("re-enqueues pending items from state.mergeQueue", async () => {
			// Arrange
			const item: MergeQueueItem = {
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/agent-1",
				priority: 1,
				status: "pending",
				retries: 0,
				enqueuedAt: Date.now(),
			};
			const state = createMockState({});
			state.mergeQueue = [item];
			mockLoad.mockReturnValue(state);

			// Act
			const count = await recovery.resumeMergeQueue();

			// Assert
			expect(mockEnqueue).toHaveBeenCalledWith(item);
			expect(count).toBe(1);
		});

		it("skips items already processed", async () => {
			// Arrange
			const item: MergeQueueItem = {
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/agent-1",
				priority: 1,
				status: "merging", // Already being processed
				retries: 0,
				enqueuedAt: Date.now(),
			};
			const state = createMockState({});
			state.mergeQueue = [item];
			mockLoad.mockReturnValue(state);

			// Act
			const count = await recovery.resumeMergeQueue();

			// Assert
			expect(mockEnqueue).not.toHaveBeenCalled();
			expect(count).toBe(0);
		});
	});

	describe("handleAgentCrash", () => {
		it("stashes worktree changes and returns task to pending", async () => {
			// Arrange
			const agent = createMockAgent("agent-1", "ch-001", 12345);
			mockLoad.mockReturnValue(createMockState({ "agent-1": agent }));
			mockGetRunningAgents.mockReturnValue([agent]);

			// Act
			await recovery.handleAgentCrash("agent-1");

			// Assert
			expect(mockRunCommand).toHaveBeenCalledWith(
				expect.stringContaining("git stash"),
				expect.any(String),
			);
			expect(mockReopenTask).toHaveBeenCalledWith("ch-001");
			expect(mockRemoveAgent).toHaveBeenCalledWith("agent-1");
		});
	});

	describe("handleWorktreeBroken", () => {
		it("removes broken worktree with force", async () => {
			// Arrange

			// Act
			await recovery.handleWorktreeBroken("/worktrees/broken");

			// Assert
			expect(mockRemoveWorktree).toHaveBeenCalledWith("/worktrees/broken", {
				force: true,
			});
		});
	});

	describe("handleOrphanedWorktree", () => {
		it("removes worktree not in state", async () => {
			// Arrange
			mockLoad.mockReturnValue(createMockState({}));

			// Act
			await recovery.handleOrphanedWorktree("/worktrees/orphaned");

			// Assert
			expect(mockRemoveWorktree).toHaveBeenCalledWith("/worktrees/orphaned", {
				force: true,
			});
		});
	});
});
