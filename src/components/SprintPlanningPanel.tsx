import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import type { SprintConfig, SprintTarget } from "../types/sprint.js";

// Check if we're in an interactive terminal
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

export interface TaskInfo {
	id: string;
	title: string;
}

export interface SprintPlanningPanelProps {
	visible: boolean;
	readyTasks: TaskInfo[];
	onStart: (config: SprintConfig, selectedTaskIds: string[]) => void;
	onCancel: () => void;
	avgMinutesPerTask?: number;
}

type TargetType = "taskCount" | "duration" | "untilTime" | "noReady";

function getShortId(id: string): string {
	const parts = id.split("-");
	if (parts.length > 1) {
		return parts[1].slice(0, 4);
	}
	return id.slice(0, 4);
}

export function SprintPlanningPanel({
	visible,
	readyTasks,
	onStart,
	onCancel,
	avgMinutesPerTask = 20,
}: SprintPlanningPanelProps): React.ReactElement | null {
	// Selection state
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
		() => new Set(readyTasks.map((t) => t.id)),
	);

	// Target settings
	const [targetType, setTargetType] = useState<TargetType>("noReady");
	const [taskCount] = useState(5);
	const [durationMinutes] = useState(60);

	// Iteration settings
	const [maxIterations] = useState(50);
	const [timeoutMinutes] = useState(30);
	const [pauseOnStuck] = useState(true);
	const [pauseOnErrors] = useState(true);

	// Checkpoint option
	const [createCheckpoint, setCreateCheckpoint] = useState(true);

	// Focus state for navigation
	const [, setFocusSection] = useState<"target" | "settings" | "tasks">(
		"target",
	);

	const buildTarget = (): SprintTarget => {
		switch (targetType) {
			case "taskCount":
				return { type: "taskCount", count: taskCount };
			case "duration":
				return { type: "duration", minutes: durationMinutes };
			case "untilTime":
				return { type: "untilTime", endTime: new Date() };
			default:
				return { type: "noReady" };
		}
	};

	const handleStart = () => {
		if (selectedTaskIds.size === 0) {
			return; // Validate at least one task selected
		}

		const config: SprintConfig = {
			target: buildTarget(),
			iterationSettings: {
				maxIterations,
				timeoutMinutes,
			},
			pauseOnStuck,
			pauseOnErrors,
		};

		onStart(config, Array.from(selectedTaskIds));
	};

	const toggleTaskSelection = (taskId: string) => {
		setSelectedTaskIds((prev) => {
			const next = new Set(prev);
			if (next.has(taskId)) {
				next.delete(taskId);
			} else {
				next.add(taskId);
			}
			return next;
		});
	};

	const selectAll = () => {
		setSelectedTaskIds(new Set(readyTasks.map((t) => t.id)));
	};

	const selectNone = () => {
		setSelectedTaskIds(new Set());
	};

	// Calculate estimated time
	const estimatedMinutes = selectedTaskIds.size * avgMinutesPerTask;
	const estimatedHours = Math.floor(estimatedMinutes / 60);
	const estimatedMins = estimatedMinutes % 60;

	useInput(
		(input, key) => {
			if (!visible) return;

			// ESC cancels
			if (key.escape) {
				onCancel();
				return;
			}

			// Enter starts sprint
			if (key.return) {
				handleStart();
				return;
			}

			// Tab cycles focus sections
			if (key.tab) {
				setFocusSection((prev) => {
					if (prev === "target") return "settings";
					if (prev === "settings") return "tasks";
					return "target";
				});
				return;
			}

			// 'a' selects all tasks
			if (input === "a") {
				selectAll();
				return;
			}

			// 'n' selects none
			if (input === "n") {
				selectNone();
				return;
			}

			// 'c' toggles checkpoint
			if (input === "c") {
				setCreateCheckpoint((prev) => !prev);
				return;
			}

			// Number keys toggle task selection (1-9)
			const num = Number.parseInt(input, 10);
			if (num >= 1 && num <= 9 && num <= readyTasks.length) {
				toggleTaskSelection(readyTasks[num - 1].id);
				return;
			}

			// Target type selection
			if (input === "t") {
				setTargetType((prev) => {
					const types: TargetType[] = [
						"taskCount",
						"duration",
						"untilTime",
						"noReady",
					];
					const idx = types.indexOf(prev);
					return types[(idx + 1) % types.length];
				});
			}
		},
		{ isActive: getIsTTY() && visible },
	);

	if (!visible) {
		return null;
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="magenta"
			paddingX={2}
			paddingY={1}
		>
			<Box justifyContent="center" marginBottom={1}>
				<Text bold color="magenta">
					SPRINT PLANNING
				</Text>
			</Box>

			{/* Sprint Target Section */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold dimColor>
					Target:
				</Text>
				<Box gap={2}>
					<Text color={targetType === "taskCount" ? "cyan" : "gray"}>
						[{targetType === "taskCount" ? "●" : " "}] {taskCount} tasks
					</Text>
					<Text color={targetType === "duration" ? "cyan" : "gray"}>
						[{targetType === "duration" ? "●" : " "}] {durationMinutes}m
					</Text>
					<Text color={targetType === "noReady" ? "cyan" : "gray"}>
						[{targetType === "noReady" ? "●" : " "}] until done
					</Text>
				</Box>
			</Box>

			{/* Iteration Settings Section */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold dimColor>
					Settings:
				</Text>
				<Box gap={2}>
					<Text dimColor>Max iterations: {maxIterations}</Text>
					<Text dimColor>Timeout: {timeoutMinutes}m</Text>
				</Box>
				<Box gap={2}>
					<Text color={pauseOnStuck ? "green" : "gray"}>
						[{pauseOnStuck ? "✓" : " "}] Pause on stuck
					</Text>
					<Text color={pauseOnErrors ? "green" : "gray"}>
						[{pauseOnErrors ? "✓" : " "}] Pause on errors
					</Text>
				</Box>
			</Box>

			{/* Checkpoint Option */}
			<Box marginBottom={1}>
				<Text color={createCheckpoint ? "green" : "gray"}>
					[{createCheckpoint ? "✓" : " "}] Checkpoint (git tag before start)
				</Text>
			</Box>

			{/* Task Selection Section */}
			<Box flexDirection="column" marginBottom={1}>
				<Box gap={1}>
					<Text bold dimColor>
						Tasks ({readyTasks.length}):
					</Text>
					<Text color="cyan">[a] All</Text>
					<Text color="cyan">[n] None</Text>
					<Text dimColor>
						| {selectedTaskIds.size} selected | est ~
						{estimatedHours > 0
							? `${estimatedHours}h ${estimatedMins}m`
							: `${estimatedMins}m`}
					</Text>
				</Box>
				<Box flexDirection="column" marginTop={1}>
					{readyTasks.slice(0, 9).map((task, index) => (
						<Box key={task.id} gap={1}>
							<Text color="cyan">[{index + 1}]</Text>
							<Text color={selectedTaskIds.has(task.id) ? "green" : "gray"}>
								[{selectedTaskIds.has(task.id) ? "✓" : " "}]
							</Text>
							<Text dimColor>{getShortId(task.id)}</Text>
							<Text color={selectedTaskIds.has(task.id) ? undefined : "gray"}>
								{task.title}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			{/* Actions */}
			<Box gap={2} marginTop={1}>
				<Text>
					<Text color="cyan" bold>
						Enter
					</Text>{" "}
					Start sprint
				</Text>
				<Text>
					<Text color="cyan" bold>
						Esc
					</Text>{" "}
					Cancel
				</Text>
				<Text>
					<Text color="cyan" bold>
						t
					</Text>{" "}
					Change target
				</Text>
				<Text>
					<Text color="cyan" bold>
						c
					</Text>{" "}
					Toggle checkpoint
				</Text>
			</Box>

			{/* Validation message */}
			{selectedTaskIds.size === 0 && (
				<Box marginTop={1}>
					<Text color="red">Select at least one task to start sprint</Text>
				</Box>
			)}
		</Box>
	);
}
