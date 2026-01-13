import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

export interface ChatInputProps {
	onSend: (message: string) => void;
	onCancel?: () => void;
	placeholder?: string;
	history?: string[];
}

// Check if we're in an interactive terminal.
// Note: In node-pty spawned processes, stdin.isTTY may be false even with a PTY.
// Check both stdin and stdout for TTY support.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

/**
 * ChatInput component for user text input with send functionality
 */
export function ChatInput({
	onSend,
	onCancel,
	placeholder = "Type a message...",
	history = [],
}: ChatInputProps): React.ReactElement {
	const [input, setInput] = useState("");
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [savedInput, setSavedInput] = useState("");

	useInput(
		(inputChar, key) => {
			// Ctrl+C triggers cancel (either as ctrl+c or raw \x03)
			if ((key.ctrl && inputChar === "c") || inputChar === "\x03") {
				onCancel?.();
				return;
			}

			// Escape clears input
			if (key.escape) {
				setInput("");
				setHistoryIndex(-1);
				return;
			}

			// Enter sends message
			if (key.return) {
				if (input.trim()) {
					onSend(input);
					setInput("");
					setHistoryIndex(-1);
				}
				return;
			}

			// Up arrow navigates to previous history
			if (key.upArrow) {
				if (history.length > 0) {
					if (historyIndex === -1) {
						// Save current input before navigating
						setSavedInput(input);
					}
					const newIndex = Math.min(historyIndex + 1, history.length - 1);
					setHistoryIndex(newIndex);
					// History is newest-first, so we access from the end
					setInput(history[history.length - 1 - newIndex]);
				}
				return;
			}

			// Down arrow navigates to next history
			if (key.downArrow) {
				if (historyIndex > 0) {
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					setInput(history[history.length - 1 - newIndex]);
				} else if (historyIndex === 0) {
					// Back to saved input
					setHistoryIndex(-1);
					setInput(savedInput);
				}
				return;
			}

			// Backspace/delete removes character
			if (key.backspace || key.delete) {
				setInput((prev) => prev.slice(0, -1));
				return;
			}

			// Tab - ignore for now
			if (key.tab) {
				return;
			}

			// Regular character input (including newlines for shift+enter)
			if (inputChar && !key.ctrl && !key.meta) {
				setInput((prev) => prev + inputChar);
			}
		},
		{ isActive: getIsTTY() },
	);

	const displayText = input || placeholder;
	const isPlaceholder = !input;

	return (
		<Box flexDirection="row">
			<Text color="green">{"> "}</Text>
			<Text color={isPlaceholder ? "gray" : "white"}>
				{displayText}
				{!isPlaceholder && <Text color="cyan">│</Text>}
			</Text>
		</Box>
	);
}
