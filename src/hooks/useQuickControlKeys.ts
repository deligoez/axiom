import { useInput } from "ink";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface Task {
	id: string;
	status: string;
	custom?: Record<string, string>;
}

export interface AgentStopperProvider {
	stopAgentByTask(taskId: string): Promise<{ success: boolean } | null>;
}

export interface InterventionPanelProvider {
	open(mode: "redirect-select" | "edit-select" | "block-select"): void;
}

export interface BeadsCLIProvider {
	addLabel(taskId: string, label: string): Promise<void>;
}

export interface UseQuickControlKeysOptions {
	selectedTask: Task | null;
	agentStopper: AgentStopperProvider;
	interventionPanel: InterventionPanelProvider;
	beadsCLI: BeadsCLIProvider;
	onAction?: (action: string, taskId: string) => void;
	isDisabled?: boolean;
}

/**
 * useQuickControlKeys - Hook for app-level control keys (x, r, e, b)
 *
 * Provides quick access to agent/task control without opening intervention menu:
 * - 'x' - Stop agent working on selected task
 * - 'r' - Redirect agent (or skip if failed/timeout - F63m handles retry)
 * - 'e' - Edit selected task
 * - 'b' - Block selected task
 */
export function useQuickControlKeys({
	selectedTask,
	agentStopper,
	interventionPanel,
	beadsCLI,
	onAction,
	isDisabled = false,
}: UseQuickControlKeysOptions): void {
	useInput(
		(input) => {
			// Skip if disabled (e.g., modal is open)
			if (isDisabled) {
				return;
			}

			// Skip if no task selected
			if (!selectedTask) {
				return;
			}

			const task = selectedTask;

			// Check if task is failed/timeout (F63m handles retry for these)
			const isFailed = task.custom?.failed === "true";
			const isTimeout = task.custom?.timeout === "true";

			switch (input) {
				case "x":
					// Stop agent working on this task (if any)
					if (task.status === "in_progress") {
						agentStopper.stopAgentByTask(task.id);
						onAction?.("stop", task.id);
					}
					break;

				case "r":
					// Skip if failed/timeout - F63m handles retry
					if (isFailed || isTimeout) {
						return;
					}
					// Redirect agent to different task
					if (task.status === "in_progress") {
						interventionPanel.open("redirect-select");
					}
					break;

				case "e":
					// Edit task - opens edit dialog
					interventionPanel.open("edit-select");
					break;

				case "b":
					// Block task
					if (task.status === "open" || task.status === "in_progress") {
						// If in progress, stop agent first (handled by TaskBlocker service)
						beadsCLI.addLabel(task.id, "blocked");
						onAction?.("block", task.id);
					}
					break;
			}
		},
		{ isActive: getIsTTY() },
	);
}
