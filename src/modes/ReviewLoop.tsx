import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { ReviewResults } from "../components/ReviewResults.js";
import type { PlanningStateData } from "../services/PlanningState.js";
import type {
	BatchValidationResult,
	ValidatorTask,
} from "../services/TaskValidator.js";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

// Event types emitted to XState machine
export type ReviewLoopEvent =
	| { type: "VALIDATION_STARTED"; taskCount: number }
	| { type: "VALIDATION_COMPLETED"; valid: number; invalid: number }
	| { type: "FIX_APPLIED"; fixCount: number }
	| {
			type: "REVIEW_COMPLETE";
			mode: "semi-auto" | "autopilot";
			taskCount: number;
	  }
	| { type: "BACK_TO_PLANNING" };

export interface ReviewLoopProps {
	tasks: ValidatorTask[];
	validator: {
		validateAll: (tasks: ValidatorTask[]) => BatchValidationResult;
	};
	planningState: {
		save: (state: Partial<PlanningStateData>) => void;
	};
	maxIterations: number;
	initialIteration?: number;
	onEvent: (event: ReviewLoopEvent) => void;
	onEditRules?: () => void;
}

type Mode = "semi-auto" | "autopilot";

// Run initial validation synchronously to avoid extra render cycles
function runValidation(
	tasks: ValidatorTask[],
	validator: ReviewLoopProps["validator"],
	onEvent: (event: ReviewLoopEvent) => void,
): BatchValidationResult {
	// Emit validation started
	onEvent({
		type: "VALIDATION_STARTED",
		taskCount: tasks.length,
	});

	// Run validation
	const validationResult = validator.validateAll(tasks);

	// Calculate valid/invalid counts
	const invalid = validationResult.errors.length;
	const valid = tasks.length - invalid;

	// Emit validation completed
	onEvent({
		type: "VALIDATION_COMPLETED",
		valid,
		invalid,
	});

	return validationResult;
}

/**
 * ReviewLoop iterates validation until all tasks are valid, then allows mode selection
 */
export function ReviewLoop({
	tasks,
	validator,
	planningState,
	maxIterations,
	initialIteration = 1,
	onEvent,
	onEditRules,
}: ReviewLoopProps): React.ReactElement {
	// Run initial validation synchronously
	const [result, setResult] = useState<BatchValidationResult>(() =>
		runValidation(tasks, validator, onEvent),
	);
	const [iteration, setIteration] = useState(initialIteration);
	const [selectedMode, setSelectedMode] = useState<Mode>("semi-auto");

	const allValid = result.errors.length === 0;
	const isLastIteration = iteration >= maxIterations;
	const isApproachingMax = iteration >= maxIterations - 1;

	const handleApplyFixes = () => {
		const fixedTasks = result.applyAllFixes();
		onEvent({
			type: "FIX_APPLIED",
			fixCount: fixedTasks.length,
		});
		// Re-validate and increment iteration
		setResult(runValidation(tasks, validator, onEvent));
		setIteration((prev) => prev + 1);
	};

	const handleReviewAgain = () => {
		// Re-validate and increment iteration
		setResult(runValidation(tasks, validator, onEvent));
		setIteration((prev) => prev + 1);
	};

	const handleBackToPlan = () => {
		onEvent({ type: "BACK_TO_PLANNING" });
	};

	const handleConfirmMode = () => {
		// 1. Save state FIRST (critical for crash recovery)
		planningState.save({
			status: "ready",
			chosenMode: selectedMode,
		});

		// 2. THEN emit event to machine
		onEvent({
			type: "REVIEW_COMPLETE",
			mode: selectedMode,
			taskCount: tasks.length,
		});
	};

	const handleEditRules = () => {
		onEditRules?.();
	};

	useInput(
		(input, key) => {
			if (allValid) {
				// Mode selection mode
				if (input === "1") {
					setSelectedMode("semi-auto");
				} else if (input === "2") {
					setSelectedMode("autopilot");
				} else if (key.return) {
					handleConfirmMode();
				}
			} else {
				// Validation mode
				if (input === "f") {
					handleApplyFixes();
				} else if (input === "r") {
					handleReviewAgain();
				} else if (input === "b") {
					handleBackToPlan();
				} else if (input === "e") {
					handleEditRules();
				}
			}
		},
		{ isActive: getIsTTY() },
	);

	// All valid - show mode selection
	if (allValid) {
		return (
			<Box flexDirection="column" gap={1}>
				<ReviewResults
					iteration={iteration}
					maxIterations={maxIterations}
					errors={[]}
					warnings={result.warnings}
				/>

				<Box flexDirection="column" marginTop={1}>
					<Text bold color="green">
						All tasks valid! Select implementation mode:
					</Text>
					<Box flexDirection="column" marginTop={1}>
						<Box gap={1}>
							<Text color={selectedMode === "semi-auto" ? "cyan" : "gray"}>
								{selectedMode === "semi-auto" ? "→" : " "}
							</Text>
							<Text bold={selectedMode === "semi-auto"}>[1] Semi-Auto</Text>
							<Text dimColor> - Manual task approval</Text>
						</Box>
						<Box gap={1}>
							<Text color={selectedMode === "autopilot" ? "cyan" : "gray"}>
								{selectedMode === "autopilot" ? "→" : " "}
							</Text>
							<Text bold={selectedMode === "autopilot"}>[2] Autopilot</Text>
							<Text dimColor> - Fully automated</Text>
						</Box>
					</Box>
					<Box marginTop={1}>
						<Text dimColor>Press [Enter] to confirm, [b] to go back</Text>
					</Box>
				</Box>
			</Box>
		);
	}

	// Has errors - show validation results
	return (
		<Box flexDirection="column" gap={1}>
			<ReviewResults
				iteration={iteration}
				maxIterations={maxIterations}
				errors={result.errors}
				warnings={result.warnings}
				suggestions={result.suggestions}
				showActions
			/>

			{isApproachingMax && !isLastIteration && (
				<Box marginTop={1}>
					<Text color="yellow" bold>
						⚠ Warning: This is your last iteration before max ({maxIterations})
					</Text>
				</Box>
			)}

			{isLastIteration && (
				<Box marginTop={1}>
					<Text color="red" bold>
						⚠ Final iteration reached. Consider reviewing your tasks manually.
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					[f] Apply fixes | [r] Review again | [e] Edit rules | [b] Back to plan
				</Text>
			</Box>
		</Box>
	);
}
