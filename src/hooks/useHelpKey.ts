import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseHelpKeyOptions {
	visible: boolean;
	onToggle: () => void;
	onClose?: () => void;
	isDisabled?: boolean;
}

/**
 * useHelpKey - Hook for handling help panel keyboard shortcuts
 *
 * Handles:
 * - '?' key to toggle help panel visibility
 * - ESC key to close help panel when visible
 * - Modal exclusivity via isDisabled prop
 */
export function useHelpKey({
	visible,
	onToggle,
	onClose,
	isDisabled = false,
}: UseHelpKeyOptions): void {
	useInput(
		(input, key) => {
			// Skip if disabled (e.g., intervention panel is open)
			if (isDisabled) {
				return;
			}

			// '?' key toggles help panel
			if (input === "?") {
				onToggle();
				return;
			}

			// ESC closes help when visible
			if (key.escape && visible) {
				onClose?.();
				return;
			}
		},
		{ isActive: getIsTTY() },
	);
}
