import { Text } from "ink";
import type React from "react";

export interface Blocker {
	id: string;
	status: "open" | "in_progress" | "closed";
}

export interface BlockedTaskInfoProps {
	blockers: Blocker[];
}

export function BlockedTaskInfo({
	blockers,
}: BlockedTaskInfoProps): React.ReactElement | null {
	if (blockers.length === 0) {
		return null;
	}

	const content =
		blockers.length === 1
			? `${blockers[0].id} (${blockers[0].status})`
			: blockers.map((b) => b.id).join(", ");

	return <Text dimColor>└─ Waiting: {content}</Text>;
}
