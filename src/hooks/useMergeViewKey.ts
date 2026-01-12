import { useInput } from "ink";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseMergeViewKeyOptions {
	onOpen: () => void;
	isDisabled?: boolean;
}

/**
 * useMergeViewKey - Hook for handling 'M' key to open merge queue panel
 *
 * Note: 'M' (uppercase) opens merge queue, 'm' (lowercase) is mode toggle
 */
export function useMergeViewKey({
	onOpen,
	isDisabled = false,
}: UseMergeViewKeyOptions): void {
	useInput(
		(input) => {
			// Skip if disabled (e.g., modal is open)
			if (isDisabled) {
				return;
			}

			// 'M' (uppercase) opens merge queue panel
			// Note: 'm' (lowercase) is mode toggle, handled by different hook
			if (input === "M") {
				onOpen();
				return;
			}
		},
		{ isActive: getIsTTY() },
	);
}
