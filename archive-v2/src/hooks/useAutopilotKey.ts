import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseAutopilotKeyOptions {
	currentMode: "semi-auto" | "autopilot";
	isPaused?: boolean;
	onToggle?: (newMode: "semi-auto" | "autopilot") => void;
	onAutopilotStart?: () => void;
}

/**
 * useAutopilotKey - Handle 'a' key to start autopilot mode
 *
 * Only responds to lowercase 'a'.
 * Only triggers in semi-auto mode when not paused.
 * Calls onToggle with 'autopilot' and onAutopilotStart to begin RalphLoop.
 */
export function useAutopilotKey({
	currentMode,
	isPaused = false,
	onToggle,
	onAutopilotStart,
}: UseAutopilotKeyOptions): void {
	useInput(
		(input) => {
			// Only respond to lowercase 'a'
			if (input !== "a") {
				return;
			}

			// Only work in semi-auto mode
			if (currentMode === "autopilot") {
				return;
			}

			// Don't start if paused
			if (isPaused) {
				return;
			}

			// Switch to autopilot mode
			onToggle?.("autopilot");

			// Start RalphLoop
			onAutopilotStart?.();
		},
		{ isActive: getIsTTY() },
	);
}
