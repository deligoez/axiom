import { Box, Text } from "ink";
import React from "react";
import { AgentSlotsCounter } from "./AgentSlotsCounter.js";
import { ModeIndicator } from "./ModeIndicator.js";

export interface HeaderBarProps {
	version?: string;
	mode: "semi-auto" | "autopilot";
	runningAgents: number;
	maxAgents: number;
	showHelp?: boolean;
}

export function HeaderBar({
	version,
	mode,
	runningAgents,
	maxAgents,
	showHelp = true,
}: HeaderBarProps): React.ReactElement {
	return (
		<Box justifyContent="space-between">
			<Box>
				<Text bold color="cyan">
					CHORUS
				</Text>
				{version && <Text color="gray"> v{version}</Text>}
			</Box>
			<Box gap={2}>
				<ModeIndicator mode={mode} />
				<AgentSlotsCounter running={runningAgents} max={maxAgents} />
			</Box>
			{showHelp && <Text dimColor>? for help</Text>}
		</Box>
	);
}
