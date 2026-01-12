import { useInput } from "ink";

// TTY check for useInput
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export type ReviewState =
	| "idle"
	| "reviewingSummary"
	| "reviewingTask"
	| "feedbackModal";

export interface UseReviewKeysOptions {
	state: ReviewState;
	hasPendingReviews: boolean;
	selectedTaskId: string | null;
	onStartReview: () => void;
	onStartReviewSingle: (taskId: string) => void;
	onStartOneByOne: () => void;
	onJumpToTask: (index: number) => void;
	onApprove: () => void;
	onRedo: () => void;
	onReject: () => void;
	onNext: () => void;
	onPrev: () => void;
	onBack: () => void;
	onCancel: () => void;
	isDisabled?: boolean;
}

/**
 * useReviewKeys - Hook for handling keyboard bindings in review flow
 *
 * Handles all keyboard interactions for:
 * - Main view: R to start review (batch or single)
 * - Summary view: Enter to start one-by-one, 1-9 to jump
 * - Task view: A/R/X for approve/redo/reject, N/P for navigation
 * - Esc to back out at any level
 */
export function useReviewKeys({
	state,
	hasPendingReviews,
	selectedTaskId,
	onStartReview,
	onStartReviewSingle,
	onStartOneByOne,
	onJumpToTask,
	onApprove,
	onRedo,
	onReject,
	onNext,
	onPrev,
	onBack,
	onCancel,
	isDisabled = false,
}: UseReviewKeysOptions): void {
	useInput(
		(input, key) => {
			if (isDisabled) return;

			// Escape backs out at any level
			if (key.escape) {
				if (state === "feedbackModal") {
					onBack();
				} else if (state === "reviewingTask") {
					onBack();
				} else if (state === "reviewingSummary") {
					onCancel();
				}
				return;
			}

			// Main view (idle) handlers
			if (state === "idle") {
				if (input.toLowerCase() === "r") {
					if (!hasPendingReviews) return;
					if (selectedTaskId) {
						onStartReviewSingle(selectedTaskId);
					} else {
						onStartReview();
					}
				}
				return;
			}

			// Summary view handlers
			if (state === "reviewingSummary") {
				if (key.return) {
					onStartOneByOne();
					return;
				}
				if (/^[1-9]$/.test(input)) {
					const index = Number.parseInt(input, 10) - 1;
					onJumpToTask(index);
					return;
				}
			}

			// Task review handlers
			if (state === "reviewingTask") {
				if (input.toLowerCase() === "a") {
					onApprove();
					return;
				}
				if (input.toLowerCase() === "r") {
					onRedo();
					return;
				}
				if (input.toLowerCase() === "x") {
					onReject();
					return;
				}
				if (input.toLowerCase() === "n") {
					onNext();
					return;
				}
				if (input.toLowerCase() === "p") {
					onPrev();
					return;
				}
			}
		},
		{ isActive: getIsTTY() && !isDisabled },
	);
}
