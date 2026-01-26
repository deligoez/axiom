import { useInput } from "ink";
import { useEffect, useRef, useState } from "react";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UsePauseKeyOptions {
	isPaused: boolean;
	onToggle: () => void | Promise<void>;
	isDisabled?: boolean;
	toastDuration?: number;
}

export interface UsePauseKeyReturn {
	toastMessage: string;
	isToastVisible: boolean;
}

/**
 * usePauseKey - Hook for handling Space key to pause/resume orchestration
 *
 * Handles:
 * - Space key to toggle pause state
 * - Toast notification on state change
 * - Disabled state for modal exclusivity
 */
export function usePauseKey({
	isPaused,
	onToggle,
	isDisabled = false,
	toastDuration = 2000,
}: UsePauseKeyOptions): UsePauseKeyReturn {
	const [isToastVisible, setIsToastVisible] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const previousPaused = useRef(isPaused);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Handle keyboard input
	useInput(
		(input) => {
			// Skip if disabled (e.g., modal is open)
			if (isDisabled) {
				return;
			}

			// Space key toggles pause
			if (input === " ") {
				onToggle();
				return;
			}
		},
		{ isActive: getIsTTY() },
	);

	// Detect pause state changes and show toast
	useEffect(() => {
		if (previousPaused.current !== isPaused) {
			// State changed - show toast
			const message = isPaused
				? "Orchestration paused"
				: "Orchestration resumed";
			setToastMessage(message);
			setIsToastVisible(true);

			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Hide toast after duration
			timeoutRef.current = setTimeout(() => {
				setIsToastVisible(false);
			}, toastDuration);

			previousPaused.current = isPaused;
		}
	}, [isPaused, toastDuration]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		toastMessage,
		isToastVisible,
	};
}
