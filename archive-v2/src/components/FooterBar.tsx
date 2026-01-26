import { Box, Text } from "ink";
import React from "react";
import { MergeQueueIndicator } from "./MergeQueueIndicator.js";
import { TaskSummaryStats } from "./TaskSummaryStats.js";

export interface FooterBarProps {
	taskStats: {
		done: number;
		running: number;
		pending: number;
		blocked: number;
	};
	mergeQueue: {
		queued: number;
		merging?: boolean;
		conflict?: boolean;
	};
	showHelp?: boolean;
}

export function FooterBar({
	taskStats,
	mergeQueue,
	showHelp = true,
}: FooterBarProps): React.ReactElement {
	return (
		<Box borderTop borderColor="gray" paddingX={1}>
			<Box flexDirection="row" gap={1}>
				<TaskSummaryStats
					done={taskStats.done}
					running={taskStats.running}
					pending={taskStats.pending}
					blocked={taskStats.blocked}
				/>
				<Text color="gray">|</Text>
				<MergeQueueIndicator
					queued={mergeQueue.queued}
					merging={mergeQueue.merging}
					conflict={mergeQueue.conflict}
				/>
				{showHelp && (
					<>
						<Text color="gray">|</Text>
						<Text dimColor>? help</Text>
					</>
				)}
			</Box>
		</Box>
	);
}
