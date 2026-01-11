import { Text } from "ink";
import type React from "react";

export interface AgentSlotsCounterProps {
	running: number;
	max: number;
}

export function AgentSlotsCounter({
	running,
	max,
}: AgentSlotsCounterProps): React.ReactElement {
	const normalizedRunning = normalizeValue(running);
	const normalizedMax = normalizeValue(max);
	const dotColor = getDotColor(normalizedRunning, normalizedMax);

	return (
		<Text>
			<Text color={dotColor}>●</Text> {normalizedRunning}/{normalizedMax}
		</Text>
	);
}

function normalizeValue(value: number | undefined): number {
	if (value === undefined || value === null) {
		return 0;
	}
	return Math.max(0, value);
}

function getDotColor(
	running: number,
	max: number,
): "green" | "yellow" | "red" | "gray" {
	if (max === 0) {
		return "gray";
	}
	if (running === 0) {
		return "green";
	}
	if (running >= max) {
		return "red";
	}
	return "yellow";
}
