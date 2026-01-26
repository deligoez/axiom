export interface TaskCloser {
	closeTask(taskId: string): Promise<void>;
}

export interface AgentStopper {
	stopAgent(agentId: string): Promise<{ success: boolean; message: string }>;
}

interface AgentSlot {
	agentId: string;
	taskId: string;
}

export interface SlotManager {
	getSlotByTask(taskId: string): AgentSlot | null;
	releaseSlot(agentId: string): void;
}

export interface StateUpdater {
	refresh(): void;
}

export class MarkDoneHandler {
	constructor(
		private taskCloser: TaskCloser,
		private agentStopper: AgentStopper,
		private slotManager: SlotManager,
		private stateUpdater: StateUpdater,
	) {}

	/**
	 * Mark a task as done
	 * - If agent is running on task, stop it first
	 * - Close the task via TaskCloser
	 * - Release the slot if agent was stopped
	 * - Trigger UI re-render
	 */
	async markDone(taskId: string | null): Promise<void> {
		// No-op when no task selected
		if (!taskId) {
			return;
		}

		// Check if agent is running on this task
		const slot = this.slotManager.getSlotByTask(taskId);

		if (slot) {
			// Stop the agent first
			await this.agentStopper.stopAgent(slot.agentId);

			// Release the slot
			this.slotManager.releaseSlot(slot.agentId);
		}

		// Close the task
		await this.taskCloser.closeTask(taskId);

		// Trigger UI re-render
		this.stateUpdater.refresh();
	}
}
