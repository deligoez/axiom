import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface LogEntry {
	timestamp: Date;
	content: string;
}

export interface LogsPanelProps {
	isOpen: boolean;
	logs: LogEntry[];
	onClose: () => void;
	visibleLines?: number;
}

function formatTimestamp(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

/**
 * LogsPanel - Scrollable panel showing agent log entries
 *
 * Supports j/k or arrow keys for scrolling, Escape to close.
 */
export function LogsPanel({
	isOpen,
	logs,
	onClose,
	visibleLines = 10,
}: LogsPanelProps): React.ReactElement | null {
	const [scrollOffset, setScrollOffset] = useState(0);

	// Calculate max scroll offset
	const maxOffset = Math.max(0, logs.length - visibleLines);

	// Handle keyboard input
	useInput(
		(input, key) => {
			// Escape closes panel
			if (key.escape) {
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

	// Get visible logs based on scroll offset
	const visibleLogs = logs.slice(scrollOffset, scrollOffset + visibleLines);

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
					Logs
				</Text>
				<Text dimColor>
					{logs.length > 0
						? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, logs.length)} of ${logs.length}`
						: "0 entries"}
				</Text>
			</Box>

			{/* Log entries */}
			{visibleLogs.length === 0 ? (
				<Text dimColor>No log entries</Text>
			) : (
				visibleLogs.map((log, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: logs are positionally stable during view
					<Box key={index} gap={1}>
						<Text dimColor>{formatTimestamp(log.timestamp)}</Text>
						<Text>{log.content}</Text>
					</Box>
				))
			)}

			{/* Footer with controls */}
			<Box marginTop={1}>
				<Text dimColor>j/k: scroll | Esc: close</Text>
			</Box>
		</Box>
	);
}
