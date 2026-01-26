import { useInput } from "ink";

// Check if we're in an interactive terminal
// Using a getter to allow test mocking
// Note: In node-pty spawned processes, process.stdin might not be a TTY,
// but stdout will be. We check both to support all terminal environments.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

export interface UseInterventionKeyOptions {
	onOpen: () => void;
	isDisabled?: boolean;
}

/**
 * useInterventionKey - Hook for handling 'i' key to open intervention panel
 *
 * Handles:
 * - 'i' key to open intervention panel
 * - Modal exclusivity via isDisabled prop
 */
export function useInterventionKey({
	onOpen,
	isDisabled = false,
}: UseInterventionKeyOptions): void {
	useInput(
		(input) => {
			// Skip if disabled (e.g., another modal is open)
			if (isDisabled) {
				return;
			}

			// 'i' key opens intervention panel
			if (input === "i") {
				onOpen();
				return;
			}
		},
		{ isActive: getIsTTY() },
	);
}
