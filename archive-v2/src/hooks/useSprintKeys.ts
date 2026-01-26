export interface UseSprintKeysOptions {
	isSprintRunning: boolean;
	onOpenPlanningPanel: () => void;
	onCancelPlanning: () => void;
	isPlanningPanelOpen: boolean;
	isDisabled?: boolean;
}

interface KeyInfo {
	shift: boolean;
	return: boolean;
	escape: boolean;
}

/**
 * Creates a key handler function for sprint keyboard bindings.
 * Exported for testability - the actual hook wraps this with useInput.
 */
export function createSprintKeyHandler(
	options: UseSprintKeysOptions,
): (input: string, key: KeyInfo) => void {
	return (input: string, key: KeyInfo) => {
		// Skip if disabled
		if (options.isDisabled) {
			return;
		}

		// Shift+S opens sprint planning panel
		if (input === "S" && key.shift) {
			// Guard: don't open if sprint is already running
			if (options.isSprintRunning) {
				return;
			}
			options.onOpenPlanningPanel();
			return;
		}

		// Esc cancels planning (only when panel is open)
		if (key.escape && options.isPlanningPanelOpen) {
			options.onCancelPlanning();
			return;
		}
	};
}
