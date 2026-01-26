import { useCallback, useEffect, useRef, useState } from "react";

export interface UseModeToggleOptions {
	mode: "semi-auto" | "autopilot";
	onToggle: (newMode: "semi-auto" | "autopilot") => void;
	persistMode?: (mode: string) => void;
	toastDuration?: number;
}

export interface UseModeToggleReturn {
	toggle: () => void;
	toastMessage: string;
	isToastVisible: boolean;
}

/**
 * useModeToggle - Hook for toggling between semi-auto and autopilot modes
 *
 * Provides toggle functionality with toast notification on mode change.
 * Toast automatically hides after toastDuration ms (default 2000).
 */
export function useModeToggle({
	mode,
	onToggle,
	persistMode,
	toastDuration = 2000,
}: UseModeToggleOptions): UseModeToggleReturn {
	const [isToastVisible, setIsToastVisible] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const previousMode = useRef(mode);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Toggle to opposite mode
	const toggle = useCallback(() => {
		const newMode = mode === "semi-auto" ? "autopilot" : "semi-auto";
		onToggle(newMode);
	}, [mode, onToggle]);

	// Detect mode changes and show toast
	useEffect(() => {
		if (previousMode.current !== mode) {
			// Mode changed - show toast
			setToastMessage(`Switched to ${mode} mode`);
			setIsToastVisible(true);

			// Call persist if provided
			persistMode?.(mode);

			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Hide toast after duration
			timeoutRef.current = setTimeout(() => {
				setIsToastVisible(false);
			}, toastDuration);

			previousMode.current = mode;
		}
	}, [mode, persistMode, toastDuration]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		toggle,
		toastMessage,
		isToastVisible,
	};
}
