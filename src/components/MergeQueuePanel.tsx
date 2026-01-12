import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export type MergeQueueItemStatus =
	| "queued"
	| "in_progress"
	| "conflict"
	| "completed"
	| "failed";

export interface MergeQueueItem {
	id: string;
	taskId: string;
	branch: string;
	status: MergeQueueItemStatus;
	conflictCount?: number;
}

export interface MergeQueuePanelProps {
	isOpen: boolean;
	queue: MergeQueueItem[];
	onClose: () => void;
	onApprove?: (itemId: string) => void;
	onReject?: (itemId: string) => void;
}

function getStatusColor(status: MergeQueueItemStatus): string {
	switch (status) {
		case "queued":
			return "gray";
		case "in_progress":
			return "yellow";
		case "conflict":
			return "red";
		case "completed":
			return "green";
		case "failed":
			return "red";
		default:
			return "white";
	}
}

function getStatusIcon(status: MergeQueueItemStatus): string {
	switch (status) {
		case "queued":
			return "○";
		case "in_progress":
			return "●";
		case "conflict":
			return "⚠";
		case "completed":
			return "✓";
		case "failed":
			return "✗";
		default:
			return "?";
	}
}

/**
 * MergeQueuePanel - Shows merge queue status and allows actions
 *
 * Features:
 * - Shows queued, in-progress, and recent completed/failed merges
 * - j/k navigation for item selection
 * - 'a' to approve, 'x' to reject selected merge
 * - ESC to close panel
 */
export function MergeQueuePanel({
	isOpen,
	queue,
	onClose,
	onApprove,
	onReject,
}: MergeQueuePanelProps): React.ReactElement | null {
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Handle keyboard input when panel is open
	useInput(
		(input, key) => {
			if (!isOpen) return;

			// Navigation
			if (input === "j" || key.downArrow) {
				setSelectedIndex((prev) => Math.min(prev + 1, queue.length - 1));
				return;
			}
			if (input === "k" || key.upArrow) {
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
				return;
			}

			// Actions
			if (input === "a" && queue[selectedIndex]) {
				onApprove?.(queue[selectedIndex].id);
				return;
			}
			if (input === "x" && queue[selectedIndex]) {
				onReject?.(queue[selectedIndex].id);
				return;
			}

			// Close
			if (key.escape) {
				onClose();
				return;
			}
		},
		{ isActive: isOpen && getIsTTY() },
	);

	if (!isOpen) {
		return null;
	}

	const currentItems = queue.filter(
		(item) => item.status === "queued" || item.status === "in_progress",
	);
	const conflictItems = queue.filter((item) => item.status === "conflict");
	const recentItems = queue
		.filter((item) => item.status === "completed" || item.status === "failed")
		.slice(0, 5);

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={1}
		>
			<Box justifyContent="center" marginBottom={1}>
				<Text bold>MERGE QUEUE</Text>
			</Box>

			{/* Queued and In Progress */}
			{currentItems.length > 0 && (
				<Box flexDirection="column" marginBottom={1}>
					<Text bold dimColor>
						Queue ({currentItems.length})
					</Text>
					{currentItems.map((item) => {
						const isSelected = queue.indexOf(item) === selectedIndex;
						return (
							<Box key={item.id} gap={1}>
								<Text color={isSelected ? "cyan" : "gray"}>
									{isSelected ? "→" : " "}
								</Text>
								<Text color={getStatusColor(item.status)}>
									{getStatusIcon(item.status)}
								</Text>
								<Text>{item.taskId}</Text>
								<Text dimColor>{item.branch}</Text>
							</Box>
						);
					})}
				</Box>
			)}

			{/* Conflicts */}
			{conflictItems.length > 0 && (
				<Box flexDirection="column" marginBottom={1}>
					<Text bold color="red">
						Conflicts ({conflictItems.length})
					</Text>
					{conflictItems.map((item) => {
						const isSelected = queue.indexOf(item) === selectedIndex;
						return (
							<Box key={item.id} gap={1}>
								<Text color={isSelected ? "cyan" : "gray"}>
									{isSelected ? "→" : " "}
								</Text>
								<Text color="red">{getStatusIcon(item.status)}</Text>
								<Text>{item.taskId}</Text>
								<Text dimColor>{item.branch}</Text>
								{item.conflictCount !== undefined && (
									<Text color="red">({item.conflictCount} conflicts)</Text>
								)}
							</Box>
						);
					})}
				</Box>
			)}

			{/* Recent completed/failed */}
			{recentItems.length > 0 && (
				<Box flexDirection="column" marginBottom={1}>
					<Text bold dimColor>
						Recent (last 5)
					</Text>
					{recentItems.map((item) => (
						<Box key={item.id} gap={1}>
							<Text> </Text>
							<Text color={getStatusColor(item.status)}>
								{getStatusIcon(item.status)}
							</Text>
							<Text dimColor>{item.taskId}</Text>
							<Text dimColor>{item.branch}</Text>
						</Box>
					))}
				</Box>
			)}

			{/* Empty state */}
			{queue.length === 0 && (
				<Box marginY={1}>
					<Text dimColor>No items in merge queue</Text>
				</Box>
			)}

			{/* Actions */}
			<Box marginTop={1}>
				<Text dimColor>
					[j/k] Navigate | [a] Approve | [x] Reject | [ESC] Close
				</Text>
			</Box>
		</Box>
	);
}
