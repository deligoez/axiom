import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseLearningsKeyOptions {
	onOpen?: () => void;
	isDisabled?: boolean;
}

/**
 * useLearningsKey - Handle 'L' key to open learnings panel
 *
 * Only responds to uppercase 'L' (Shift+L).
 * Can be disabled via isDisabled option.
 */
export function useLearningsKey({
	onOpen,
	isDisabled,
}: UseLearningsKeyOptions): void {
	useInput(
		(input) => {
			// Only respond to uppercase 'L'
			if (input === "L" && !isDisabled) {
				onOpen?.();
			}
		},
		{ isActive: getIsTTY() },
	);
}
