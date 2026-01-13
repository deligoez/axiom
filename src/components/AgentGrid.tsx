import { Box, Text } from "ink";
import type React from "react";
import type { GridConfig } from "../hooks/useAgentGrid.js";
import { getPersonaColor } from "../theme/persona-colors.js";
import type { AgentIdentity } from "../types/persona.js";
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
	/** Agent identity with persona (optional for backward compatibility) */
	identity?: AgentIdentity;
}

export interface AgentGridProps {
	agents: Agent[];
	maxSlots: number;
	selectedIndex?: number;
	gridConfig: GridConfig;
	/** Show header row with persona labels */
	showHeaders?: boolean;
}

export function AgentGrid({
	agents,
	maxSlots,
	selectedIndex,
	gridConfig,
	showHeaders = false,
}: AgentGridProps): React.ReactElement {
	const { columns, tileWidth } = gridConfig;

	// Truncate agents if more than maxSlots
	const displayedAgents = agents.slice(0, maxSlots);
	const emptySlotCount = Math.max(0, maxSlots - displayedAgents.length);

	// Build header row if enabled
	const headerRow = showHeaders
		? buildHeaderRow(displayedAgents, emptySlotCount, columns, tileWidth)
		: null;

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

	// Add empty slots with persona context if available
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
			{headerRow}
			{rows.map((row, rowIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rows are positionally stable
				<Box key={rowIndex} flexDirection="row">
					{row}
				</Box>
			))}
		</Box>
	);
}

/**
 * Build header row showing persona labels for each column.
 */
function buildHeaderRow(
	agents: Agent[],
	emptyCount: number,
	columns: number,
	tileWidth: number,
): React.ReactElement {
	const headers: React.ReactElement[] = [];
	const totalSlots = agents.length + emptyCount;

	// Only show headers for first row (up to columns count)
	const headerCount = Math.min(totalSlots, columns);

	for (let i = 0; i < headerCount; i++) {
		const agent = agents[i];
		if (agent?.identity) {
			// Agent with persona - show colored header
			const colors = getPersonaColor(agent.identity.persona);
			headers.push(
				<Box key={`header-${i}`} width={tileWidth} justifyContent="center">
					<Text bold color={colors.primary}>
						{agent.identity.displayName}
					</Text>
				</Box>,
			);
		} else if (agent) {
			// Agent without persona - show type
			headers.push(
				<Box key={`header-${i}`} width={tileWidth} justifyContent="center">
					<Text bold>{agent.type.toUpperCase()}</Text>
				</Box>,
			);
		} else {
			// Empty slot - show dimmed placeholder
			headers.push(
				<Box key={`header-${i}`} width={tileWidth} justifyContent="center">
					<Text dimColor>-</Text>
				</Box>,
			);
		}
	}

	return (
		<Box flexDirection="row" marginBottom={1}>
			{headers}
		</Box>
	);
}
