import { Box, Text } from "ink";
import React from "react";
import type { ExitDialogState } from "../hooks/useExitHandler.js";

export interface ExitDialogProps {
	state: ExitDialogState;
}

/**
 * ExitDialog - Confirmation dialog when quitting with running agents
 *
 * Shows:
 * - Agent count
 * - Options: Kill all, Wait for agents, Cancel
 * - Countdown timer before auto-kill
 */
export default function ExitDialog({
	state,
}: ExitDialogProps): React.ReactElement | null {
	if (!state.visible) {
		return null;
	}

	// Killing state - show progress
	if (state.action === "killing") {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				paddingX={2}
				paddingY={1}
			>
				<Box justifyContent="center" marginBottom={1}>
					<Text bold color="red">
						STOPPING AGENTS...
					</Text>
				</Box>
				<Box justifyContent="center">
					<Text dimColor>Please wait</Text>
				</Box>
			</Box>
		);
	}

	// Waiting state - show waiting message
	if (state.action === "waiting") {
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
						WAITING FOR AGENTS
					</Text>
				</Box>
				<Box flexDirection="column" marginBottom={1}>
					<Text>
						{state.agentCount} agent{state.agentCount !== 1 ? "s" : ""} still
						running.
					</Text>
					<Text dimColor>Will exit when all agents finish.</Text>
				</Box>
				<Box justifyContent="center">
					<Text dimColor>[k] Kill all now | [ESC] Cancel</Text>
				</Box>
			</Box>
		);
	}

	// Pending state - show confirmation dialog
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
					EXIT CHORUS?
				</Text>
			</Box>

			<Box flexDirection="column" marginBottom={1}>
				<Text>
					{state.agentCount} agent{state.agentCount !== 1 ? "s" : ""}{" "}
					{state.agentCount !== 1 ? "are" : "is"} still running.
				</Text>
			</Box>

			<Box flexDirection="column" marginBottom={1}>
				<Text>[k] Kill all agents and exit</Text>
				<Text>[w] Wait for agents to finish</Text>
				<Text>[ESC] Cancel</Text>
			</Box>

			<Box justifyContent="center">
				<Text color="red">Auto-kill in: {state.countdown}s</Text>
			</Box>
		</Box>
	);
}
