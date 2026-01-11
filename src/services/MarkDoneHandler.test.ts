import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AgentStopper,
	MarkDoneHandler,
	type SlotManager,
	type StateUpdater,
	type TaskCloser,
} from "./MarkDoneHandler.js";

describe("MarkDoneHandler", () => {
	let handler: MarkDoneHandler;
	let mockTaskCloser: TaskCloser;
	let mockAgentStopper: AgentStopper;
	let mockSlotManager: SlotManager;
	let mockStateUpdater: StateUpdater;

	let mockCloseTask: ReturnType<typeof vi.fn>;
	let mockStopAgent: ReturnType<typeof vi.fn>;
	let mockGetSlotByTask: ReturnType<typeof vi.fn>;
	let mockReleaseSlot: ReturnType<typeof vi.fn>;
	let mockRefresh: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockCloseTask = vi.fn();
		mockTaskCloser = {
			closeTask: mockCloseTask as TaskCloser["closeTask"],
		};

		mockStopAgent = vi.fn();
		mockAgentStopper = {
			stopAgent: mockStopAgent as AgentStopper["stopAgent"],
		};

		mockGetSlotByTask = vi.fn();
		mockReleaseSlot = vi.fn();
		mockSlotManager = {
			getSlotByTask: mockGetSlotByTask as SlotManager["getSlotByTask"],
			releaseSlot: mockReleaseSlot as SlotManager["releaseSlot"],
		};

		mockRefresh = vi.fn();
		mockStateUpdater = {
			refresh: mockRefresh as StateUpdater["refresh"],
		};

		handler = new MarkDoneHandler(
			mockTaskCloser,
			mockAgentStopper,
			mockSlotManager,
			mockStateUpdater,
		);
	});

	describe("markDone", () => {
		it("returns early when taskId is null", async () => {
			// Arrange

			// Act
			await handler.markDone(null);

			// Assert
			expect(mockCloseTask).not.toHaveBeenCalled();
		});

		it("calls taskCloser.closeTask with taskId", async () => {
			// Arrange
			mockGetSlotByTask.mockReturnValue(null);

			// Act
			await handler.markDone("ch-001");

			// Assert
			expect(mockCloseTask).toHaveBeenCalledWith("ch-001");
		});

		it("calls agentStopper.stopAgent when task has agent", async () => {
			// Arrange
			mockGetSlotByTask.mockReturnValue({
				agentId: "agent-1",
				taskId: "ch-001",
			});
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });

			// Act
			await handler.markDone("ch-001");

			// Assert
			expect(mockStopAgent).toHaveBeenCalledWith("agent-1");
		});

		it("calls slotManager.releaseSlot after stopAgent", async () => {
			// Arrange
			mockGetSlotByTask.mockReturnValue({
				agentId: "agent-1",
				taskId: "ch-001",
			});
			mockStopAgent.mockResolvedValue({ success: true, message: "Stopped" });

			// Act
			await handler.markDone("ch-001");

			// Assert
			expect(mockReleaseSlot).toHaveBeenCalledWith("agent-1");
		});

		it("triggers state update after close", async () => {
			// Arrange
			mockGetSlotByTask.mockReturnValue(null);

			// Act
			await handler.markDone("ch-001");

			// Assert
			expect(mockRefresh).toHaveBeenCalled();
		});

		it("does not call stopAgent or releaseSlot when no agent on task", async () => {
			// Arrange
			mockGetSlotByTask.mockReturnValue(null);

			// Act
			await handler.markDone("ch-001");

			// Assert
			expect(mockStopAgent).not.toHaveBeenCalled();
			expect(mockReleaseSlot).not.toHaveBeenCalled();
		});
	});
});
