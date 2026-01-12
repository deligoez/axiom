import { Box, Text, useInput } from "ink";
import type React from "react";
import type { Learning } from "../types/learning.js";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface LearningReviewDialogProps {
	isOpen: boolean;
	learnings: Learning[];
	onRunReview: () => void;
	onSkipLocal: () => void;
	onCancel: () => void;
}

/**
 * Get display color for learning scope
 */
function getScopeColor(scope: string): string {
	switch (scope) {
		case "local":
			return "gray";
		case "cross-cutting":
			return "yellow";
		case "architectural":
			return "magenta";
		default:
			return "white";
	}
}

/**
 * Get display label for learning scope
 */
function getScopeLabel(scope: string): string {
	switch (scope) {
		case "local":
			return "LOCAL";
		case "cross-cutting":
			return "CROSS-CUTTING";
		case "architectural":
			return "ARCHITECTURAL";
		default:
			return scope.toUpperCase();
	}
}

/**
 * LearningReviewDialog - Dialog for reviewing pending learnings
 *
 * Keyboard shortcuts:
 * - r: Run Plan Review with selected learnings
 * - s: Skip LOCAL learnings (only review CROSS-CUTTING and ARCHITECTURAL)
 * - c/Escape: Cancel and close dialog
 */
export function LearningReviewDialog({
	isOpen,
	learnings,
	onRunReview,
	onSkipLocal,
	onCancel,
}: LearningReviewDialogProps): React.ReactElement | null {
	useInput(
		(input, key) => {
			if (!isOpen) return;

			if (input === "r" || input === "R") {
				onRunReview();
				return;
			}

			if (input === "s" || input === "S") {
				onSkipLocal();
				return;
			}

			if (input === "c" || input === "C" || key.escape) {
				onCancel();
				return;
			}
		},
		{ isActive: getIsTTY() && isOpen },
	);

	if (!isOpen) {
		return null;
	}

	const localCount = learnings.filter((l) => l.scope === "local").length;
	const crossCuttingCount = learnings.filter(
		(l) => l.scope === "cross-cutting",
	).length;
	const architecturalCount = learnings.filter(
		(l) => l.scope === "architectural",
	).length;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
		>
			<Text bold color="cyan">
				LEARNING REVIEW
			</Text>

			<Box marginTop={1} flexDirection="column" gap={0}>
				<Text>
					<Text dimColor>Total learnings:</Text> {learnings.length}
				</Text>
				<Box gap={2}>
					<Text color="gray">LOCAL: {localCount}</Text>
					<Text color="yellow">CROSS-CUTTING: {crossCuttingCount}</Text>
					<Text color="magenta">ARCHITECTURAL: {architecturalCount}</Text>
				</Box>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Learnings to review:</Text>
				{learnings.slice(0, 5).map((learning) => (
					<Box key={learning.id} paddingLeft={1} gap={1}>
						<Text color={getScopeColor(learning.scope)}>
							[{getScopeLabel(learning.scope)}]
						</Text>
						<Text wrap="truncate">
							{learning.content.slice(0, 50)}
							{learning.content.length > 50 ? "..." : ""}
						</Text>
					</Box>
				))}
				{learnings.length > 5 && (
					<Box paddingLeft={1}>
						<Text dimColor>...and {learnings.length - 5} more</Text>
					</Box>
				)}
			</Box>

			<Box marginTop={1} gap={2}>
				<Text>
					<Text color="green" bold>
						[R]
					</Text>{" "}
					Run Review
				</Text>
				<Text>
					<Text color="yellow" bold>
						[S]
					</Text>{" "}
					Skip LOCAL
				</Text>
				<Text>
					<Text color="red" bold>
						[C]
					</Text>{" "}
					Cancel
				</Text>
			</Box>
		</Box>
	);
}
