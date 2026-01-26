import { Box, Text } from "ink";
import React from "react";

export interface AutoApproveNotification {
	taskId: string;
	title: string;
	reason: string;
}

export interface ReviewStatusBarProps {
	pendingCount: number;
	hasPerTaskReviews?: boolean;
	autoApproveNotification?: AutoApproveNotification | null;
	onDismissNotification?: () => void;
}

/**
 * Status bar showing pending review count and auto-approve notifications.
 * Hidden when no pending reviews and no notifications.
 */
export function ReviewStatusBar({
	pendingCount,
	hasPerTaskReviews = false,
	autoApproveNotification,
}: ReviewStatusBarProps): React.ReactElement | null {
	// Nothing to show
	if (pendingCount === 0 && !autoApproveNotification) {
		return null;
	}

	return (
		<Box flexDirection="row" gap={1}>
			{/* Pending reviews indicator */}
			{pendingCount > 0 && (
				<Box gap={1}>
					{hasPerTaskReviews && <Text color="yellow">●</Text>}
					<Text color="yellow" bold>
						REVIEW PENDING
					</Text>
					<Text color="gray">│</Text>
					<Text color="cyan">{pendingCount}</Text>
					<Text dimColor>task{pendingCount !== 1 ? "s" : ""}</Text>
					<Text color="gray">│</Text>
					<Text dimColor>
						Press <Text color="cyan">[R]</Text> to review
					</Text>
				</Box>
			)}

			{/* Auto-approve notification */}
			{autoApproveNotification && (
				<Box gap={1}>
					{pendingCount > 0 && <Text color="gray">│</Text>}
					<Text color="green">✓ auto-approved</Text>
					<Text dimColor>{autoApproveNotification.taskId}</Text>
				</Box>
			)}
		</Box>
	);
}
