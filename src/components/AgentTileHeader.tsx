import { Text } from "ink";
import type React from "react";

export interface AgentTileHeaderProps {
	agentType: "claude" | "codex" | "opencode";
	taskId: string;
	status: "running" | "idle" | "paused" | "error";
}

export function AgentTileHeader({
	agentType,
	taskId,
	status,
}: AgentTileHeaderProps): React.ReactElement {
	const { icon, color } = getStatusDisplay(status);

	return (
		<Text>
			<Text color={color}>{icon}</Text>{" "}
			<Text bold>{agentType.toUpperCase()}</Text> ({taskId})
		</Text>
	);
}

function getStatusDisplay(status: "running" | "idle" | "paused" | "error"): {
	icon: string;
	color: string;
} {
	switch (status) {
		case "running":
			return { icon: "●", color: "green" };
		case "idle":
			return { icon: "○", color: "gray" };
		case "paused":
			return { icon: "⏸", color: "yellow" };
		case "error":
			return { icon: "✗", color: "red" };
	}
}
