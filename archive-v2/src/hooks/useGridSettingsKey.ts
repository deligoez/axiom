import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseGridSettingsKeyOptions {
	onGridSettings?: () => void;
}

/**
 * useGridSettingsKey - Hook for handling 'g' key to open grid settings
 *
 * Handles:
 * - g: Open/toggle grid settings dialog
 */
export function useGridSettingsKey({
	onGridSettings,
}: UseGridSettingsKeyOptions): void {
	useInput(
		(input) => {
			// Only respond to 'g' key (lowercase)
			if (input === "g") {
				onGridSettings?.();
			}
		},
		{ isActive: getIsTTY() },
	);
}
