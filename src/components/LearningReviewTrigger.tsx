import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import type { Learning } from "../types/learning.js";
import { LearningReviewDialog } from "./LearningReviewDialog.js";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface LearningReviewTriggerProps {
	/** All learnings (for force review) */
	learnings: Learning[];
	/** Unreviewed learnings (for Ctrl+L trigger) */
	unreviewedLearnings: Learning[];
	onRunReview: (learnings: Learning[]) => void;
	isActive?: boolean;
}

/**
 * LearningReviewTrigger - Status bar component showing learning count
 * with keyboard shortcuts to trigger review.
 *
 * Keyboard shortcuts:
 * - Ctrl+L: Review learnings (if unreviewed exist)
 * - Shift+L: Force review (always enabled)
 */
export function LearningReviewTrigger({
	learnings,
	unreviewedLearnings,
	onRunReview,
	isActive = true,
}: LearningReviewTriggerProps): React.ReactElement {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [reviewLearnings, setReviewLearnings] = useState<Learning[]>([]);

	const unreviewedCount = unreviewedLearnings.length;
	const hasUnreviewed = unreviewedCount > 0;

	useInput(
		(input, key) => {
			if (isDialogOpen) return;

			// Ctrl+L - Review if unreviewed learnings exist
			if (key.ctrl && (input === "l" || input === "L")) {
				if (hasUnreviewed) {
					setReviewLearnings(unreviewedLearnings);
					setIsDialogOpen(true);
				}
				return;
			}

			// Shift+L - Force review (always enabled)
			if (input === "L" && !key.ctrl) {
				setReviewLearnings(learnings);
				setIsDialogOpen(true);
				return;
			}
		},
		{ isActive: getIsTTY() && isActive && !isDialogOpen },
	);

	const handleRunReview = () => {
		setIsDialogOpen(false);
		onRunReview(reviewLearnings);
	};

	const handleSkipLocal = () => {
		const nonLocalLearnings = reviewLearnings.filter(
			(l) => l.scope !== "local",
		);
		setIsDialogOpen(false);
		if (nonLocalLearnings.length > 0) {
			onRunReview(nonLocalLearnings);
		}
	};

	const handleCancel = () => {
		setIsDialogOpen(false);
		setReviewLearnings([]);
	};

	return (
		<>
			{/* Status bar indicator */}
			<Box gap={1}>
				{hasUnreviewed ? (
					<Text>
						<Text>📚</Text> Learnings:{" "}
						<Text color="yellow" bold>
							{unreviewedCount} new
						</Text>
					</Text>
				) : (
					<Text>
						<Text>📖</Text> All reviewed
					</Text>
				)}

				{/* Keyboard hints */}
				<Text dimColor>
					{hasUnreviewed ? (
						<>
							<Text color="cyan">[Ctrl+L]</Text> Review
						</>
					) : (
						<Text color="gray">[Ctrl+L] disabled</Text>
					)}{" "}
					<Text color="cyan">[Shift+L]</Text> Force
				</Text>
			</Box>

			{/* Review dialog */}
			<LearningReviewDialog
				isOpen={isDialogOpen}
				learnings={reviewLearnings}
				onRunReview={handleRunReview}
				onSkipLocal={handleSkipLocal}
				onCancel={handleCancel}
			/>
		</>
	);
}
