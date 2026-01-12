import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { type Agent, AgentGrid } from "../components/AgentGrid.js";
import { FooterBar } from "../components/FooterBar.js";
import { HeaderBar } from "../components/HeaderBar.js";
import TaskPanel from "../components/TaskPanel.js";
import { TwoColumnLayout } from "../components/TwoColumnLayout.js";
import { useAgentGrid } from "../hooks/useAgentGrid.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import type { Bead } from "../types/bead.js";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface ImplementationModeProps {
	mode: "semi-auto" | "autopilot";
	tasks: Bead[];
	agents: Agent[];
	maxAgents: number;
	selectedTaskId?: string | null;
	selectedAgentIndex?: number;
	onPlanningMode?: () => void;
	onToggleMode?: () => void;
	onExit?: () => void;
	allTasksClosed?: boolean;
	noReadyTasks?: boolean;
	error?: { message: string; recoverable: boolean } | null;
}

/**
 * ImplementationMode - Main operational mode for task execution
 *
 * Renders TaskPanel + AgentGrid in a two-column layout with header/footer.
 * Supports semi-auto (user selects tasks) and autopilot (automatic) modes.
 */
export function ImplementationMode({
	mode,
	tasks,
	agents,
	maxAgents,
	selectedTaskId,
	selectedAgentIndex,
	onPlanningMode,
	onToggleMode,
	onExit,
	allTasksClosed = false,
	noReadyTasks = false,
	error = null,
}: ImplementationModeProps): React.ReactElement {
	const { width } = useTerminalSize();
	const gridConfig = useAgentGrid(width, agents.length, maxAgents);
	const [showExitConfirm, setShowExitConfirm] = useState(false);

	// Calculate task stats for footer
	const taskStats = {
		done: tasks.filter((t) => t.status === "closed").length,
		running: tasks.filter((t) => t.status === "in_progress").length,
		pending: tasks.filter((t) => t.status === "open").length,
		blocked: tasks.filter((t) => t.status === "blocked").length,
	};

	// Handle keyboard input
	useInput(
		(input, key) => {
			// Handle exit confirmation
			if (showExitConfirm) {
				if (input === "y" || input === "Y") {
					onExit?.();
				} else if (input === "n" || input === "N" || key.escape) {
					setShowExitConfirm(false);
				}
				return;
			}

			// 'p' - Go to Planning Mode
			if (input === "p") {
				onPlanningMode?.();
				return;
			}

			// 'm' - Toggle mode (semi-auto/autopilot)
			if (input === "m") {
				onToggleMode?.();
				return;
			}

			// 'q' - Exit (with confirmation if agents running)
			if (input === "q") {
				const runningAgents = agents.filter((a) => a.status === "running");
				if (runningAgents.length > 0) {
					setShowExitConfirm(true);
				} else {
					onExit?.();
				}
				return;
			}
		},
		{ isActive: getIsTTY() },
	);

	// Show error state
	if (error) {
		return (
			<Box flexDirection="column" padding={1}>
				<HeaderBar
					mode={mode}
					runningAgents={agents.filter((a) => a.status === "running").length}
					maxAgents={maxAgents}
				/>
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="red"
					padding={1}
					marginY={1}
				>
					<Text color="red" bold>
						Critical Error
					</Text>
					<Text>{error.message}</Text>
					{error.recoverable && (
						<Text dimColor>Press any key to attempt recovery...</Text>
					)}
				</Box>
			</Box>
		);
	}

	// Show completion summary
	if (allTasksClosed) {
		return (
			<Box flexDirection="column" padding={1}>
				<HeaderBar mode={mode} runningAgents={0} maxAgents={maxAgents} />
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="green"
					padding={1}
					marginY={1}
				>
					<Text color="green" bold>
						All Tasks Complete!
					</Text>
					<Text>
						Completed {tasks.length} task{tasks.length !== 1 ? "s" : ""}.
					</Text>
					<Text dimColor>Press 'q' to exit.</Text>
				</Box>
			</Box>
		);
	}

	// Show exit confirmation dialog
	if (showExitConfirm) {
		const runningCount = agents.filter((a) => a.status === "running").length;
		return (
			<Box flexDirection="column" padding={1}>
				<HeaderBar
					mode={mode}
					runningAgents={runningCount}
					maxAgents={maxAgents}
				/>
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="yellow"
					padding={1}
					marginY={1}
				>
					<Text color="yellow" bold>
						Confirm Exit
					</Text>
					<Text>
						{runningCount} agent{runningCount !== 1 ? "s are" : " is"} still
						running.
					</Text>
					<Text>Are you sure you want to quit? (y/n)</Text>
				</Box>
			</Box>
		);
	}

	// No ready tasks message
	const noTasksMessage =
		noReadyTasks && tasks.length === 0 ? (
			<Box flexDirection="column" alignItems="center" padding={1}>
				<Text color={mode === "autopilot" ? "yellow" : "gray"}>
					{mode === "autopilot"
						? "Waiting for ready tasks..."
						: "No tasks ready"}
				</Text>
			</Box>
		) : null;

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<HeaderBar
				mode={mode}
				runningAgents={agents.filter((a) => a.status === "running").length}
				maxAgents={maxAgents}
			/>

			{/* Main content area */}
			{noTasksMessage || (
				<TwoColumnLayout
					leftWidth={30}
					rightWidth={70}
					left={<TaskPanel beads={tasks} selectedBeadId={selectedTaskId} />}
					right={
						<AgentGrid
							agents={agents}
							maxSlots={maxAgents}
							selectedIndex={selectedAgentIndex}
							gridConfig={gridConfig}
						/>
					}
				/>
			)}

			{/* Footer */}
			<FooterBar taskStats={taskStats} mergeQueue={{ queued: 0 }} />
		</Box>
	);
}
