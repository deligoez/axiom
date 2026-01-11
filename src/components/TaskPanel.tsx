import { Box, Text } from "ink";
import type { Bead, BeadStatus } from "../types/bead.js";

interface TaskPanelProps {
	beads: Bead[];
	selectedBeadId?: string | null;
}

function StatusIndicator({ status }: { status: BeadStatus }) {
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
		default:
			return <Text color="gray">?</Text>;
	}
}

function getShortId(id: string): string {
	// bd-a1b2c3 → a1b2
	const parts = id.split("-");
	if (parts.length > 1) {
		return parts[1].slice(0, 4);
	}
	return id.slice(0, 4);
}

function PriorityBadge({ priority }: { priority: number }) {
	const colors: Record<number, string> = {
		0: "red",
		1: "yellow",
		2: "white",
		3: "gray",
		4: "gray",
	};
	return <Text color={colors[priority] ?? "gray"}>P{priority}</Text>;
}

export default function TaskPanel({ beads, selectedBeadId }: TaskPanelProps) {
	if (beads.length === 0) {
		return (
			<Box
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				flexGrow={1}
			>
				<Text dimColor>No tasks</Text>
				<Text dimColor>Watch .beads/issues.jsonl</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" flexGrow={1}>
			<Box marginBottom={1}>
				<Text bold>📋 Tasks </Text>
				<Text dimColor>({beads.length})</Text>
			</Box>
			<Box flexDirection="column" flexGrow={1} overflowY="hidden">
				{beads.map((bead) => {
					const isSelected = bead.id === selectedBeadId;

					return (
						<Box key={bead.id} gap={1}>
							{isSelected ? <Text color="cyan">►</Text> : <Text> </Text>}
							<StatusIndicator status={bead.status} />
							<Text dimColor>{getShortId(bead.id)}</Text>
							<Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
								{bead.title}
							</Text>
							<PriorityBadge priority={bead.priority} />
							{bead.assignee && <Text dimColor>@{bead.assignee}</Text>}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}
