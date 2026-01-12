import { Box, Text, useInput } from "ink";
import type React from "react";
import { useRef, useState } from "react";
import { useChorusMachine } from "../hooks/useChorusMachine.js";

// Check if we're in an interactive terminal
// Note: In node-pty spawned processes, process.stdin might not be a TTY,
// but stdout will be. We check both to support all terminal environments.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

export type PanelMode =
	| "main"
	| "stop-select"
	| "redirect-select"
	| "redirect-task"
	| "edit-select"
	| "block-select";

export interface TaskInfo {
	id: string;
	title: string;
}

export interface InterventionPanelProps {
	visible: boolean;
	onClose: () => void;
	onFocusAgent?: (agentId: string) => void;
	onStopAgent?: (agentId: string) => void;
	onBlockTask?: (taskId: string) => void;
	onRedirectAgent?: (agentId: string, taskId: string) => void;
	onEditTask?: (taskId: string) => void;
	availableTasks?: TaskInfo[];
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
	onStopAgent,
	onBlockTask,
	onRedirectAgent,
	onEditTask,
	availableTasks = [],
}: InterventionPanelProps): React.ReactElement | null {
	const [mode, setModeState] = useState<PanelMode>("main");
	const [selectedAgentId, setSelectedAgentIdState] = useState<string | null>(
		null,
	);
	// Use refs to always have latest values in useInput callback
	const modeRef = useRef<PanelMode>(mode);
	const selectedAgentIdRef = useRef<string | null>(selectedAgentId);

	// Update both ref and state together for immediate access
	const setMode = (newMode: PanelMode) => {
		modeRef.current = newMode;
		setModeState(newMode);
	};

	const setSelectedAgentId = (agentId: string | null) => {
		selectedAgentIdRef.current = agentId;
		setSelectedAgentIdState(agentId);
	};

	// Get config for the hook - in real usage this would come from context
	const chorusMachineConfig = {
		config: {
			projectRoot: process.cwd(),
		},
	};

	const { agents, isPaused, pause, resume } =
		useChorusMachine(chorusMachineConfig);

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

			const currentMode = modeRef.current;

			if (currentMode === "main") {
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

				// 'b' transitions to block-select mode
				if (input === "b") {
					setMode("block-select");
					return;
				}

				// 'e' transitions to edit-select mode
				if (input === "e") {
					setMode("edit-select");
					return;
				}
			}

			// Handle number keys in stop-select mode
			if (currentMode === "stop-select") {
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= agentInfos.length) {
					const agent = agentInfos[num - 1];
					onStopAgent?.(agent.id);
					setMode("main");
					return;
				}
			}

			// Handle number keys in block-select mode
			if (currentMode === "block-select") {
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= agentInfos.length) {
					const agent = agentInfos[num - 1];
					onBlockTask?.(agent.taskId);
					setMode("main");
					return;
				}
			}

			// Handle number keys in redirect-select mode
			if (currentMode === "redirect-select") {
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= agentInfos.length) {
					const agent = agentInfos[num - 1];
					setSelectedAgentId(agent.id);
					setMode("redirect-task");
					return;
				}
			}

			// Handle number keys in redirect-task mode
			if (currentMode === "redirect-task") {
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= availableTasks.length) {
					const task = availableTasks[num - 1];
					const agentId = selectedAgentIdRef.current;
					if (agentId) {
						onRedirectAgent?.(agentId, task.id);
					}
					setSelectedAgentId(null);
					setMode("main");
					return;
				}
			}

			// Handle number keys in edit-select mode
			if (currentMode === "edit-select") {
				const num = Number.parseInt(input, 10);
				if (num >= 1 && num <= 9 && num <= availableTasks.length) {
					const task = availableTasks[num - 1];
					onEditTask?.(task.id);
					setMode("main");
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

			{mode === "redirect-task" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="blue">
						Select task to redirect to (1-9) or ESC to cancel
					</Text>
					{availableTasks.length > 0 && (
						<Box flexDirection="column" marginTop={1}>
							{availableTasks.map((task, index) => (
								<Box key={task.id} gap={1}>
									<Text color="cyan">[{index + 1}]</Text>
									<Text color="green">{task.id}</Text>
									<Text dimColor>{task.title}</Text>
								</Box>
							))}
						</Box>
					)}
				</Box>
			)}

			{mode === "block-select" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="yellow">
						Select task to block (1-9) or ESC to cancel
					</Text>
				</Box>
			)}

			{mode === "edit-select" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="magenta">
						Select task to edit (1-9) or ESC to cancel
					</Text>
					{availableTasks.length > 0 && (
						<Box flexDirection="column" marginTop={1}>
							{availableTasks.map((task, index) => (
								<Box key={task.id} gap={1}>
									<Text color="cyan">[{index + 1}]</Text>
									<Text color="green">{task.id}</Text>
									<Text dimColor>{task.title}</Text>
								</Box>
							))}
						</Box>
					)}
				</Box>
			)}
		</Box>
	);
}
