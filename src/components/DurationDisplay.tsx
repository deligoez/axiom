import { Text } from "ink";
import React from "react";

export interface DurationDisplayProps {
	startTime: number;
	now?: number;
}

export function DurationDisplay({
	startTime,
	now = Date.now(),
}: DurationDisplayProps): React.ReactElement {
	const elapsed = Math.max(0, now - startTime);
	const formatted = formatDuration(elapsed);

	return <Text>{formatted}</Text>;
}

function formatDuration(elapsedMs: number): string {
	const totalSeconds = Math.floor(elapsedMs / 1000);
	const totalMinutes = Math.floor(totalSeconds / 60);
	const totalHours = Math.floor(totalMinutes / 60);
	const totalDays = Math.floor(totalHours / 24);

	// Handle 0 elapsed time (future startTime)
	if (elapsedMs === 0) {
		return "0m";
	}

	if (totalMinutes < 1) {
		return "< 1m";
	}

	if (totalDays > 0) {
		const remainingHours = totalHours % 24;
		return `${totalDays}d ${remainingHours}h`;
	}

	if (totalHours > 0) {
		const remainingMinutes = totalMinutes % 60;
		return `${totalHours}h ${remainingMinutes}m`;
	}

	return `${totalMinutes}m`;
}
