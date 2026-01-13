import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRedirector } from "./AgentRedirector.js";

interface StopResult {
	success: boolean;
	message: string;
}

interface AgentSlot {
	agentId: string;
	taskId: string;
	pid: number;
	worktreePath: string;
	status: "running" | "idle" | "stopped";
}

interface AgentStopper {
	stopAgent(agentId: string): Promise<StopResult>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

interface RedirectorTask {
	id: string;
	title: string;
	priority: number;
	status: string;
	labels: string[];
	dependencies: string[];
	blockedBy: string[];
}

interface RedirectorTaskProvider {
	getTask(taskId: string): Promise<RedirectorTask | null>;
	claimTask(taskId: string, assignee: string): Promise<void>;
}

interface Orchestrator {
	spawnAgentForTask(agentId: string, taskId: string): Promise<void>;
	getAgent(agentId: string): AgentSlot | null;
}

describe("AgentRedirector", () => {
	let redirector: AgentRedirector;
	let mockAgentStopper: AgentStopper;
	let mockTaskProvider: RedirectorTaskProvider;
	let mockOrchestrator: Orchestrator;

	let mockStopAgent: ReturnType<typeof vi.fn>;
	let mockGetAgentForTask: ReturnType<typeof vi.fn>;
	let mockGetTask: ReturnType<typeof vi.fn>;
	let mockClaimTask: ReturnType<typeof vi.fn>;
	let mockSpawnAgentForTask: ReturnType<typeof vi.fn>;
	let mockGetAgent: ReturnType<typeof vi.fn>;

	const createMockTask = (
		id: string,
		status: string,
		labels: string[] = [],
		blockedBy: string[] = [],
	): RedirectorTask => ({
		id,
		title: `Task ${id}`,
		priority: 2,
		status,
		labels,
		dependencies: [],
		blockedBy,
	});

	const createMockSlot = (
		agentId: string,
		taskId: string,
		status: "running" | "idle" | "stopped" = "running",
	): AgentSlot => ({
		agentId,
		taskId,
		pid: 12345,
		worktreePath: `/worktrees/${agentId}`,
		status,
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockStopAgent = vi.fn();
		mockGetAgentForTask = vi.fn();
		mockAgentStopper = {
			stopAgent: mockStopAgent as AgentStopper["stopAgent"],
			getAgentForTask: mockGetAgentForTask as AgentStopper["getAgentForTask"],
		};

		mockGetTask = vi.fn();
		mockClaimTask = vi.fn();
		mockTaskProvider = {
			getTask: mockGetTask as RedirectorTaskProvider["getTask"],
			claimTask: mockClaimTask as RedirectorTaskProvider["claimTask"],
		};

		mockSpawnAgentForTask = vi.fn();
		mockGetAgent = vi.fn();
		mockOrchestrator = {
			spawnAgentForTask:
				mockSpawnAgentForTask as Orchestrator["spawnAgentForTask"],
			getAgent: mockGetAgent as Orchestrator["getAgent"],
		};

		redirector = new AgentRedirector(
			mockAgentStopper,
			mockTaskProvider,
			mockOrchestrator,
		);
	});

	describe("redirect", () => {
		it("stops current work via agentStopper", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(mockStopAgent).toHaveBeenCalledWith("agent-1");
		});

		it("validates task is open via taskProvider.getTask", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(mockGetTask).toHaveBeenCalledWith("ch-002");
		});

		it("fails for in_progress task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "in_progress"));

			// Act
			const result = await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("not open");
		});

		it("fails for blocked task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(
				createMockTask("ch-002", "open", [], ["ch-003"]),
			);

			// Act
			const result = await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("blocked");
		});

		it("fails for deferred task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(
				createMockTask("ch-002", "open", ["deferred"]),
			);

			// Act
			const result = await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("deferred");
		});

		it("claims new task after validation", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(mockClaimTask).toHaveBeenCalledWith("ch-002", "agent-1");
		});

		it("spawns agent for new task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(mockSpawnAgentForTask).toHaveBeenCalledWith("agent-1", "ch-002");
		});

		it("returns InterventionResult with both task IDs", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			const result = await redirector.redirect("agent-1", "ch-002");

			// Assert
			expect(result.success).toBe(true);
			expect(result.type).toBe("redirect_agent");
			expect(result.affectedTasks).toContain("ch-001");
			expect(result.affectedTasks).toContain("ch-002");
		});

		it("reuses same agent slot, does NOT spawn fresh agent", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001");
			mockGetAgent.mockReturnValue(slot);
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			await redirector.redirect("agent-1", "ch-002");

			// Assert
			// Verify the SAME agentId is passed to spawnAgentForTask
			expect(mockSpawnAgentForTask).toHaveBeenCalledWith("agent-1", "ch-002");
			// The first argument should be the same agentId, not a new one
			const [calledAgentId] = mockSpawnAgentForTask.mock.calls[0];
			expect(calledAgentId).toBe("agent-1");
		});
	});

	describe("canRedirect", () => {
		it("returns false for unknown agent", async () => {
			// Arrange
			mockGetAgent.mockReturnValue(null);

			// Act
			const result = await redirector.canRedirect("unknown", "ch-002");

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for non-running agent", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", "stopped");
			mockGetAgent.mockReturnValue(slot);

			// Act
			const result = await redirector.canRedirect("agent-1", "ch-002");

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for in_progress task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", "running");
			mockGetAgent.mockReturnValue(slot);
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "in_progress"));

			// Act
			const result = await redirector.canRedirect("agent-1", "ch-002");

			// Assert
			expect(result).toBe(false);
		});

		it("returns false for deferred task", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", "running");
			mockGetAgent.mockReturnValue(slot);
			mockGetTask.mockResolvedValue(
				createMockTask("ch-002", "open", ["deferred"]),
			);

			// Act
			const result = await redirector.canRedirect("agent-1", "ch-002");

			// Assert
			expect(result).toBe(false);
		});

		it("returns true when agent running AND task open AND not deferred", async () => {
			// Arrange
			const slot = createMockSlot("agent-1", "ch-001", "running");
			mockGetAgent.mockReturnValue(slot);
			mockGetTask.mockResolvedValue(createMockTask("ch-002", "open"));

			// Act
			const result = await redirector.canRedirect("agent-1", "ch-002");

			// Assert
			expect(result).toBe(true);
		});
	});
});
