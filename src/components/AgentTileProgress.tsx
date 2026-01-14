import { Box, Text } from "ink";
import React from "react";
import { DurationDisplay } from "./DurationDisplay.js";
import { ProgressBar } from "./ProgressBar.js";

export interface AgentTileProgressProps {
	iteration: number;
	maxIterations: number;
	startTime: number;
	progressPercent?: number;
	now?: number;
}

export function AgentTileProgress({
	iteration,
	maxIterations,
	startTime,
	progressPercent,
	now,
}: AgentTileProgressProps): React.ReactElement {
	const calculatedPercent =
		progressPercent ?? Math.round((iteration / maxIterations) * 100);

	return (
		<Box flexDirection="column">
			<Text>
				iter {iteration}/{maxIterations} <Text color="gray">|</Text>{" "}
				<DurationDisplay startTime={startTime} now={now} />
			</Text>
			<ProgressBar percent={calculatedPercent} width={10} />
		</Box>
	);
}
