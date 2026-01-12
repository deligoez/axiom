import { useInput } from "ink";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

interface UseKeyboardOptions {
	onQuit: () => void;
	onSpawn?: () => void;
	onNavigate?: (direction: "next" | "prev") => void;
	onToggleHelp?: () => void;
	onMarkDone?: () => void;
	onQuickSelect?: (index: number) => void;
	onViewLogs?: () => void;
	isActive?: boolean;
}

export function useKeyboard({
	onQuit,
	onSpawn,
	onNavigate,
	onToggleHelp,
	onMarkDone,
	onQuickSelect,
	onViewLogs,
	isActive = true,
}: UseKeyboardOptions): void {
	useInput(
		(input, key) => {
			if (input === "q" || (key.ctrl && input === "c")) {
				onQuit();
			}
			if (input === "s") {
				onSpawn?.();
			}
			if (input === "j") {
				onNavigate?.("next");
			}
			if (input === "k") {
				onNavigate?.("prev");
			}
			if (input === "?") {
				onToggleHelp?.();
			}
			if (input === "d") {
				onMarkDone?.();
			}
			if (input === "l") {
				onViewLogs?.();
			}
			// Quick select: 1-9 keys (convert to 0-indexed)
			const num = Number.parseInt(input, 10);
			if (num >= 1 && num <= 9) {
				onQuickSelect?.(num - 1);
			}
		},
		{ isActive: isActive && getIsTTY() },
	);
}
