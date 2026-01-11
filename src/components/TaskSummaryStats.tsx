import { Text } from "ink";
import type React from "react";

export interface TaskSummaryStatsProps {
	done: number;
	running: number;
	pending: number;
	blocked: number;
}

export function TaskSummaryStats({
	done,
	running,
	pending,
	blocked,
}: TaskSummaryStatsProps): React.ReactElement {
	return (
		<Text>
			Tasks: <Text color="green">{done} done</Text>,{" "}
			<Text color="blue">{running} running</Text>,{" "}
			<Text color="yellow">{pending} pending</Text>,{" "}
			<Text color="red">{blocked} blocked</Text>
		</Text>
	);
}
