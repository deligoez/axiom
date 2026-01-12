import { Box, Text } from "ink";
import type React from "react";
import type { AgentType } from "../types/agent.js";

export type { AgentType };

export interface TaskIterationDisplayProps {
	agentType: AgentType;
	iteration: number;
}

export function TaskIterationDisplay({
	agentType,
	iteration,
}: TaskIterationDisplayProps): React.ReactElement {
	return (
		<Box paddingLeft={2}>
			<Text color="green">●</Text>
			<Text> {agentType} </Text>
			<Text dimColor>|</Text>
			<Text> iter {iteration}</Text>
		</Box>
	);
}
