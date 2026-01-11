import { Box, Text } from "ink";

interface StatusBarProps {
	agentCount?: number;
	taskCount?: number;
	status?: string;
}

export default function StatusBar({
	agentCount,
	taskCount,
	status,
}: StatusBarProps) {
	return (
		<Box justifyContent="space-between" paddingX={1}>
			<Box gap={2}>
				<Text bold color="cyan">
					Chorus
				</Text>
				{taskCount !== undefined && (
					<Text dimColor>
						{taskCount} task{taskCount !== 1 ? "s" : ""}
					</Text>
				)}
				{agentCount !== undefined && (
					<Text dimColor>
						{agentCount} agent{agentCount !== 1 ? "s" : ""}
					</Text>
				)}
				{status && <Text color="yellow">{status}</Text>}
			</Box>
			<Text dimColor>Press q to quit</Text>
		</Box>
	);
}
