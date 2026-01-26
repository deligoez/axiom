import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";
import { PlanningLayout } from "../components/PlanningLayout.js";

export interface PlanningMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

export interface PlanningTask {
	id: string;
	title: string;
	description?: string;
}

export interface PlanningModeProps {
	onModeSwitch: (mode: string, data?: unknown) => void;
	onLog?: (event: {
		mode: string;
		eventType: string;
		details: Record<string, unknown>;
	}) => void;
	initialMessages?: PlanningMessage[];
	tasks?: PlanningTask[];
}

/**
 * PlanningMode provides planning workflow with conversation and task management
 */
export function PlanningMode({
	onModeSwitch: _onModeSwitch,
	onLog,
	initialMessages = [],
	tasks = [],
}: PlanningModeProps): React.ReactElement {
	const [messages, setMessages] = useState<PlanningMessage[]>(initialMessages);

	// Log mode entry on mount
	useEffect(() => {
		onLog?.({
			mode: "planning",
			eventType: "mode_entered",
			details: { messageCount: messages.length },
		});
	}, [onLog, messages.length]);

	const handleMessage = (text: string) => {
		// Add user message with unique id
		const userMessage: PlanningMessage = {
			id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			role: "user",
			content: text,
		};
		setMessages((prev) => [...prev, userMessage]);

		// Log user message
		onLog?.({
			mode: "planning",
			eventType: "user_message",
			details: { messageLength: text.length },
		});
	};

	return (
		<PlanningLayout onMessage={handleMessage}>
			<Box flexDirection="column" gap={1}>
				{/* Conversation history */}
				{messages.map((msg) => (
					<Box key={msg.id} flexDirection="column">
						<Text color={msg.role === "user" ? "cyan" : "green"} bold>
							{msg.role === "user" ? "You:" : "Agent:"}
						</Text>
						<Text>{msg.content}</Text>
					</Box>
				))}

				{/* Task panel when tasks exist */}
				{tasks.length > 0 && (
					<Box
						flexDirection="column"
						marginTop={1}
						borderStyle="single"
						borderColor="yellow"
						paddingX={1}
					>
						<Text bold color="yellow">
							Tasks ({tasks.length})
						</Text>
						{tasks.map((task, taskNumber) => (
							<Box key={task.id} gap={1}>
								<Text dimColor>{taskNumber + 1}.</Text>
								<Text>{task.title}</Text>
							</Box>
						))}
					</Box>
				)}

				{/* Empty state */}
				{messages.length === 0 && tasks.length === 0 && (
					<Text dimColor>
						Describe your goal or paste a spec path to begin planning...
					</Text>
				)}
			</Box>
		</PlanningLayout>
	);
}
