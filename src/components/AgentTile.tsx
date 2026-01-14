import { Box } from "ink";
import React from "react";
import { AgentTileHeader } from "./AgentTileHeader.js";
import { AgentTileOutput } from "./AgentTileOutput.js";
import { AgentTileProgress } from "./AgentTileProgress.js";

export interface AgentTileProps {
	agent: {
		id: string;
		type: "claude" | "codex" | "opencode";
		taskId: string;
		status: "running" | "idle" | "paused" | "error";
		iteration: number;
		maxIterations: number;
		startTime: number;
		statusText?: string;
		lastCommand?: string;
		testResult?: { passed: number; failed: number };
	};
	isSelected?: boolean;
	width?: number;
}

export function AgentTile({
	agent,
	isSelected = false,
	width,
}: AgentTileProps): React.ReactElement {
	const { borderStyle, borderColor } = getBorderStyles(
		agent.status,
		isSelected,
	);
	const statusText = agent.iteration === 0 ? "starting..." : agent.statusText;

	return (
		<Box
			flexDirection="column"
			borderStyle={borderStyle}
			borderColor={borderColor}
			width={width}
			paddingX={1}
		>
			<AgentTileHeader
				agentType={agent.type}
				taskId={agent.taskId}
				status={agent.status}
			/>
			<AgentTileProgress
				iteration={agent.iteration}
				maxIterations={agent.maxIterations}
				startTime={agent.startTime}
			/>
			<AgentTileOutput
				statusText={statusText}
				lastCommand={agent.lastCommand}
				testResult={agent.testResult}
			/>
		</Box>
	);
}

function getBorderStyles(
	status: "running" | "idle" | "paused" | "error",
	isSelected: boolean,
): { borderStyle: "single" | "double"; borderColor: string } {
	// Error status always gets red border
	if (status === "error") {
		return {
			borderStyle: isSelected ? "double" : "single",
			borderColor: "red",
		};
	}

	// Selected gets double cyan border
	if (isSelected) {
		return { borderStyle: "double", borderColor: "cyan" };
	}

	// Default: single gray border
	return { borderStyle: "single", borderColor: "gray" };
}
