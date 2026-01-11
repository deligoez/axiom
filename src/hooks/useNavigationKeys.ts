import { useInput } from "ink";

export interface UseNavigationKeysOptions {
	itemCount: number;
	selectedIndex: number;
	onSelect: (index: number) => void;
	isActive?: boolean;
}

/**
 * Hook for handling j/k and arrow key navigation in lists.
 *
 * @param options.itemCount - Total number of items in the list
 * @param options.selectedIndex - Current selected index
 * @param options.onSelect - Callback when selection changes
 * @param options.isActive - Whether navigation is active (default: true)
 */
export function useNavigationKeys({
	itemCount,
	selectedIndex,
	onSelect,
	isActive = true,
}: UseNavigationKeysOptions): void {
	useInput(
		(input, key) => {
			// No-op for empty lists
			if (itemCount === 0) {
				return;
			}

			// Down navigation: j or down arrow
			if (input === "j" || key.downArrow) {
				const next = Math.min(selectedIndex + 1, itemCount - 1);
				onSelect(next);
			}

			// Up navigation: k or up arrow
			if (input === "k" || key.upArrow) {
				const prev = Math.max(selectedIndex - 1, 0);
				onSelect(prev);
			}
		},
		{ isActive },
	);
}
