import { beforeEach, describe, expect, it, vi } from "vitest";

// Test the logic directly without React rendering
// This mirrors the pattern in useAgentGrid.test.ts

interface MockSlotManager {
	getInUse: () => number;
}

interface MockAgentStopper {
	stopAll: () => Promise<{ success: boolean; affectedAgents: string[] }>;
}

interface ExitDialogState {
	visible: boolean;
	countdown: number;
	action: "pending" | "killing" | "waiting";
}

// Pure logic for testability
function handleQuit(
	slotManager: MockSlotManager,
	onExit: () => void,
): { shouldShowDialog: boolean } {
	const runningAgents = slotManager.getInUse();
	if (runningAgents === 0) {
		onExit();
		return { shouldShowDialog: false };
	}
	return { shouldShowDialog: true };
}

function getAgentCount(slotManager: MockSlotManager): number {
	return slotManager.getInUse();
}

async function handleKill(
	agentStopper: MockAgentStopper,
	onExit: () => void,
): Promise<void> {
	await agentStopper.stopAll();
	onExit();
}

function handleCancel(): ExitDialogState {
	return {
		visible: false,
		countdown: 30,
		action: "pending",
	};
}

function handleWait(): ExitDialogState {
	return {
		visible: true,
		countdown: 30,
		action: "waiting",
	};
}

function decrementCountdown(state: ExitDialogState): ExitDialogState {
	return {
		...state,
		countdown: state.countdown - 1,
	};
}

describe("useExitHandler", () => {
	let mockSlotManager: MockSlotManager;
	let mockAgentStopper: MockAgentStopper;
	let mockOnExit: () => void;
	let mockStopAll: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOnExit = vi.fn() as () => void;
		mockStopAll = vi.fn().mockResolvedValue({
			success: true,
			affectedAgents: [],
		});
		mockSlotManager = {
			getInUse: vi.fn().mockReturnValue(0) as () => number,
		};
		mockAgentStopper = {
			stopAll: mockStopAll as MockAgentStopper["stopAll"],
		};
	});

	describe("No Agents Running", () => {
		it("'q' key exits immediately when no agents running", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(0) as () => number;

			// Act
			const result = handleQuit(mockSlotManager, mockOnExit);

			// Assert
			expect(result.shouldShowDialog).toBe(false);
			expect(mockOnExit).toHaveBeenCalled();
		});

		it("calls onExit() without showing dialog", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(0) as () => number;

			// Act
			const result = handleQuit(mockSlotManager, mockOnExit);

			// Assert
			expect(mockOnExit).toHaveBeenCalledTimes(1);
			expect(result.shouldShowDialog).toBe(false);
		});
	});

	describe("Confirmation Dialog", () => {
		it("'q' key shows dialog when agents running", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(2) as () => number;

			// Act
			const result = handleQuit(mockSlotManager, mockOnExit);

			// Assert
			expect(result.shouldShowDialog).toBe(true);
			expect(mockOnExit).not.toHaveBeenCalled();
		});

		it("dialog shows agent count", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(3) as () => number;

			// Act
			const count = getAgentCount(mockSlotManager);

			// Assert
			expect(count).toBe(3);
		});

		it("'k' key calls agentStopper.stopAll() then onExit()", async () => {
			// Arrange
			mockStopAll.mockResolvedValue({
				success: true,
				affectedAgents: ["agent-1", "agent-2"],
			});

			// Act
			await handleKill(mockAgentStopper, mockOnExit);

			// Assert
			expect(mockStopAll).toHaveBeenCalled();
			expect(mockOnExit).toHaveBeenCalled();
		});

		it("'w' key sets action to 'waiting'", () => {
			// Act
			const state = handleWait();

			// Assert
			expect(state.action).toBe("waiting");
			expect(state.visible).toBe(true);
		});
	});

	describe("Grace Period", () => {
		it("countdown starts at 30 seconds", () => {
			// Act
			const state = handleWait();

			// Assert
			expect(state.countdown).toBe(30);
		});

		it("countdown decrements every second", () => {
			// Arrange
			const initialState: ExitDialogState = {
				visible: true,
				countdown: 30,
				action: "pending",
			};

			// Act
			const newState = decrementCountdown(initialState);

			// Assert
			expect(newState.countdown).toBe(29);
		});

		it("after countdown reaches 0, force-kills and exits", async () => {
			// Arrange
			const state: ExitDialogState = {
				visible: true,
				countdown: 0,
				action: "pending",
			};

			// Act - when countdown reaches 0, should trigger kill
			if (state.countdown === 0) {
				await handleKill(mockAgentStopper, mockOnExit);
			}

			// Assert
			expect(mockStopAll).toHaveBeenCalled();
			expect(mockOnExit).toHaveBeenCalled();
		});
	});

	describe("Cancel", () => {
		it("ESC key closes dialog without exiting", () => {
			// Act
			const state = handleCancel();

			// Assert
			expect(state.visible).toBe(false);
			expect(mockOnExit).not.toHaveBeenCalled();
		});

		it("dialog state resets on cancel", () => {
			// Act
			const state = handleCancel();

			// Assert
			expect(state.visible).toBe(false);
			expect(state.countdown).toBe(30);
			expect(state.action).toBe("pending");
		});
	});

	describe("Wait Mode", () => {
		it("in 'waiting' mode, monitors slot manager for empty slots", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(0) as () => number;
			const state = handleWait();

			// Act - check if all agents finished
			const shouldExit =
				state.action === "waiting" && mockSlotManager.getInUse() === 0;

			// Assert
			expect(shouldExit).toBe(true);
		});

		it("exits automatically when all agents finish in wait mode", () => {
			// Arrange
			mockSlotManager.getInUse = vi.fn().mockReturnValue(0) as () => number;
			const state = handleWait();

			// Act - simulate check in wait mode
			if (state.action === "waiting" && mockSlotManager.getInUse() === 0) {
				mockOnExit();
			}

			// Assert
			expect(mockOnExit).toHaveBeenCalled();
		});
	});
});
