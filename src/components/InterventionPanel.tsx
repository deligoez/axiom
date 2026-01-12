import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { useChorusMachine } from "../hooks/useChorusMachine.js";

// Check if stdin supports raw mode (safe check)
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export type PanelMode =
	| "main"
	| "stop-select"
	| "redirect-select"
	| "redirect-task"
	| "edit-select"
	| "block-select";

export interface InterventionPanelProps {
	visible: boolean;
	onClose: () => void;
	onFocusAgent?: (agentId: string) => void;
}

interface AgentInfo {
	id: string;
	taskId: string;
	agentType: string;
	iteration: number;
	duration: string;
}

function formatDuration(startedAt: Date): string {
	const ms = Date.now() - startedAt.getTime();
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

export function InterventionPanel({
	visible,
	onClose,
	onFocusAgent,
}: InterventionPanelProps): React.ReactElement | null {
	const [mode, setMode] = useState<PanelMode>("main");

	// Get config for the hook - in real usage this would come from context
	const chorusMachineConfig = {
		config: {
			projectRoot: process.cwd(),
		},
	};

	const { agents, isPaused, pause, resume } = useChorusMachine(chorusMachineConfig);

	// Transform agent refs to AgentInfo
	const agentInfos: AgentInfo[] = agents.map((agent) => {
		const snapshot = agent.getSnapshot?.();
		const context = snapshot?.context ?? {};
		return {
			id: agent.id ?? "unknown",
			taskId: context.taskId ?? "unknown",
			agentType: context.agentType ?? "unknown",
			iteration: context.iteration ?? 0,
			duration: context.startedAt
				? formatDuration(new Date(context.startedAt))
				: "0s",
		};
	});

	useInput(
		(input, key) => {
			if (!visible) return;

			// ESC closes panel
			if (key.escape) {
				onClose();
				return;
			}

			if (mode === "main") {
				// 'p' toggles pause
				if (input === "p") {
					if (isPaused) {
						resume();
					} else {
						pause();
					}
					return;
				}

				// Number keys (1-9) focus agent
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= agentInfos.length) {
					const agent = agentInfos[num - 1];
					onFocusAgent?.(agent.id);
					return;
				}

				// 'x' transitions to stop-select mode
				if (input === "x") {
					setMode("stop-select");
					return;
				}

				// 'r' transitions to redirect-select mode
				if (input === "r") {
					setMode("redirect-select");
					return;
				}
			}
		},
		{ isActive: getIsTTY() && visible },
	);

	if (!visible) {
		return null;
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="yellow"
			paddingX={2}
			paddingY={1}
		>
			<Box justifyContent="center" marginBottom={1}>
				<Text bold color="yellow">
					INTERVENTION
				</Text>
				{isPaused && (
					<Text color="red" bold>
						{" "}
						(PAUSED)
					</Text>
				)}
			</Box>

			{/* Agent List */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold dimColor>
					Active Agents:
				</Text>
				{agentInfos.length === 0 ? (
					<Text dimColor>No active agents</Text>
				) : (
					agentInfos.map((agent, index) => (
						<Box key={agent.id} gap={1}>
							<Text color="cyan">[{index + 1}]</Text>
							<Text bold>{agent.agentType}</Text>
							<Text>→</Text>
							<Text color="green">{agent.taskId}</Text>
							<Text dimColor>#iter {agent.iteration}</Text>
							<Text dimColor>({agent.duration})</Text>
						</Box>
					))
				)}
			</Box>

			{/* Mode-specific UI */}
			{mode === "main" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold dimColor>
						Actions:
					</Text>
					<Box gap={2}>
						<Text>
							<Text color="cyan" bold>
								p
							</Text>{" "}
							{isPaused ? "Resume" : "Pause"}
						</Text>
						<Text>
							<Text color="cyan" bold>
								x
							</Text>{" "}
							Stop agent
						</Text>
						<Text>
							<Text color="cyan" bold>
								r
							</Text>{" "}
							Redirect agent
						</Text>
					</Box>
					<Box gap={2} marginTop={1}>
						<Text>
							<Text color="cyan" bold>
								1-9
							</Text>{" "}
							Focus agent
						</Text>
						<Text>
							<Text color="cyan" bold>
								ESC
							</Text>{" "}
							Close
						</Text>
					</Box>
				</Box>
			)}

			{mode === "stop-select" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="red">
						Select agent to stop (1-9) or ESC to cancel
					</Text>
				</Box>
			)}

			{mode === "redirect-select" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="blue">
						Select agent to redirect (1-9) or ESC to cancel
					</Text>
				</Box>
			)}
		</Box>
	);
}
