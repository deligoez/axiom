import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskEditor } from "./TaskEditor.js";

interface StopResult {
	success: boolean;
	message: string;
}

interface AgentSlot {
	agentId: string;
	taskId: string;
	pid: number;
	worktreePath: string;
}

interface AgentStopper {
	stopAgent(agentId: string): Promise<StopResult>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

interface Orchestrator {
	spawnAgentForTask(agentId: string, taskId: string): Promise<void>;
}

describe("TaskEditor", () => {
	let editor: TaskEditor;
	let mockAgentStopper: AgentStopper;
	let mockOrchestrator: Orchestrator;

	let mockStopAgent: ReturnType<typeof vi.fn>;
	let mockGetAgentForTask: ReturnType<typeof vi.fn>;
	let mockSpawnAgentForTask: ReturnType<typeof vi.fn>;

	const createMockSlot = (agentId: string, taskId: string): AgentSlot => ({
		agentId,
		taskId,
		pid: 12345,
		worktreePath: `/worktrees/${agentId}`,
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockStopAgent = vi.fn();
		mockGetAgentForTask = vi.fn();
		mockAgentStopper = {
			stopAgent: mockStopAgent as AgentStopper["stopAgent"],
			getAgentForTask: mockGetAgentForTask as AgentStopper["getAgentForTask"],
		};

		mockSpawnAgentForTask = vi.fn();
		mockOrchestrator = {
			spawnAgentForTask:
				mockSpawnAgentForTask as Orchestrator["spawnAgentForTask"],
		};

		editor = new TaskEditor(mockAgentStopper, mockOrchestrator);
	});

	describe("notifyTaskEdited", () => {
		it("with no agent returns success with message indicating no agent", async () => {
			// Arrange
			mockGetAgentForTask.mockReturnValue(null);

			// Act
			const result = await editor.notifyTaskEdited("ch-001");

			// Assert
			expect(result.success).toBe(true);
			expect(result.message).toContain("no agent");
		});

		it("with agent stops it via agentStopper.stopAgent()", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgentForTask.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });

			// Act
			await editor.notifyTaskEdited("ch-001");

			// Assert
			expect(mockStopAgent).toHaveBeenCalledWith("agent-1");
		});

		it("restarts agent via orchestrator.spawnAgentForTask()", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgentForTask.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });

			// Act
			await editor.notifyTaskEdited("ch-001");

			// Assert
			expect(mockSpawnAgentForTask).toHaveBeenCalledWith("agent-1", "ch-001");
		});

		it("returns affected agent ID in result", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgentForTask.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });

			// Act
			const result = await editor.notifyTaskEdited("ch-001");

			// Assert
			expect(result.affectedAgents).toContain("agent-1");
		});

		it("returns empty affectedAgents when no agent", async () => {
			// Arrange
			mockGetAgentForTask.mockReturnValue(null);

			// Act
			const result = await editor.notifyTaskEdited("ch-001");

			// Assert
			expect(result.affectedAgents).toEqual([]);
		});
	});

	describe("hasAgentForTask", () => {
		it("returns true when agent exists", () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgentForTask.mockReturnValue(slot);

			// Act
			const result = editor.hasAgentForTask("ch-001");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when no agent", () => {
			// Arrange
			mockGetAgentForTask.mockReturnValue(null);

			// Act
			const result = editor.hasAgentForTask("ch-001");

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("getAgentIdForTask", () => {
		it("returns agentId or null appropriately", () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgentForTask.mockReturnValue(slot);

			// Act
			const result = editor.getAgentIdForTask("ch-001");

			// Assert
			expect(result).toBe("agent-1");

			// Test null case
			mockGetAgentForTask.mockReturnValue(null);
			const nullResult = editor.getAgentIdForTask("ch-002");
			expect(nullResult).toBeNull();
		});
	});
});
