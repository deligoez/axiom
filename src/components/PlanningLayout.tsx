import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { useTerminalSize } from "../hooks/useTerminalSize.js";

export interface PlanningLayoutProps {
	children: React.ReactNode;
	onMessage: (text: string) => void;
}

type FocusArea = "agent" | "input";

// Check if we're in an interactive terminal.
// Note: In node-pty spawned processes, stdin.isTTY may be false even with a PTY.
// Check both stdin and stdout for TTY support.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

/**
 * PlanningLayout provides 80% agent window + 20% chat input layout for planning mode
 */
export function PlanningLayout({
	children,
	onMessage,
}: PlanningLayoutProps): React.ReactElement {
	const { height } = useTerminalSize();
	const [focus, setFocus] = useState<FocusArea>("agent");
	const [inputText, setInputText] = useState("");

	// Calculate heights (accounting for header and footer)
	const availableHeight = Math.max(height - 4, 10);
	const agentHeight = Math.floor(availableHeight * 0.8);
	const inputHeight = Math.floor(availableHeight * 0.2);

	// Only use useInput when raw mode is supported (i.e., in a real TTY)
	useInput(
		(input, key) => {
			// Tab toggles focus
			if (key.tab) {
				setFocus((prev) => (prev === "agent" ? "input" : "agent"));
				return;
			}

			// Handle input when focused on input area
			if (focus === "input") {
				if (key.return) {
					if (inputText.trim()) {
						onMessage(inputText);
						setInputText("");
					}
				} else if (key.backspace || key.delete) {
					setInputText((prev) => prev.slice(0, -1));
				} else if (!key.ctrl && !key.meta && input) {
					setInputText((prev) => prev + input);
				}
			}
		},
		{ isActive: getIsTTY() },
	);

	const agentBorderColor = focus === "agent" ? "cyan" : "gray";
	const inputBorderColor = focus === "input" ? "cyan" : "gray";

	return (
		<Box flexDirection="column" height={height}>
			{/* Header */}
			<Box justifyContent="space-between" paddingX={1}>
				<Box gap={1}>
					<Text bold color="magenta">
						PLANNING
					</Text>
					<Text dimColor>mode</Text>
				</Box>
				<Text dimColor>Tab: switch focus</Text>
			</Box>

			{/* Agent window (80%) */}
			<Box
				height={agentHeight}
				borderStyle="single"
				borderColor={agentBorderColor}
				flexDirection="column"
				overflow="hidden"
			>
				<Box flexGrow={1} flexDirection="column" paddingX={1}>
					{children}
				</Box>
			</Box>

			{/* Chat input area (20%) */}
			<Box
				height={inputHeight}
				borderStyle="single"
				borderColor={inputBorderColor}
				flexDirection="column"
			>
				<Box paddingX={1} flexDirection="column">
					<Text dimColor>Message:</Text>
					<Box>
						<Text color={focus === "input" ? "white" : "gray"}>
							{inputText || (focus === "input" ? "│" : "")}
						</Text>
					</Box>
				</Box>
			</Box>

			{/* Footer */}
			<Box justifyContent="space-between" paddingX={1}>
				<Text dimColor>Enter: send | Tab: switch | Esc: back</Text>
			</Box>
		</Box>
	);
}
