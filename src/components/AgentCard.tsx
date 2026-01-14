/**
 * AgentCard Component
 *
 * Displays an agent with persona information and status indicator.
 * Uses persona colors for theming and shows numbered identity for workers.
 */

import { Box, Text } from "ink";
import React from "react";
import { getPersonaColor } from "../theme/persona-colors.js";
import {
	type AgentIdentity,
	PERSONAS,
	type PersonaName,
} from "../types/persona.js";

/**
 * Agent status for display.
 */
export type AgentCardStatus = "idle" | "running" | "error" | "completed";

/**
 * Status indicator symbols.
 */
const STATUS_INDICATORS: Record<AgentCardStatus, string> = {
	idle: "○",
	running: "●",
	error: "✗",
	completed: "✓",
};

/**
 * Status indicator colors.
 */
const STATUS_COLORS: Record<AgentCardStatus, string> = {
	idle: "gray",
	running: "cyan",
	error: "red",
	completed: "green",
};

export interface AgentCardProps {
	/** Agent identity with persona and optional instance number */
	identity: AgentIdentity;
	/** Current agent status */
	status: AgentCardStatus;
	/** Whether the card is selected */
	isSelected?: boolean;
	/** Optional card width */
	width?: number;
	/** Optional task info to display */
	taskId?: string;
}

/**
 * Agent card component displaying persona with numbering and status.
 */
export function AgentCard({
	identity,
	status,
	isSelected = false,
	width,
	taskId,
}: AgentCardProps): React.ReactElement {
	const colors = getPersonaColor(identity.persona);

	// Get status indicator
	const statusIndicator = STATUS_INDICATORS[status];
	const statusColor = STATUS_COLORS[status];

	// Determine border style
	const borderStyle = isSelected ? "double" : "single";
	const borderColor = colors.primary;

	return (
		<Box
			flexDirection="column"
			borderStyle={borderStyle}
			borderColor={borderColor}
			width={width}
			paddingX={1}
		>
			{/* Header: persona display name with status */}
			<Box>
				<Text color={statusColor}>{statusIndicator}</Text>
				<Text> </Text>
				<Text bold color={colors.primary}>
					{identity.displayName}
				</Text>
			</Box>

			{/* Task info if provided */}
			{taskId && (
				<Box>
					<Text dimColor>Task: </Text>
					<Text>{taskId}</Text>
				</Box>
			)}
		</Box>
	);
}

/**
 * Get display name for a persona with optional instance number.
 * - Workers: "Chip-001", "Chip-002"
 * - Singular: "Sage", "Archie"
 */
export function getAgentDisplayName(
	persona: PersonaName,
	instanceNumber?: number,
): string {
	const personaInfo = PERSONAS[persona];

	// Singular personas don't have instance numbers
	if (personaInfo.singular || instanceNumber === undefined) {
		return personaInfo.displayName;
	}

	// Workers get numbered identity
	const paddedNumber = instanceNumber.toString().padStart(3, "0");
	return `${personaInfo.displayName}-${paddedNumber}`;
}
