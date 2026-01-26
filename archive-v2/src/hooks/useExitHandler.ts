import { useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

const GRACE_PERIOD_SECONDS = 30;

export interface SlotManagerProvider {
	getInUse: () => number;
}

export interface AgentStopperProvider {
	stopAll: () => Promise<{ success: boolean; affectedAgents: string[] }>;
}

export interface UseExitHandlerOptions {
	slotManager: SlotManagerProvider;
	agentStopper: AgentStopperProvider;
	onExit: () => void;
	isDisabled?: boolean;
}

export interface ExitDialogState {
	visible: boolean;
	countdown: number;
	action: "pending" | "killing" | "waiting";
	agentCount: number;
}

export interface UseExitHandlerReturn {
	dialogState: ExitDialogState;
	confirmKill: () => void;
	confirmWait: () => void;
	cancelExit: () => void;
}

/**
 * useExitHandler - Hook for handling 'q' key to quit TUI with confirmation
 *
 * Behavior:
 * - 'q' with no running agents: exits immediately
 * - 'q' with running agents: shows confirmation dialog
 * - In dialog: 'k' kills all and exits, 'w' waits for agents, ESC cancels
 * - Grace period: 30s countdown before force-kill
 */
export function useExitHandler({
	slotManager,
	agentStopper,
	onExit,
	isDisabled = false,
}: UseExitHandlerOptions): UseExitHandlerReturn {
	const [dialogState, setDialogState] = useState<ExitDialogState>({
		visible: false,
		countdown: GRACE_PERIOD_SECONDS,
		action: "pending",
		agentCount: 0,
	});

	const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const checkAgentsRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Cleanup intervals on unmount
	useEffect(() => {
		return () => {
			if (countdownRef.current) {
				clearInterval(countdownRef.current);
			}
			if (checkAgentsRef.current) {
				clearInterval(checkAgentsRef.current);
			}
		};
	}, []);

	// Handle countdown and force-kill at 0
	useEffect(() => {
		if (dialogState.visible && dialogState.action === "pending") {
			countdownRef.current = setInterval(() => {
				setDialogState((prev) => {
					if (prev.countdown <= 1) {
						// Time's up - force kill
						if (countdownRef.current) {
							clearInterval(countdownRef.current);
						}
						agentStopper.stopAll().then(() => onExit());
						return { ...prev, countdown: 0, action: "killing" };
					}
					return { ...prev, countdown: prev.countdown - 1 };
				});
			}, 1000);

			return () => {
				if (countdownRef.current) {
					clearInterval(countdownRef.current);
				}
			};
		}
	}, [dialogState.visible, dialogState.action, agentStopper, onExit]);

	// In waiting mode, check if all agents have finished
	useEffect(() => {
		if (dialogState.action === "waiting") {
			checkAgentsRef.current = setInterval(() => {
				if (slotManager.getInUse() === 0) {
					if (checkAgentsRef.current) {
						clearInterval(checkAgentsRef.current);
					}
					onExit();
				}
			}, 500);

			return () => {
				if (checkAgentsRef.current) {
					clearInterval(checkAgentsRef.current);
				}
			};
		}
	}, [dialogState.action, slotManager, onExit]);

	const confirmKill = useCallback(async () => {
		// Clear countdown
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
		}

		setDialogState((prev) => ({ ...prev, action: "killing" }));
		await agentStopper.stopAll();
		onExit();
	}, [agentStopper, onExit]);

	const confirmWait = useCallback(() => {
		// Clear countdown - we're waiting for agents instead
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
		}

		setDialogState((prev) => ({ ...prev, action: "waiting" }));
	}, []);

	const cancelExit = useCallback(() => {
		// Clear countdown
		if (countdownRef.current) {
			clearInterval(countdownRef.current);
		}
		if (checkAgentsRef.current) {
			clearInterval(checkAgentsRef.current);
		}

		// Reset state
		setDialogState({
			visible: false,
			countdown: GRACE_PERIOD_SECONDS,
			action: "pending",
			agentCount: 0,
		});
	}, []);

	// Handle keyboard input
	useInput(
		(input, key) => {
			if (isDisabled) {
				return;
			}

			// Dialog is visible - handle dialog keys
			if (dialogState.visible) {
				if (input === "k") {
					confirmKill();
					return;
				}
				if (input === "w") {
					confirmWait();
					return;
				}
				if (key.escape) {
					cancelExit();
					return;
				}
				return;
			}

			// 'q' key to initiate quit
			if (input === "q") {
				const runningAgents = slotManager.getInUse();

				if (runningAgents === 0) {
					// No agents running - exit immediately
					onExit();
					return;
				}

				// Show confirmation dialog
				setDialogState({
					visible: true,
					countdown: GRACE_PERIOD_SECONDS,
					action: "pending",
					agentCount: runningAgents,
				});
			}
		},
		{ isActive: getIsTTY() },
	);

	return {
		dialogState,
		confirmKill,
		confirmWait,
		cancelExit,
	};
}
