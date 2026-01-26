import { Box, Text, useInput } from "ink";
import React from "react";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface LearningSource {
	taskId: string;
	agentId: string;
	date: string;
}

export interface Learning {
	id: string;
	category: string;
	content: string;
	source: LearningSource;
}

export interface LearningsPanelProps {
	isVisible: boolean;
	learnings: Learning[];
	onClose: () => void;
}

/**
 * LearningsPanel - Overlay to display shared learnings
 *
 * Shows learnings grouped by category with source attribution.
 * - ESC or 'L': Close panel
 */
export function LearningsPanel({
	isVisible,
	learnings,
	onClose,
}: LearningsPanelProps): React.ReactElement | null {
	useInput(
		(input, key) => {
			if (!isVisible) return;

			// Close on Escape or 'L' (toggle)
			if (key.escape || input === "L") {
				onClose();
				return;
			}
		},
		{ isActive: getIsTTY() && isVisible },
	);

	if (!isVisible) {
		return null;
	}

	// Group learnings by category
	const groupedLearnings = learnings.reduce(
		(acc, learning) => {
			if (!acc[learning.category]) {
				acc[learning.category] = [];
			}
			acc[learning.category].push(learning);
			return acc;
		},
		{} as Record<string, Learning[]>,
	);

	const categories = Object.keys(groupedLearnings).sort();

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
		>
			<Text bold color="cyan">
				Learnings
			</Text>

			<Box marginTop={1} flexDirection="column">
				{categories.map((category) => (
					<Box key={category} flexDirection="column" marginBottom={1}>
						<Text bold color="yellow">
							## {category}
						</Text>
						{groupedLearnings[category].map((learning) => (
							<Box key={learning.id} flexDirection="column" marginLeft={2}>
								<Text>• {learning.content}</Text>
								<Text dimColor>
									Source: {learning.source.taskId} | {learning.source.agentId} |{" "}
									{learning.source.date}
								</Text>
							</Box>
						))}
					</Box>
				))}
			</Box>

			{learnings.length === 0 && (
				<Box marginTop={1}>
					<Text dimColor>No learnings yet.</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					Press <Text bold>ESC</Text> or <Text bold>L</Text> to close
				</Text>
			</Box>
		</Box>
	);
}
