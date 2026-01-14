import { Box, Text } from "ink";
import React from "react";
import type { Agent, AgentStatus } from "../types/agent.js";

interface MainContentProps {
	agents: Agent[];
	selectedAgentId?: string | null;
	maxOutputLines?: number;
}

const DEFAULT_MAX_OUTPUT_LINES = 20;

function StatusIndicator({ status }: { status: AgentStatus }) {
	switch (status) {
		case "running":
			return <Text color="green">●</Text>;
		case "idle":
			return <Text color="gray">○</Text>;
		case "paused":
			return <Text color="yellow">⏸</Text>;
		case "stopped":
			return <Text color="gray">○</Text>;
		case "error":
			return <Text color="red">✗</Text>;
		default:
			return <Text color="gray">?</Text>;
	}
}

export default function MainContent({
	agents,
	selectedAgentId,
	maxOutputLines = DEFAULT_MAX_OUTPUT_LINES,
}: MainContentProps) {
	if (agents.length === 0) {
		return (
			<Box
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				flexGrow={1}
			>
				<Text dimColor>No agents running</Text>
				<Text dimColor>Press 's' to start an agent</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="row" flexGrow={1} gap={1}>
			{agents.map((agent) => {
				const isSelected = agent.id === selectedAgentId;
				// Show only the last N lines (tail behavior)
				const visibleOutput = agent.output.slice(-maxOutputLines);

				return (
					<Box
						key={agent.id}
						flexDirection="column"
						flexGrow={1}
						flexBasis={0}
						borderStyle={isSelected ? "double" : "single"}
						borderColor={isSelected ? "cyan" : undefined}
						paddingX={1}
					>
						<Box gap={1}>
							{isSelected && <Text color="cyan">►</Text>}
							<StatusIndicator status={agent.status} />
							<Text bold color={isSelected ? "cyan" : "green"}>
								{agent.name}
							</Text>
						</Box>
						<Box flexDirection="column" flexGrow={1} overflowY="hidden">
							{visibleOutput.map((line, index) => (
								<Text key={`output-${index}-${line.slice(0, 20)}`}>{line}</Text>
							))}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
