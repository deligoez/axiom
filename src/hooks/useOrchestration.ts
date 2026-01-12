import type { SessionStats } from "../machines/chorus.machine.js";
import type { UseChorusMachineOptions } from "./useChorusMachine.js";
import { useChorusMachine } from "./useChorusMachine.js";

export type OrchestrationStatus = "idle" | "running" | "paused";

export interface UseOrchestrationReturn {
	// State (read-only)
	status: OrchestrationStatus;
	isPaused: boolean;
	isRunning: boolean;
	mode: "semi-auto" | "autopilot";
	agents: unknown[];
	stats: SessionStats;

	// Actions
	startTask: (taskId: string) => void;
	stopAgent: (agentId: string, taskId: string) => void;
	pause: () => void;
	resume: () => void;
	setMode: (mode: "semi-auto" | "autopilot") => void;
}

/**
 * useOrchestration - Hook for TUI orchestration integration
 *
 * Provides orchestration-specific state and actions from the ChorusMachine.
 * This is a focused wrapper around useChorusMachine for components that
 * only need orchestration concerns.
 */
export function useOrchestration(
	options: UseChorusMachineOptions,
): UseOrchestrationReturn {
	const machine = useChorusMachine(options);

	// Derive status from running/paused state
	const status: OrchestrationStatus = machine.isPaused
		? "paused"
		: machine.isRunning
			? "running"
			: "idle";

	// Get stats from snapshot context
	const stats: SessionStats = machine.snapshot?.context?.stats ?? {
		completed: 0,
		failed: 0,
		inProgress: 0,
	};

	return {
		// State
		status,
		isPaused: machine.isPaused,
		isRunning: machine.isRunning,
		mode: machine.mode,
		agents: machine.agents,
		stats,

		// Actions (alias startTask to spawnAgent for clearer API)
		startTask: machine.spawnAgent,
		stopAgent: machine.stopAgent,
		pause: machine.pause,
		resume: machine.resume,
		setMode: machine.setMode,
	};
}
