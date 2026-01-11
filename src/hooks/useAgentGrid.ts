import { useMemo } from "react";

export interface GridConfig {
	columns: number;
	rows: number;
	tileWidth: number;
}

export type GridOverride = "auto" | "1x1" | "2x2" | "2x3" | "1x4";

const PADDING = 4; // Total horizontal padding between tiles

export function useAgentGrid(
	terminalWidth: number,
	_agentCount: number,
	maxAgents: number,
	configOverride?: GridOverride,
): GridConfig {
	return useMemo(() => {
		const columns = calculateColumns(terminalWidth, configOverride);
		const rows = calculateRows(maxAgents, columns, configOverride);
		const tileWidth = calculateTileWidth(terminalWidth, columns);

		return { columns, rows, tileWidth };
	}, [terminalWidth, maxAgents, configOverride]);
}

function calculateColumns(
	terminalWidth: number | undefined,
	configOverride?: GridOverride,
): number {
	// Handle config overrides
	if (configOverride && configOverride !== "auto") {
		const [cols] = parseGridOverride(configOverride);
		return cols;
	}

	// Handle undefined or invalid terminal width
	if (!terminalWidth || terminalWidth <= 0) {
		return 1;
	}

	// Auto-fit logic based on terminal width
	if (terminalWidth < 120) {
		return 1;
	}
	if (terminalWidth < 180) {
		return 2;
	}
	return 3;
}

function calculateRows(
	maxAgents: number,
	columns: number,
	configOverride?: GridOverride,
): number {
	const calculatedRows = Math.ceil(Math.max(1, maxAgents) / columns);

	// Handle config overrides with minimum rows
	if (configOverride && configOverride !== "auto") {
		const [, minRows] = parseGridOverride(configOverride);
		return Math.max(calculatedRows, minRows);
	}

	return calculatedRows;
}

function calculateTileWidth(
	terminalWidth: number | undefined,
	columns: number,
): number {
	if (!terminalWidth || terminalWidth <= 0) {
		return 40; // Default minimum width
	}

	return Math.floor((terminalWidth - PADDING) / columns);
}

function parseGridOverride(override: GridOverride): [number, number] {
	switch (override) {
		case "1x1":
			return [1, 1];
		case "2x2":
			return [2, 2];
		case "2x3":
			return [2, 3];
		case "1x4":
			return [1, 4];
		default:
			return [1, 1];
	}
}
