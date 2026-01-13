/**
 * Agent Introduction Component
 *
 * Shows all Chorus agents with their roles and customization paths.
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import { PERSONAS, type PersonaName } from "../types/persona.js";

export interface AgentIntroductionProps {
	/** Project directory */
	projectDir: string;
	/** Called when user presses any key to finish */
	onFinish: () => void;
}

/** Check for TTY (real terminal or PTY) */
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

/**
 * Introduction screen showing all Chorus agents.
 */
export function AgentIntroduction({
	projectDir: _projectDir,
	onFinish,
}: AgentIntroductionProps): React.ReactElement {
	// Handle any key press to finish
	useInput(
		() => {
			onFinish();
		},
		{ isActive: getIsTTY() },
	);

	const personaNames: PersonaName[] = [
		"sage",
		"chip",
		"archie",
		"patch",
		"scout",
		"echo",
	];

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Meet Your Chorus Team
				</Text>
			</Box>

			{/* Agent list */}
			<Box flexDirection="column" gap={1}>
				{personaNames.map((name) => {
					const persona = PERSONAS[name];
					return (
						<Box key={name} flexDirection="column">
							<Box gap={1}>
								<Text color={persona.color} bold>
									{persona.displayName}
								</Text>
								<Text dimColor>({persona.role})</Text>
								{persona.singular && <Text color="yellow">[singular]</Text>}
							</Box>
							<Box marginLeft={2}>
								<Text dimColor>{persona.description}</Text>
							</Box>
						</Box>
					);
				})}
			</Box>

			{/* Customization paths */}
			<Box flexDirection="column" marginTop={1}>
				<Text bold>Customization Paths:</Text>
				<Box flexDirection="column" marginLeft={2} marginTop={1}>
					<Text>
						<Text dimColor>Per-agent:</Text>{" "}
						<Text color="cyan">.chorus/agents/{"{name}"}/prompt.md</Text>
					</Text>
					<Text>
						<Text dimColor>Per-agent:</Text>{" "}
						<Text color="cyan">.chorus/agents/{"{name}"}/rules.md</Text>
					</Text>
					<Text>
						<Text dimColor>Per-agent:</Text>{" "}
						<Text color="cyan">.chorus/agents/{"{name}"}/skills/</Text>
					</Text>
					<Text>
						<Text dimColor>Shared:</Text>{" "}
						<Text color="cyan">.chorus/rules/</Text>
					</Text>
				</Box>
			</Box>

			{/* Finish instruction */}
			<Box marginTop={1}>
				<Text dimColor>Press any key to finish...</Text>
			</Box>
		</Box>
	);
}
