import { Box, Text } from "ink";
import type React from "react";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import type { Agent } from "../types/agent.js";

export interface AgentFullscreenProps {
	agent: Agent;
	scrollPosition: number;
	onExit: () => void;
}

/**
 * AgentFullscreen - Full-screen view of agent output
 *
 * Displays agent output at full terminal size with scrolling support.
 * Shows header with agent name and footer with exit instructions.
 */
export function AgentFullscreen({
	agent,
	scrollPosition,
}: AgentFullscreenProps): React.ReactElement {
	const { width, height } = useTerminalSize();

	// Calculate visible lines (leave room for header and footer)
	const headerHeight = 2;
	const footerHeight = 2;
	const visibleHeight = Math.max(1, height - headerHeight - footerHeight);

	// Get visible portion of output based on scroll position
	const outputLines = agent.output;
	const startIndex = Math.min(
		scrollPosition,
		Math.max(0, outputLines.length - 1),
	);
	const visibleLines = outputLines.slice(
		startIndex,
		startIndex + visibleHeight,
	);

	return (
		<Box flexDirection="column" width={width} height={height}>
			{/* Header */}
			<Box
				borderStyle="single"
				borderTop
				borderLeft
				borderRight
				borderBottom={false}
				paddingX={1}
			>
				<Text bold color="cyan">
					{agent.name}
				</Text>
				<Box flexGrow={1} />
				<Text dimColor>
					{agent.status} | Lines: {outputLines.length}
				</Text>
			</Box>

			{/* Output area */}
			<Box
				flexDirection="column"
				flexGrow={1}
				borderStyle="single"
				borderTop={false}
				borderBottom={false}
				paddingX={1}
			>
				{visibleLines.map((line, index) => (
					<Text key={startIndex + index} wrap="truncate">
						{line}
					</Text>
				))}
			</Box>

			{/* Footer */}
			<Box
				borderStyle="single"
				borderTop={false}
				paddingX={1}
				justifyContent="space-between"
			>
				<Text dimColor>
					Press <Text bold>f</Text> or <Text bold>Esc</Text> to exit fullscreen
				</Text>
				<Text dimColor>
					<Text bold>j</Text>/<Text bold>k</Text> to scroll
				</Text>
			</Box>
		</Box>
	);
}
