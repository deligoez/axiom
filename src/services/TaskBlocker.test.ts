import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskBlocker } from "./TaskBlocker.js";

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
	stopAgentByTask(taskId: string): Promise<StopResult | null>;
	getAgentForTask(taskId: string): AgentSlot | null;
}

interface Task {
	id: string;
	status: string;
	labels: string[];
}

interface BeadsCLI {
	getTask(taskId: string): Promise<Task | null>;
	addLabel(taskId: string, label: string): Promise<void>;
	removeLabel(taskId: string, label: string): Promise<void>;
	updateStatus(taskId: string, status: string): Promise<void>;
	addNote(taskId: string, note: string): Promise<void>;
}

describe("TaskBlocker", () => {
	let blocker: TaskBlocker;
	let mockAgentStopper: AgentStopper;
	let mockBeadsCLI: BeadsCLI;

	let mockStopAgentByTask: ReturnType<typeof vi.fn>;
	let mockGetAgentForTask: ReturnType<typeof vi.fn>;
	let mockGetTask: ReturnType<typeof vi.fn>;
	let mockAddLabel: ReturnType<typeof vi.fn>;
	let mockRemoveLabel: ReturnType<typeof vi.fn>;
	let mockUpdateStatus: ReturnType<typeof vi.fn>;
	let mockAddNote: ReturnType<typeof vi.fn>;

	const createMockTask = (
		id: string,
		status: string,
		labels: string[] = [],
	): Task => ({
		id,
		status,
		labels,
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockStopAgentByTask = vi.fn();
		mockGetAgentForTask = vi.fn();
		mockAgentStopper = {
			stopAgentByTask: mockStopAgentByTask as AgentStopper["stopAgentByTask"],
			getAgentForTask: mockGetAgentForTask as AgentStopper["getAgentForTask"],
		};

		mockGetTask = vi.fn();
		mockAddLabel = vi.fn();
		mockRemoveLabel = vi.fn();
		mockUpdateStatus = vi.fn();
		mockAddNote = vi.fn();
		mockBeadsCLI = {
			getTask: mockGetTask as BeadsCLI["getTask"],
			addLabel: mockAddLabel as BeadsCLI["addLabel"],
			removeLabel: mockRemoveLabel as BeadsCLI["removeLabel"],
			updateStatus: mockUpdateStatus as BeadsCLI["updateStatus"],
			addNote: mockAddNote as BeadsCLI["addNote"],
		};

		blocker = new TaskBlocker(mockAgentStopper, mockBeadsCLI);
	});

	describe("blockTask", () => {
		it("stops running agent", async () => {
			// Arrange
			const task = createMockTask("ch-001", "in_progress");
			mockGetTask.mockResolvedValue(task);
			mockStopAgentByTask.mockResolvedValue({
				success: true,
				message: "Stopped",
			});
			mockGetAgentForTask.mockReturnValue({ agentId: "agent-1" });

			// Act
			await blocker.blockTask("ch-001", "Need to investigate");

			// Assert
			expect(mockStopAgentByTask).toHaveBeenCalledWith("ch-001");
		});

		it("adds blocked label", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open");
			mockGetTask.mockResolvedValue(task);
			mockStopAgentByTask.mockResolvedValue(null);

			// Act
			await blocker.blockTask("ch-001", "Need to investigate");

			// Assert
			expect(mockAddLabel).toHaveBeenCalledWith("ch-001", "blocked");
		});

		it("sets status to open if was in_progress", async () => {
			// Arrange
			const task = createMockTask("ch-001", "in_progress");
			mockGetTask.mockResolvedValue(task);
			mockStopAgentByTask.mockResolvedValue({
				success: true,
				message: "Stopped",
			});

			// Act
			await blocker.blockTask("ch-001", "Need to investigate");

			// Assert
			expect(mockUpdateStatus).toHaveBeenCalledWith("ch-001", "open");
		});

		it("records reason in task notes", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open");
			mockGetTask.mockResolvedValue(task);
			mockStopAgentByTask.mockResolvedValue(null);

			// Act
			await blocker.blockTask("ch-001", "Need to investigate");

			// Assert
			expect(mockAddNote).toHaveBeenCalledWith(
				"ch-001",
				expect.stringContaining("Need to investigate"),
			);
		});

		it("returns InterventionResult with stopped agent", async () => {
			// Arrange
			const task = createMockTask("ch-001", "in_progress");
			mockGetTask.mockResolvedValue(task);
			mockStopAgentByTask.mockResolvedValue({
				success: true,
				message: "Stopped",
			});
			mockGetAgentForTask.mockReturnValue({ agentId: "agent-1" });

			// Act
			const result = await blocker.blockTask("ch-001", "Need to investigate");

			// Assert
			expect(result.success).toBe(true);
			expect(result.type).toBe("block_task");
			expect(result.affectedAgents).toContain("agent-1");
			expect(result.affectedTasks).toContain("ch-001");
		});
	});

	describe("unblockTask", () => {
		it("removes blocked label", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open", ["blocked"]);
			mockGetTask.mockResolvedValue(task);

			// Act
			await blocker.unblockTask("ch-001");

			// Assert
			expect(mockRemoveLabel).toHaveBeenCalledWith("ch-001", "blocked");
		});

		it("returns success even if not blocked", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open", []);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await blocker.unblockTask("ch-001");

			// Assert
			expect(result.success).toBe(true);
		});
	});

	describe("isBlocked", () => {
		it("returns true when task has blocked label", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open", ["blocked", "m1-core"]);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await blocker.isBlocked("ch-001");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when task does not have blocked label", async () => {
			// Arrange
			const task = createMockTask("ch-001", "open", ["m1-core"]);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await blocker.isBlocked("ch-001");

			// Assert
			expect(result).toBe(false);
		});
	});
});
