import { Box, Text } from "ink";
import React from "react";
import type { ValidationError } from "../services/ValidationRulesEngine.js";

export interface ReviewResultsProps {
	iteration: number;
	maxIterations: number;
	errors: ValidationError[];
	warnings: ValidationError[];
	suggestions?: string[];
	taskId?: string;
	showActions?: boolean;
}

/**
 * ReviewResults displays validation results and iteration progress
 */
export function ReviewResults({
	iteration,
	maxIterations,
	errors,
	warnings,
	suggestions = [],
	taskId,
	showActions = false,
}: ReviewResultsProps): React.ReactElement {
	const hasIssues = errors.length > 0 || warnings.length > 0;

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header with iteration */}
			<Box gap={1}>
				<Text bold color="cyan">
					Iteration {iteration}/{maxIterations}
				</Text>
				<Text dimColor>
					- {errors.length} errors, {warnings.length} warnings
				</Text>
			</Box>

			{/* Success state */}
			{!hasIssues && (
				<Box>
					<Text color="green" bold>
						✓ All tasks valid - no issues found
					</Text>
				</Box>
			)}

			{/* Errors section */}
			{errors.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="red">
						Errors ({errors.length})
					</Text>
					{errors.map((error) => (
						<Box
							key={`error-${error.rule}-${error.field ?? error.message}`}
							flexDirection="column"
							marginLeft={1}
						>
							<Box gap={1}>
								<Text color="red">✗</Text>
								{taskId && <Text dimColor>[{taskId}]</Text>}
								<Text>{error.message}</Text>
							</Box>
						</Box>
					))}
				</Box>
			)}

			{/* Warnings section */}
			{warnings.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="yellow">
						Warnings ({warnings.length})
					</Text>
					{warnings.map((warning) => (
						<Box
							key={`warning-${warning.rule}-${warning.field ?? warning.message}`}
							marginLeft={1}
							gap={1}
						>
							<Text color="yellow">⚠</Text>
							<Text>{warning.message}</Text>
						</Box>
					))}
				</Box>
			)}

			{/* Suggestions section */}
			{suggestions.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="blue">
						Suggestions
					</Text>
					{suggestions.map((suggestion) => (
						<Box key={`suggestion-${suggestion}`} marginLeft={1} gap={1}>
							<Text color="blue">→</Text>
							<Text>{suggestion}</Text>
						</Box>
					))}
				</Box>
			)}

			{/* Actions hint */}
			{showActions && hasIssues && (
				<Box marginTop={1}>
					<Text dimColor>
						Actions: [f] fix | [s] split | [r] reorder | [Enter] continue
					</Text>
				</Box>
			)}
		</Box>
	);
}
