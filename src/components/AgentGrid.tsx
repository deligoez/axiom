import { Box } from "ink";
import type React from "react";
import type { GridConfig } from "../hooks/useAgentGrid.js";
import { AgentTile } from "./AgentTile.js";
import { EmptySlot } from "./EmptySlot.js";

export interface Agent {
	id: string;
	type: "claude" | "codex" | "opencode";
	taskId: string;
	status: "running" | "idle" | "paused" | "error";
	iteration: number;
	maxIterations: number;
	startTime: number;
	statusText?: string;
	lastCommand?: string;
	testResult?: { passed: number; failed: number };
}

export interface AgentGridProps {
	agents: Agent[];
	maxSlots: number;
	selectedIndex?: number;
	gridConfig: GridConfig;
}

export function AgentGrid({
	agents,
	maxSlots,
	selectedIndex,
	gridConfig,
}: AgentGridProps): React.ReactElement {
	const { columns, tileWidth } = gridConfig;

	// Truncate agents if more than maxSlots
	const displayedAgents = agents.slice(0, maxSlots);
	const emptySlotCount = Math.max(0, maxSlots - displayedAgents.length);

	// Build slots array: agents first, then empty slots
	const slots: React.ReactElement[] = [];

	// Add agent tiles
	for (let i = 0; i < displayedAgents.length; i++) {
		const agent = displayedAgents[i];
		slots.push(
			<AgentTile
				key={agent.id}
				agent={agent}
				isSelected={selectedIndex === i}
				width={tileWidth}
			/>,
		);
	}

	// Add empty slots
	for (let i = 0; i < emptySlotCount; i++) {
		slots.push(<EmptySlot key={`empty-${i}`} width={tileWidth} />);
	}

	// Group slots into rows
	const rows: React.ReactElement[][] = [];
	for (let i = 0; i < slots.length; i += columns) {
		rows.push(slots.slice(i, i + columns));
	}

	return (
		<Box flexDirection="column">
			{rows.map((row, rowIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rows are positionally stable
				<Box key={rowIndex} flexDirection="row">
					{row}
				</Box>
			))}
		</Box>
	);
}
