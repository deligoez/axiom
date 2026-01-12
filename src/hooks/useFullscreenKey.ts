import { useInput } from "ink";
import type { Agent } from "../types/agent.js";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseFullscreenKeyOptions {
	selectedAgent: Agent | null;
	isFullscreen: boolean;
	scrollPosition: number;
	maxScroll: number;
	onToggleFullscreen?: () => void;
	onScroll?: (direction: "up" | "down") => void;
}

/**
 * useFullscreenKey - Hook for handling 'f' key to toggle agent fullscreen view
 *
 * Handles:
 * - f: Toggle fullscreen for selected agent
 * - Escape: Exit fullscreen (when in fullscreen)
 * - j/k: Scroll down/up in fullscreen mode
 */
export function useFullscreenKey({
	selectedAgent,
	isFullscreen,
	onToggleFullscreen,
	onScroll,
}: UseFullscreenKeyOptions): void {
	useInput(
		(input, key) => {
			// Toggle fullscreen with 'f' key
			if (input === "f") {
				// Need an agent selected to enter fullscreen
				if (!selectedAgent && !isFullscreen) {
					return;
				}
				onToggleFullscreen?.();
				return;
			}

			// Exit fullscreen with Escape (only in fullscreen mode)
			if (key.escape && isFullscreen) {
				onToggleFullscreen?.();
				return;
			}

			// Scroll controls only work in fullscreen mode
			if (!isFullscreen) {
				return;
			}

			// Scroll down with 'j'
			if (input === "j") {
				onScroll?.("down");
				return;
			}

			// Scroll up with 'k'
			if (input === "k") {
				onScroll?.("up");
				return;
			}
		},
		{ isActive: getIsTTY() },
	);
}
