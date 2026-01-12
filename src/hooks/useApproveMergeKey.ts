import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface MergeRequest {
	id: string;
	taskId: string;
	status: "pending" | "approved" | "rejected" | "in_progress";
}

export interface UseApproveMergeKeyOptions {
	isPanelFocused: boolean;
	selectedMergeRequest: MergeRequest | null;
	onApprove?: (requestId: string) => void;
	onError?: (error: string) => void;
}

/**
 * useApproveMergeKey - Hook for handling 'a' key to approve merge requests
 *
 * Handles:
 * - a: Approve selected merge request in merge queue panel
 *
 * Validates:
 * - Panel is focused
 * - Merge request is selected
 * - Merge request status is "pending"
 */
export function useApproveMergeKey({
	isPanelFocused,
	selectedMergeRequest,
	onApprove,
	onError,
}: UseApproveMergeKeyOptions): void {
	useInput(
		(input) => {
			// Only respond to 'a' key (lowercase)
			if (input !== "a") {
				return;
			}

			// Only active when panel is focused
			if (!isPanelFocused) {
				return;
			}

			// Validate merge request is selected
			if (!selectedMergeRequest) {
				onError?.("No merge request selected");
				return;
			}

			// Validate merge request is pending
			if (selectedMergeRequest.status !== "pending") {
				onError?.("Merge request not pending");
				return;
			}

			// Approve the merge request
			onApprove?.(selectedMergeRequest.id);
		},
		{ isActive: getIsTTY() },
	);
}
