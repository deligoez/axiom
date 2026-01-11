import { Text } from "ink";
import type React from "react";

export interface MergeQueueIndicatorProps {
	queued: number;
	merging?: boolean;
	conflict?: boolean;
}

export function MergeQueueIndicator({
	queued,
	merging,
	conflict,
}: MergeQueueIndicatorProps): React.ReactElement {
	// Conflict takes priority over merging
	if (conflict) {
		return (
			<Text>
				Merge: <Text color="red">⚠ conflict</Text>
			</Text>
		);
	}

	if (merging) {
		return (
			<Text>
				Merge: <Text color="yellow">● merging...</Text>
			</Text>
		);
	}

	return <Text>Merge: {queued} queued</Text>;
}
