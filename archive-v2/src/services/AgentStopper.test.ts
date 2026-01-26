import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskProvider } from "../types/task-provider.js";
import {
	type AgentSlot,
	AgentStopper,
	type AgentTracker,
	type CommandRunner,
	type ProcessKiller,
} from "./AgentStopper.js";

describe("AgentStopper", () => {
	let stopper: AgentStopper;
	let mockAgentTracker: AgentTracker;
	let mockTaskProvider: TaskProvider;
	let mockProcessKiller: ProcessKiller;
	let mockCommandRunner: CommandRunner;

	let mockGetAgent: ReturnType<typeof vi.fn>;
	let mockGetAgentByTask: ReturnType<typeof vi.fn>;
	let mockGetAllAgents: ReturnType<typeof vi.fn>;
	let mockRemoveAgent: ReturnType<typeof vi.fn>;
	let mockReleaseTask: ReturnType<typeof vi.fn>;
	let mockKill: ReturnType<typeof vi.fn>;
	let mockRun: ReturnType<typeof vi.fn>;

	const createMockSlot = (
		agentId: string,
		taskId: string,
		pid: number,
	): AgentSlot => ({
		agentId,
		taskId,
		pid,
		worktreePath: `/worktrees/${agentId}`,
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockGetAgent = vi.fn();
		mockGetAgentByTask = vi.fn();
		mockGetAllAgents = vi.fn();
		mockRemoveAgent = vi.fn();
		mockAgentTracker = {
			getAgent: mockGetAgent as AgentTracker["getAgent"],
			getAgentByTask: mockGetAgentByTask as AgentTracker["getAgentByTask"],
			getAllAgents: mockGetAllAgents as AgentTracker["getAllAgents"],
			removeAgent: mockRemoveAgent as AgentTracker["removeAgent"],
		};

		mockReleaseTask = vi.fn().mockResolvedValue(undefined);
		mockTaskProvider = {
			releaseTask: mockReleaseTask,
		} as unknown as TaskProvider;

		mockKill = vi.fn();
		mockProcessKiller = {
			kill: mockKill as ProcessKiller["kill"],
		};

		mockRun = vi.fn();
		mockCommandRunner = {
			run: mockRun as CommandRunner["run"],
		};

		stopper = new AgentStopper(
			mockAgentTracker,
			mockTaskProvider,
			mockProcessKiller,
			mockCommandRunner,
		);
	});

	describe("stopAgent", () => {
		it("kills process", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgent.mockReturnValue(slot);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await stopper.stopAgent("agent-1");

			// Assert
			expect(mockKill).toHaveBeenCalledWith(12345);
		});

		it("stashes changes", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgent.mockReturnValue(slot);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await stopper.stopAgent("agent-1");

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				"git stash --include-untracked",
				"/worktrees/agent-1",
			);
		});

		it("calls releaseTask", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgent.mockReturnValue(slot);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await stopper.stopAgent("agent-1");

			// Assert
			expect(mockReleaseTask).toHaveBeenCalledWith("ch-001");
		});

		it("removes agent from tracker", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgent.mockReturnValue(slot);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await stopper.stopAgent("agent-1");

			// Assert
			expect(mockRemoveAgent).toHaveBeenCalledWith("agent-1");
		});

		it("returns error for unknown agent", async () => {
			// Arrange
			mockGetAgent.mockReturnValue(null);

			// Act
			const result = await stopper.stopAgent("unknown");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("not found");
		});
	});

	describe("stopAgentByTask", () => {
		it("returns null when no agent on task", async () => {
			// Arrange
			mockGetAgentByTask.mockReturnValue(null);

			// Act
			const result = await stopper.stopAgentByTask("ch-001");

			// Assert
			expect(result).toBeNull();
		});

		it("stops agent when found", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgentByTask.mockReturnValue(slot);
			mockGetAgent.mockReturnValue(slot);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const result = await stopper.stopAgentByTask("ch-001");

			// Assert
			expect(result?.success).toBe(true);
			expect(mockKill).toHaveBeenCalledWith(12345);
		});
	});

	describe("getAgentForTask", () => {
		it("returns slot when found", () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", 12345);
			mockGetAgentByTask.mockReturnValue(slot);

			// Act
			const result = stopper.getAgentForTask("ch-001");

			// Assert
			expect(result).toEqual(slot);
		});

		it("returns null when not found", () => {
			// Arrange
			mockGetAgentByTask.mockReturnValue(null);

			// Act
			const result = stopper.getAgentForTask("ch-unknown");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("stopAll", () => {
		it("stops all agents", async () => {
			// Arrange
			const slot1 = createMockSlot("agent-1", "ch-001", 12345);
			const slot2 = createMockSlot("agent-2", "ch-002", 12346);
			mockGetAllAgents.mockReturnValue([slot1, slot2]);
			mockGetAgent.mockImplementation((id: string) =>
				id === "agent-1" ? slot1 : slot2,
			);
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const result = await stopper.stopAll();

			// Assert
			expect(result.success).toBe(true);
			expect(mockKill).toHaveBeenCalledWith(12345);
			expect(mockKill).toHaveBeenCalledWith(12346);
			expect(result.affectedAgents).toEqual(["agent-1", "agent-2"]);
		});
	});

	describe("stashWorktreeChanges", () => {
		it("creates stash", async () => {
			// Arrange
			mockRun.mockResolvedValue({
				success: true,
				output: "Saved working directory",
			});

			// Act
			await stopper.stashWorktreeChanges("/worktrees/agent-1");

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				"git stash --include-untracked",
				"/worktrees/agent-1",
			);
		});

		it("handles no changes gracefully", async () => {
			// Arrange
			mockRun.mockResolvedValue({
				success: true,
				output: "No local changes to save",
			});

			// Act & Assert - should not throw
			await expect(
				stopper.stashWorktreeChanges("/worktrees/agent-1"),
			).resolves.not.toThrow();
		});
	});
});
