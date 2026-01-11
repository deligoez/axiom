import { Box, Text } from "ink";
import type React from "react";
import { useState } from "react";
import type { PlanReviewConfig } from "../../types/config.js";

export interface PlanReviewConfigStepProps {
	config: PlanReviewConfig;
	onComplete: (config: PlanReviewConfig) => void;
}

export function PlanReviewConfigStep({
	config,
	onComplete: _onComplete,
}: PlanReviewConfigStepProps): React.ReactElement {
	const [_currentConfig, _setConfig] = useState<PlanReviewConfig>(config);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Step 5/5
				</Text>
				<Text> - </Text>
				<Text bold>Adaptive Plan Review</Text>
			</Box>

			{/* Feature explanation */}
			<Box marginBottom={1} paddingX={2}>
				<Text dimColor>
					Plan review automatically refines tasks based on learnings during
					implementation.
				</Text>
			</Box>

			{/* Settings */}
			<Box flexDirection="column" gap={1} paddingX={2}>
				{/* Enabled */}
				<Box gap={1}>
					<Text>Enable plan review:</Text>
					<Text color={config.enabled ? "green" : "yellow"} bold>
						{config.enabled ? "Yes" : "No"}
					</Text>
				</Box>

				{/* Max iterations */}
				<Box gap={1}>
					<Text>Max review iterations:</Text>
					<Text color="green" bold>
						{config.maxIterations}
					</Text>
				</Box>

				{/* Trigger on */}
				<Box gap={1}>
					<Text>Trigger on:</Text>
					<Text color="cyan" bold>
						{config.triggerOn.length > 0
							? config.triggerOn.join(", ")
							: "(none)"}
					</Text>
				</Box>

				{/* Auto-apply */}
				<Box gap={1}>
					<Text>Auto-apply changes:</Text>
					<Text
						color={
							config.autoApply === "all"
								? "yellow"
								: config.autoApply === "minor"
									? "green"
									: "gray"
						}
						bold
					>
						{config.autoApply}
					</Text>
				</Box>

				{/* Require approval */}
				<Box gap={1}>
					<Text>Require approval for:</Text>
					<Text color="cyan" bold>
						{config.requireApproval.length > 0
							? config.requireApproval.join(", ")
							: "(none)"}
					</Text>
				</Box>
			</Box>

			{/* Instructions */}
			<Box marginTop={1} paddingX={2}>
				<Text dimColor>
					Type values to change settings, or "done" to finish
				</Text>
			</Box>
		</Box>
	);
}
