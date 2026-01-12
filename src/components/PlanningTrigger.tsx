import { Box, Text, useInput } from "ink";
import type React from "react";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface PlanningTriggerProps {
	plannedSections: number;
	totalSections: number;
	hasDraftSections: boolean;
	isDisabled?: boolean;
	onTrigger: () => void;
	onForceTrigger: () => void;
}

/**
 * PlanningTrigger - Status bar component for triggering incremental planning
 *
 * Displays spec progress and provides keyboard shortcuts:
 * - P: Plan more tasks (if draft sections exist)
 * - p (lowercase/Shift+P alternative): Force plan (always enabled)
 */
export function PlanningTrigger({
	plannedSections,
	totalSections,
	hasDraftSections,
	isDisabled = false,
	onTrigger,
	onForceTrigger,
}: PlanningTriggerProps): React.ReactElement {
	useInput(
		(input, _key) => {
			// Force trigger with lowercase p (Shift+P workaround)
			if (input === "p") {
				onForceTrigger();
				return;
			}

			// Normal trigger with uppercase P
			if (input === "P") {
				if (!isDisabled && hasDraftSections) {
					onTrigger();
				}
				return;
			}
		},
		{ isActive: getIsTTY() },
	);

	const canPlan = hasDraftSections && !isDisabled;

	return (
		<Box gap={1}>
			<Text>
				Spec: {plannedSections}/{totalSections}
			</Text>
			{hasDraftSections ? (
				<Text dimColor={!canPlan}>
					<Text color={canPlan ? "cyan" : undefined}>[P]</Text>
					{isDisabled ? " (disabled)" : " Plan"}
				</Text>
			) : (
				<Text color="green">All planned</Text>
			)}
		</Box>
	);
}
