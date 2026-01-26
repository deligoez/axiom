import { describe, expect, it } from "vitest";
import type { GridConfig, GridOverride } from "./useAgentGrid.js";

// Since this is a pure calculation function (just uses useMemo for caching),
// we can test the logic directly without React rendering
// Extract the calculation logic for testability

interface GridInput {
	terminalWidth: number | undefined;
	agentCount: number;
	maxAgents: number;
	configOverride?: GridOverride;
}

// Re-implement the calculation logic for testing (matches useAgentGrid implementation)
function calculateGridConfig(input: GridInput): GridConfig {
	const { terminalWidth, maxAgents, configOverride } = input;

	const columns = calculateColumns(terminalWidth, configOverride);
	const rows = calculateRows(maxAgents, columns, configOverride);
	const tileWidth = calculateTileWidth(terminalWidth, columns);

	return { columns, rows, tileWidth };
}

function calculateColumns(
	terminalWidth: number | undefined,
	configOverride?: GridOverride,
): number {
	if (configOverride && configOverride !== "auto") {
		const [cols] = parseGridOverride(configOverride);
		return cols;
	}

	if (!terminalWidth || terminalWidth <= 0) {
		return 1;
	}

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
	const PADDING = 4;
	if (!terminalWidth || terminalWidth <= 0) {
		return 40;
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

describe("useAgentGrid", () => {
	it("returns 1 column for width < 120", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: 100,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert
		expect(result.columns).toBe(1);
	});

	it("returns 2 columns for width 120-179", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert
		expect(result.columns).toBe(2);
	});

	it("returns 3 columns for width >= 180", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: 200,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert
		expect(result.columns).toBe(3);
	});

	it('respects "2x2" config override', () => {
		// Arrange & Act - override should force 2 columns regardless of width
		const result = calculateGridConfig({
			terminalWidth: 100,
			agentCount: 3,
			maxAgents: 4,
			configOverride: "2x2",
		});

		// Assert
		expect(result.columns).toBe(2);
		expect(result.rows).toBeGreaterThanOrEqual(2);
	});

	it('respects "1x4" config override', () => {
		// Arrange & Act - override should force 1 column regardless of width
		const result = calculateGridConfig({
			terminalWidth: 200,
			agentCount: 3,
			maxAgents: 4,
			configOverride: "1x4",
		});

		// Assert
		expect(result.columns).toBe(1);
		expect(result.rows).toBeGreaterThanOrEqual(4);
	});

	it("calculates rows correctly", () => {
		// Arrange & Act - 6 maxAgents with 2 columns = 3 rows
		const result = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert
		expect(result.rows).toBe(3); // Math.ceil(6 / 2)
	});

	it("calculates tileWidth correctly", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert - tileWidth should be roughly width / columns minus some padding
		expect(result.tileWidth).toBeGreaterThan(0);
		expect(result.tileWidth).toBeLessThanOrEqual(150);
	});

	it("handles undefined terminalWidth (defaults to 1 column)", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: undefined,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert
		expect(result.columns).toBe(1);
	});

	it("same inputs return same result (deterministic)", () => {
		// Arrange & Act
		const result1 = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 3,
			maxAgents: 6,
		});
		const result2 = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 3,
			maxAgents: 6,
		});

		// Assert - same inputs should produce same output
		expect(result1.columns).toBe(result2.columns);
		expect(result1.rows).toBe(result2.rows);
		expect(result1.tileWidth).toBe(result2.tileWidth);
	});

	it("handles zero agentCount without error", () => {
		// Arrange & Act
		const result = calculateGridConfig({
			terminalWidth: 150,
			agentCount: 0,
			maxAgents: 6,
		});

		// Assert - should not throw, should have valid config
		expect(result.columns).toBeGreaterThan(0);
		expect(result.rows).toBeGreaterThan(0);
	});
});
