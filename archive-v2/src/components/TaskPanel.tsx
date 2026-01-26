import { Box, Text } from "ink";
import React, { memo, useEffect, useMemo, useState } from "react";
import type { TaskProviderTask } from "../types/task-provider.js";

interface TaskPanelProps {
	tasks: TaskProviderTask[];
	selectedTaskId?: string | null;
	canAssign?: boolean;
}

type TaskStatus = TaskProviderTask["status"];

const StatusIndicator = memo(function StatusIndicator({
	status,
}: {
	status: TaskStatus;
}) {
	switch (status) {
		case "open":
			return <Text color="yellow">→</Text>;
		case "in_progress":
			return <Text color="blue">●</Text>;
		case "closed":
			return <Text color="green">✓</Text>;
		case "blocked":
			return <Text color="red">⊗</Text>;
		case "failed":
			return <Text color="red">✗</Text>;
		case "tombstone":
			return <Text color="gray">⌫</Text>;
		case "reviewing":
			return <Text color="cyan">⏳</Text>;
		default:
			return <Text color="gray">?</Text>;
	}
});

function getShortId(id: string): string {
	// bd-a1b2c3 → a1b2
	const parts = id.split("-");
	if (parts.length > 1) {
		return parts[1].slice(0, 4);
	}
	return id.slice(0, 4);
}

const PriorityBadge = memo(function PriorityBadge({
	priority,
}: {
	priority: number;
}) {
	const [visible, setVisible] = useState(true);

	// P0 flashing animation
	useEffect(() => {
		if (priority !== 0) return;

		const interval = setInterval(() => {
			setVisible((v) => !v);
		}, 500);

		return () => clearInterval(interval);
	}, [priority]);

	const colors: Record<number, string> = {
		0: "magenta",
		1: "red",
		2: "yellow",
		3: "yellow",
		4: "blue",
	};

	// P0 flashes (toggles visibility)
	if (priority === 0 && !visible) {
		return <Text> </Text>;
	}

	return <Text color={colors[priority] ?? "gray"}>P{priority}</Text>;
});

export default function TaskPanel({
	tasks,
	selectedTaskId,
	canAssign = false,
}: TaskPanelProps) {
	// Calculate counts for footer (memoized to avoid recalculation on re-renders)
	// Must be before early returns to comply with React hooks rules
	const { readyCount, blockedCount, reviewingCount } = useMemo(() => {
		return {
			readyCount: tasks.filter(
				(t) => t.status === "open" || t.status === "in_progress",
			).length,
			blockedCount: tasks.filter((t) => t.status === "blocked").length,
			reviewingCount: tasks.filter((t) => t.status === "reviewing").length,
		};
	}, [tasks]);

	if (tasks.length === 0) {
		return (
			<Box
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				flexGrow={1}
			>
				<Text dimColor>No tasks</Text>
				<Text dimColor>Watch .chorus/tasks.jsonl</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" flexGrow={1}>
			<Box marginBottom={1}>
				<Text bold>Tasks </Text>
				<Text dimColor>({tasks.length})</Text>
			</Box>
			<Box flexDirection="column" flexGrow={1} overflowY="hidden">
				{tasks.map((task) => {
					const isSelected = task.id === selectedTaskId;
					const blockerCount = task.dependencies?.length ?? 0;

					return (
						<Box key={task.id} gap={1}>
							{isSelected ? <Text color="cyan">►</Text> : <Text> </Text>}
							<StatusIndicator status={task.status} />
							<Text dimColor>{getShortId(task.id)}</Text>
							<Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
								{task.title}
							</Text>
							<PriorityBadge priority={task.priority} />
							{task.custom?.agent && <Text dimColor>@{task.custom.agent}</Text>}
							{task.status === "blocked" && blockerCount > 0 && (
								<Text dimColor>({blockerCount})</Text>
							)}
						</Box>
					);
				})}
			</Box>

			{/* Footer with counts and help */}
			<Box marginTop={1} flexDirection="column">
				<Box gap={2}>
					<Text dimColor>{readyCount} ready</Text>
					{reviewingCount > 0 && (
						<Text dimColor>{reviewingCount} reviewing</Text>
					)}
					{blockedCount > 0 && <Text dimColor>{blockedCount} blocked</Text>}
				</Box>
				{selectedTaskId && canAssign && (
					<Text color="cyan">Press Enter to assign</Text>
				)}
			</Box>
		</Box>
	);
}
