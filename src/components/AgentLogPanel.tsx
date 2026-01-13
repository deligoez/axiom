/**
 * AgentLogPanel Component
 *
 * Displays agent log entries with persona-based coloring and scrolling.
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import type { LogEntry } from "../services/AgentLogger.js";
import { getPersonaColor } from "../theme/persona-colors.js";

/**
 * Check if stdin supports raw mode (safe check for TTY).
 * Checks both stdin and stdout for node-pty compatibility.
 */
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

/**
 * Default number of entries to show.
 */
const DEFAULT_VISIBLE_ENTRIES = 50;

export interface AgentLogPanelProps {
	/** Whether the panel is visible */
	isOpen: boolean;
	/** Log entries to display */
	entries: LogEntry[];
	/** Callback when panel should close (L or Escape) */
	onClose: () => void;
	/** Number of visible lines (default: 10) */
	visibleLines?: number;
	/** Persona filter (undefined = show all) */
	filterPersona?: string;
}

/**
 * Format ISO timestamp to HH:MM:SS.
 */
function formatTime(isoTimestamp: string): string {
	const date = new Date(isoTimestamp);
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

/**
 * AgentLogPanel - Scrollable panel showing agent log entries.
 *
 * Features:
 * - Shows last 50 entries by default
 * - j/k keys for scrolling
 * - L or Escape to close
 * - Persona-based background colors
 * - Filter by persona name
 */
export function AgentLogPanel({
	isOpen,
	entries,
	onClose,
	visibleLines = 10,
	filterPersona,
}: AgentLogPanelProps): React.ReactElement | null {
	const [scrollOffset, setScrollOffset] = useState(0);

	// Filter entries by persona if specified
	const filteredEntries = filterPersona
		? entries.filter((e) => e.persona === filterPersona)
		: entries;

	// Take last 50 entries
	const recentEntries = filteredEntries.slice(-DEFAULT_VISIBLE_ENTRIES);

	// Calculate max scroll offset
	const maxOffset = Math.max(0, recentEntries.length - visibleLines);

	// Handle keyboard input
	useInput(
		(input, key) => {
			// L or Escape closes panel
			if (input === "l" || input === "L" || key.escape) {
				onClose();
				return;
			}

			// j or down arrow - scroll down
			if (input === "j" || key.downArrow) {
				setScrollOffset((prev) => Math.min(prev + 1, maxOffset));
				return;
			}

			// k or up arrow - scroll up
			if (input === "k" || key.upArrow) {
				setScrollOffset((prev) => Math.max(prev - 1, 0));
				return;
			}
		},
		{ isActive: isOpen && getIsTTY() },
	);

	// Don't render if not open
	if (!isOpen) {
		return null;
	}

	// Get visible entries based on scroll offset
	const visibleEntries = recentEntries.slice(
		scrollOffset,
		scrollOffset + visibleLines,
	);

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={1}
		>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text bold color="cyan">
					Agent Logs
					{filterPersona && <Text dimColor> ({filterPersona})</Text>}
				</Text>
				<Text dimColor>
					{recentEntries.length > 0
						? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, recentEntries.length)} of ${recentEntries.length}`
						: "0 entries"}
				</Text>
			</Box>

			{/* Log entries */}
			{visibleEntries.length === 0 ? (
				<Text dimColor>No log entries</Text>
			) : (
				visibleEntries.map((entry, index) => {
					const colors = getPersonaColor(entry.persona as string);
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: logs are positionally stable during view
						<Box key={index} gap={1}>
							<Text backgroundColor={colors.background}>
								<Text dimColor>[{formatTime(entry.timestamp)}]</Text>
								<Text> </Text>
								<Text color={colors.primary}>[{entry.instanceId}]</Text>
								<Text> </Text>
								<Text color={colors.text}>{entry.message}</Text>
							</Text>
						</Box>
					);
				})
			)}

			{/* Footer with controls */}
			<Box marginTop={1}>
				<Text dimColor>j/k: scroll | L/Esc: close</Text>
			</Box>
		</Box>
	);
}
