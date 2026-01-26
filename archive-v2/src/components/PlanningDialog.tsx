import { Box, Text, useInput } from "ink";
import React from "react";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface PlanningDialogProps {
	isOpen: boolean;
	readyTasks: number;
	threshold: number;
	nextSection: string;
	onPlanNext: () => void;
	onPlanAll: () => void;
	onCancel: () => void;
}

/**
 * PlanningDialog - Dialog for triggering incremental planning
 *
 * Shows current status and planning options:
 * - [P] Plan Next: Plan the next section
 * - [A] Plan All: Plan all remaining sections
 * - [C] Cancel: Close dialog
 */
export function PlanningDialog({
	isOpen,
	readyTasks,
	threshold,
	nextSection,
	onPlanNext,
	onPlanAll,
	onCancel,
}: PlanningDialogProps): React.ReactElement | null {
	useInput(
		(input, key) => {
			if (!isOpen) return;

			if (key.escape || input === "c" || input === "C") {
				onCancel();
				return;
			}

			if (input === "p" || input === "P") {
				onPlanNext();
				return;
			}

			if (input === "a" || input === "A") {
				onPlanAll();
				return;
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
				Plan Tasks
			</Text>

			<Box marginTop={1} flexDirection="column" gap={0}>
				<Text>
					Ready: {readyTasks} / Threshold: {threshold}
				</Text>
				<Text>Next section: {nextSection}</Text>
			</Box>

			<Box marginTop={1} gap={2}>
				<Text>
					<Text color="cyan" bold>
						[P]
					</Text>{" "}
					Plan Next
				</Text>
				<Text>
					<Text color="cyan" bold>
						[A]
					</Text>{" "}
					Plan All
				</Text>
				<Text>
					<Text color="cyan" bold>
						[C]
					</Text>{" "}
					Cancel
				</Text>
			</Box>
		</Box>
	);
}
