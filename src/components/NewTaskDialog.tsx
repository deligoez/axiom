import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface NewTaskDialogProps {
	isOpen: boolean;
	onSubmit: (title: string) => Promise<void>;
	onCancel: () => void;
	error?: string | null;
}

/**
 * NewTaskDialog - Dialog for creating a new task
 *
 * Shows a modal dialog for entering task title.
 * - Enter: Submit task
 * - Escape: Cancel
 */
export function NewTaskDialog({
	isOpen,
	onSubmit,
	onCancel,
	error,
}: NewTaskDialogProps): React.ReactElement | null {
	const [title, setTitle] = useState("");

	useInput(
		(input, key) => {
			if (!isOpen) return;

			// Cancel on Escape
			if (key.escape) {
				onCancel();
				return;
			}

			// Submit on Enter (only if title is non-empty)
			if (key.return) {
				if (title.trim()) {
					onSubmit(title.trim());
					setTitle("");
				}
				return;
			}

			// Handle backspace
			if (key.backspace || key.delete) {
				setTitle((prev) => prev.slice(0, -1));
				return;
			}

			// Add printable characters
			if (input && !key.ctrl && !key.meta) {
				setTitle((prev) => prev + input);
			}
		},
		{ isActive: getIsTTY() && isOpen },
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
		>
			<Text bold color="cyan">
				New Task
			</Text>

			<Box marginTop={1}>
				<Text dimColor>Title: </Text>
				<Text>{title}</Text>
				<Text color="cyan">█</Text>
			</Box>

			{error && (
				<Box marginTop={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					Press <Text bold>Enter</Text> to submit, <Text bold>Esc</Text> to
					cancel
				</Text>
			</Box>
		</Box>
	);
}
