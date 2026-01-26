import { Text } from "ink";
import React from "react";

export interface ProgressBarProps {
	percent: number;
	width?: number;
	showPercent?: boolean;
}

export function ProgressBar({
	percent,
	width = 10,
	showPercent = true,
}: ProgressBarProps): React.ReactElement {
	const clampedPercent = clampPercent(percent);
	const filledCount = Math.round((clampedPercent / 100) * width);
	const emptyCount = width - filledCount;

	const filledBlocks = "▓".repeat(filledCount);
	const emptyBlocks = "░".repeat(emptyCount);
	const color = clampedPercent > 80 ? "green" : undefined;

	return (
		<Text>
			<Text color={color}>{filledBlocks}</Text>
			{emptyBlocks}
			{showPercent && ` ${clampedPercent}%`}
		</Text>
	);
}

function clampPercent(percent: number): number {
	if (percent < 0) {
		return 0;
	}
	if (percent > 100) {
		return 100;
	}
	return Math.round(percent);
}
