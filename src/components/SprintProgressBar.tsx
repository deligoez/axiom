import { Box, Text } from "ink";
import type React from "react";
import type { SprintTarget } from "../types/sprint.js";

export interface SprintProgressBarProps {
	isActive: boolean;
	tasksCompleted: number;
	totalTasks: number;
	tasksFailed: number;
	target: SprintTarget;
	elapsedMinutes?: number;
}

/**
 * Status bar showing sprint progress.
 * Hidden when no active sprint.
 */
export function SprintProgressBar({
	isActive,
	tasksCompleted,
	totalTasks,
	tasksFailed,
	target,
	elapsedMinutes = 0,
}: SprintProgressBarProps): React.ReactElement | null {
	// Hidden when sprint is not active
	if (!isActive) {
		return null;
	}

	// Format target description
	const getTargetDescription = (): string => {
		switch (target.type) {
			case "taskCount":
				return `${target.count} tasks`;
			case "duration":
				return `${target.minutes}m`;
			case "untilTime":
				return `until ${target.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
			case "noReady":
				return "until done";
		}
	};

	return (
		<Box flexDirection="row" gap={1}>
			<Text color="magenta" bold>
				SPRINT
			</Text>
			<Text color="gray">│</Text>
			<Text color="cyan">
				{tasksCompleted}/{totalTasks}
			</Text>
			<Text dimColor>tasks</Text>
			{tasksFailed > 0 && (
				<>
					<Text color="gray">│</Text>
					<Text color="red">{tasksFailed} failed</Text>
				</>
			)}
			<Text color="gray">│</Text>
			<Text dimColor>{getTargetDescription()}</Text>
			<Text color="gray">│</Text>
			<Text dimColor>{elapsedMinutes}m elapsed</Text>
		</Box>
	);
}
