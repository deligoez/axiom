import { Box, Text, useInput } from "ink";
import React from "react";
import type { PendingReview } from "../machines/reviewRegion.js";

// TTY check for useInput
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface ReviewSummaryPanelProps {
	reviews: PendingReview[];
	selectedIndex: number;
	onReviewAll?: () => void;
	onJumpToTask?: (index: number) => void;
	onCancel?: () => void;
}

/**
 * Batch review overview panel showing task list with quality indicators.
 */
export function ReviewSummaryPanel({
	reviews,
	selectedIndex,
	onReviewAll,
	onJumpToTask,
	onCancel,
}: ReviewSummaryPanelProps): React.ReactElement {
	// Calculate quality summary
	const qualityPassed = reviews.filter((r) =>
		r.result.quality.every((q) => q.passed),
	).length;
	const qualityFailed = reviews.length - qualityPassed;

	// Handle keyboard input
	useInput(
		(input, key) => {
			// Enter - review all one by one
			if (key.return) {
				onReviewAll?.();
				return;
			}

			// Escape - cancel
			if (key.escape) {
				onCancel?.();
				return;
			}

			// Number keys (1-9) - jump to specific task
			if (/^[1-9]$/.test(input)) {
				const index = Number.parseInt(input, 10) - 1;
				if (index < reviews.length) {
					onJumpToTask?.(index);
				}
				return;
			}
		},
		{ isActive: getIsTTY() },
	);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					REVIEW SUMMARY
				</Text>
				<Text dimColor> │ </Text>
				<Text>
					{reviews.length} task{reviews.length !== 1 ? "s" : ""}
				</Text>
			</Box>

			{/* Quality summary */}
			<Box marginBottom={1} gap={2}>
				<Text>
					<Text color="green">✓</Text> passed: {qualityPassed}
				</Text>
				<Text>
					<Text color="red">✗</Text> failed: {qualityFailed}
				</Text>
			</Box>

			{/* Task list */}
			<Box flexDirection="column" marginBottom={1}>
				{reviews.map((review, index) => {
					const isSelected = index === selectedIndex;
					const allPassed = review.result.quality.every((q) => q.passed);
					// Extract short ID: ch-abc123 -> abc1
					const shortId = review.taskId.replace(/^ch-/, "").slice(0, 4);

					return (
						<Box key={review.taskId} gap={1}>
							<Text color={isSelected ? "cyan" : undefined}>
								{isSelected ? "►" : " "}
							</Text>
							<Text dimColor>{index + 1}.</Text>
							<Text color={allPassed ? "green" : "red"}>
								{allPassed ? "✓" : "✗"}
							</Text>
							<Text dimColor>{shortId}</Text>
							<Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
								{review.taskId}
							</Text>
						</Box>
					);
				})}
			</Box>

			{/* Keyboard hints */}
			<Box borderTop borderColor="gray" paddingTop={1}>
				<Text dimColor>
					[<Text color="cyan">Enter</Text>] Review one by one
				</Text>
				<Text dimColor> │ </Text>
				<Text dimColor>
					[<Text color="cyan">1-9</Text>] Jump to task
				</Text>
				<Text dimColor> │ </Text>
				<Text dimColor>
					[<Text color="cyan">Esc</Text>] Cancel
				</Text>
			</Box>
		</Box>
	);
}
