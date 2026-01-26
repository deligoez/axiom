import { useInput } from "ink";
import { useRef } from "react";

// Note: In node-pty spawned processes, stdin.isTTY may be false even with a PTY.
// Check both stdin and stdout for TTY support.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

export interface UseNavigationKeysOptions {
	itemCount: number;
	selectedIndex: number;
	onSelect: (index: number) => void;
	isActive?: boolean;
	wrap?: boolean;
}

/**
 * Hook for handling j/k and arrow key navigation in lists.
 *
 * @param options.itemCount - Total number of items in the list
 * @param options.selectedIndex - Current selected index
 * @param options.onSelect - Callback when selection changes
 * @param options.isActive - Whether navigation is active (default: true)
 * @param options.wrap - Whether to wrap at boundaries (default: false)
 */
export function useNavigationKeys({
	itemCount,
	selectedIndex,
	onSelect,
	isActive = true,
	wrap = false,
}: UseNavigationKeysOptions): void {
	// Use refs to always have latest values in useInput callback
	const isActiveRef = useRef(isActive);
	const itemCountRef = useRef(itemCount);
	const selectedIndexRef = useRef(selectedIndex);
	const wrapRef = useRef(wrap);
	const onSelectRef = useRef(onSelect);

	// Update refs on each render
	isActiveRef.current = isActive;
	itemCountRef.current = itemCount;
	selectedIndexRef.current = selectedIndex;
	wrapRef.current = wrap;
	onSelectRef.current = onSelect;

	useInput(
		(input, key) => {
			// No-op if disabled (use ref for latest value)
			if (!isActiveRef.current) {
				return;
			}

			// No-op for empty lists
			if (itemCountRef.current === 0) {
				return;
			}

			// Down navigation: j or down arrow
			if (input === "j" || key.downArrow) {
				let next = selectedIndexRef.current + 1;
				if (next >= itemCountRef.current) {
					next = wrapRef.current ? 0 : itemCountRef.current - 1;
				}
				onSelectRef.current(next);
			}

			// Up navigation: k or up arrow
			if (input === "k" || key.upArrow) {
				let prev = selectedIndexRef.current - 1;
				if (prev < 0) {
					prev = wrapRef.current ? itemCountRef.current - 1 : 0;
				}
				onSelectRef.current(prev);
			}
		},
		{ isActive: getIsTTY() },
	);
}
