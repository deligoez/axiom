import { Box, Text } from "ink";
import type React from "react";
import type { PendingReview } from "../machines/reviewRegion.js";

export interface TaskReviewPanelProps {
	review: PendingReview;
	currentIndex: number;
	totalCount: number;
}

/**
 * Modal panel for reviewing individual task with details.
 */
export function TaskReviewPanel({
	review,
	currentIndex,
	totalCount,
}: TaskReviewPanelProps): React.ReactElement {
	const { result } = review;

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header with position indicator */}
			<Box marginBottom={1} gap={1}>
				<Text color="cyan" bold>
					[{currentIndex + 1}/{totalCount}]
				</Text>
				<Text bold>{review.taskId}</Text>
			</Box>

			{/* Task details */}
			<Box flexDirection="column" marginBottom={1}>
				<Box gap={2}>
					<Text dimColor>Agent:</Text>
					<Text>{result.agentId}</Text>
				</Box>
				<Box gap={2}>
					<Text dimColor>Iterations:</Text>
					<Text>{result.iterations}</Text>
				</Box>
				<Box gap={2}>
					<Text dimColor>Duration:</Text>
					<Text>{formatDuration(result.duration)}</Text>
				</Box>
			</Box>

			{/* Signal message */}
			{result.signal?.payload && (
				<Box marginBottom={1} flexDirection="column">
					<Text dimColor>Signal:</Text>
					<Box marginLeft={1}>
						<Text
							color={result.signal.type === "COMPLETE" ? "green" : "yellow"}
						>
							{result.signal.payload}
						</Text>
					</Box>
				</Box>
			)}

			{/* Changes summary */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold>Changes</Text>
				{result.changes.length === 0 ? (
					<Box marginLeft={1}>
						<Text dimColor>No changes</Text>
					</Box>
				) : (
					result.changes.map((change) => (
						<Box key={change.path} gap={1} marginLeft={1}>
							<Text color={getChangeColor(change.type)}>
								{getChangeIcon(change.type)}
							</Text>
							<Text>{change.path}</Text>
							<Text dimColor>
								+{change.linesAdded} -{change.linesRemoved}
							</Text>
						</Box>
					))
				)}
			</Box>

			{/* Quality checks */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold>Quality Checks</Text>
				{result.quality.map((q) => (
					<Box key={q.name} flexDirection="column" marginLeft={1}>
						<Box gap={1}>
							<Text color={q.passed ? "green" : "red"}>
								{q.passed ? "✓" : "✗"}
							</Text>
							<Text>{q.name}</Text>
							<Text dimColor>({formatDuration(q.duration)})</Text>
						</Box>
						{q.error && (
							<Box marginLeft={2}>
								<Text color="red">{q.error}</Text>
							</Box>
						)}
					</Box>
				))}
			</Box>

			{/* Keyboard hints */}
			<Box borderTop borderColor="gray" paddingTop={1} gap={1} flexWrap="wrap">
				<Text dimColor>
					[<Text color="cyan">A</Text>] Approve
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="cyan">R</Text>] Redo
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="cyan">X</Text>] Reject
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="cyan">N</Text>/<Text color="cyan">P</Text>] Next/Prev
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="cyan">Esc</Text>] Cancel
				</Text>
			</Box>
		</Box>
	);
}

/**
 * Format duration in ms to human-readable string
 */
function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get color for change type
 */
function getChangeColor(type: "added" | "modified" | "deleted"): string {
	switch (type) {
		case "added":
			return "green";
		case "modified":
			return "yellow";
		case "deleted":
			return "red";
	}
}

/**
 * Get icon for change type
 */
function getChangeIcon(type: "added" | "modified" | "deleted"): string {
	switch (type) {
		case "added":
			return "+";
		case "modified":
			return "~";
		case "deleted":
			return "-";
	}
}
