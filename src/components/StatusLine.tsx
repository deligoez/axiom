/**
 * StatusLine Component
 *
 * Shows Maestro status with persona-based worker count and Scout recommendations.
 */

import { Box, Text } from "ink";
import type React from "react";
import { PERSONAS, type PersonaName } from "../types/persona.js";

/**
 * Maestro gold color (#EAB308)
 */
const MAESTRO_GOLD = "#EAB308";

export interface WorkerCount {
	persona: PersonaName;
	count: number;
}

export interface ScoutRecommendation {
	taskId: string;
}

export interface StatusLineProps {
	/** Active workers grouped by persona */
	workers?: WorkerCount[];
	/** Scout recommendation for next task */
	scoutRecommendation?: ScoutRecommendation;
}

/**
 * Get plural form of persona name for display.
 * e.g., "Chip" -> "Chips", "Echo" -> "Echos"
 */
function getPersonaPlural(persona: PersonaName): string {
	const displayName = PERSONAS[persona].displayName;
	// Simple pluralization - add 's'
	return `${displayName}s`;
}

/**
 * Status line showing Maestro status with worker counts and recommendations.
 */
export function StatusLine({
	workers = [],
	scoutRecommendation,
}: StatusLineProps): React.ReactElement {
	// Build worker count strings
	const workerStrings = workers
		.filter((w) => w.count > 0)
		.map((w) => {
			const plural =
				w.count === 1
					? PERSONAS[w.persona].displayName
					: getPersonaPlural(w.persona);
			return `${w.count} ${plural}`;
		});

	return (
		<Box>
			{/* Maestro prefix in gold */}
			<Text bold color={MAESTRO_GOLD}>
				MAESTRO
			</Text>
			<Text> </Text>

			{/* Worker counts */}
			{workerStrings.length > 0 && (
				<>
					<Text>{workerStrings.join(", ")}</Text>
					<Text> active</Text>
				</>
			)}

			{/* Scout recommendation */}
			{scoutRecommendation && (
				<>
					<Text> </Text>
					<Text dimColor>(Scout: {scoutRecommendation.taskId} next)</Text>
				</>
			)}
		</Box>
	);
}
