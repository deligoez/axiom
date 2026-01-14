import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

// TTY check for useInput
const getIsTTY = () => Boolean(process.stdin?.isTTY);

// Quick issue types
const QUICK_ISSUES = [
	{ id: "tests", label: "Tests failing" },
	{ id: "types", label: "Type errors" },
	{ id: "lint", label: "Lint issues" },
	{ id: "incomplete", label: "Implementation incomplete" },
	{ id: "wrong", label: "Wrong approach" },
] as const;

// Redo strategy options
const REDO_OPTIONS = [
	{ id: "keep", label: "Keep changes" },
	{ id: "fresh", label: "Fresh start" },
	{ id: "checkpoint", label: "Reset to checkpoint" },
] as const;

// Priority change options
const PRIORITY_OPTIONS = [
	{ id: "same", label: "Same priority" },
	{ id: "p0", label: "Bump to P0" },
	{ id: "p2", label: "Lower to P2" },
] as const;

export type QuickIssueId = (typeof QUICK_ISSUES)[number]["id"];
export type RedoStrategy = (typeof REDO_OPTIONS)[number]["id"];
export type PriorityChange = (typeof PRIORITY_OPTIONS)[number]["id"];

export interface FeedbackFormData {
	quickIssues: QuickIssueId[];
	customFeedback: string;
	redoStrategy: RedoStrategy;
	priorityChange: PriorityChange;
}

export interface FeedbackModalProps {
	taskId: string;
	iterationCount: number;
	isOpen: boolean;
	onSubmit: (data: FeedbackFormData) => void;
	onCancel: () => void;
}

/**
 * Modal form for submitting redo feedback with options.
 */
export function FeedbackModal({
	taskId,
	iterationCount,
	isOpen,
	onSubmit,
	onCancel,
}: FeedbackModalProps): React.ReactElement | null {
	const [selectedIssues, setSelectedIssues] = useState<Set<QuickIssueId>>(
		new Set(),
	);
	const [customFeedback, setCustomFeedback] = useState("");
	const [redoStrategy, setRedoStrategy] = useState<RedoStrategy>("keep");
	const [priorityChange, setPriorityChange] = useState<PriorityChange>("same");
	const [focusedSection, setFocusedSection] = useState<
		"issues" | "feedback" | "redo" | "priority"
	>("issues");
	const [validationError, setValidationError] = useState<string | null>(null);

	useInput(
		(input, key) => {
			if (!isOpen) return;

			// Escape cancels
			if (key.escape) {
				onCancel();
				return;
			}

			// Enter submits
			if (key.return) {
				// Validate - at least one issue or custom feedback required
				if (selectedIssues.size === 0 && customFeedback.trim() === "") {
					setValidationError("Please select an issue or add feedback");
					return;
				}

				onSubmit({
					quickIssues: Array.from(selectedIssues),
					customFeedback,
					redoStrategy,
					priorityChange,
				});
				return;
			}

			// Tab cycles through sections
			if (key.tab) {
				const sections = ["issues", "feedback", "redo", "priority"] as const;
				const currentIdx = sections.indexOf(focusedSection);
				const nextIdx = key.shift
					? (currentIdx - 1 + sections.length) % sections.length
					: (currentIdx + 1) % sections.length;
				setFocusedSection(sections[nextIdx]);
				return;
			}

			// Number keys 1-5 toggle quick issues
			if (/^[1-5]$/.test(input)) {
				const issueIndex = Number.parseInt(input, 10) - 1;
				const issueId = QUICK_ISSUES[issueIndex]?.id;
				if (issueId) {
					setSelectedIssues((prev) => {
						const newSet = new Set(prev);
						if (newSet.has(issueId)) {
							newSet.delete(issueId);
						} else {
							newSet.add(issueId);
						}
						return newSet;
					});
					setValidationError(null);
				}
				return;
			}

			// K/F/R/P keys to select redo strategy (when in redo section)
			if (focusedSection === "redo") {
				if (input === "k" || input === "K") {
					setRedoStrategy("keep");
					return;
				}
				if (input === "f" || input === "F") {
					setRedoStrategy("fresh");
					return;
				}
				if (input === "c" || input === "C") {
					setRedoStrategy("checkpoint");
					return;
				}
			}

			// S/0/2 keys to select priority (when in priority section)
			if (focusedSection === "priority") {
				if (input === "s" || input === "S") {
					setPriorityChange("same");
					return;
				}
				if (input === "0") {
					setPriorityChange("p0");
					return;
				}
				if (input === "2") {
					setPriorityChange("p2");
					return;
				}
			}

			// Text input for custom feedback (when in feedback section)
			if (focusedSection === "feedback") {
				if (key.backspace || key.delete) {
					setCustomFeedback((prev) => prev.slice(0, -1));
					setValidationError(null);
					return;
				}

				if (input && !key.ctrl && !key.meta) {
					setCustomFeedback((prev) => prev + input);
					setValidationError(null);
				}
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
			borderColor="yellow"
			paddingX={2}
			paddingY={1}
		>
			{/* Header */}
			<Box marginBottom={1} gap={1}>
				<Text bold color="yellow">
					REDO FEEDBACK
				</Text>
				<Text dimColor>│</Text>
				<Text>{taskId}</Text>
				<Text dimColor>│</Text>
				<Text dimColor>Iteration {iterationCount}</Text>
			</Box>

			{/* Quick Issues */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color={focusedSection === "issues" ? "cyan" : undefined}>
					Quick Issues (1-5 to toggle)
				</Text>
				<Box flexDirection="column" marginLeft={1}>
					{QUICK_ISSUES.map((issue, idx) => (
						<Box key={issue.id} gap={1}>
							<Text color="cyan">[{idx + 1}]</Text>
							<Text color={selectedIssues.has(issue.id) ? "green" : "gray"}>
								{selectedIssues.has(issue.id) ? "☑" : "☐"}
							</Text>
							<Text>{issue.label}</Text>
						</Box>
					))}
				</Box>
			</Box>

			{/* Custom Feedback */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color={focusedSection === "feedback" ? "cyan" : undefined}>
					Custom Feedback (Tab to focus)
				</Text>
				<Box
					marginLeft={1}
					borderStyle={focusedSection === "feedback" ? "single" : undefined}
					borderColor="gray"
					paddingX={1}
				>
					<Text color={customFeedback ? "white" : "gray"}>
						{customFeedback || "Type additional feedback..."}
						{focusedSection === "feedback" && <Text color="cyan">│</Text>}
					</Text>
				</Box>
			</Box>

			{/* Redo Strategy */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color={focusedSection === "redo" ? "cyan" : undefined}>
					Redo Strategy
				</Text>
				<Box marginLeft={1} gap={2}>
					{REDO_OPTIONS.map((opt) => (
						<Box key={opt.id} gap={1}>
							<Text color={redoStrategy === opt.id ? "green" : "gray"}>
								{redoStrategy === opt.id ? "●" : "○"}
							</Text>
							<Text>
								[{opt.id === "keep" ? "K" : opt.id === "fresh" ? "F" : "C"}]{" "}
								{opt.label}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			{/* Priority Change */}
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color={focusedSection === "priority" ? "cyan" : undefined}>
					Priority Change
				</Text>
				<Box marginLeft={1} gap={2}>
					{PRIORITY_OPTIONS.map((opt) => (
						<Box key={opt.id} gap={1}>
							<Text color={priorityChange === opt.id ? "green" : "gray"}>
								{priorityChange === opt.id ? "●" : "○"}
							</Text>
							<Text>
								[{opt.id === "same" ? "S" : opt.id === "p0" ? "0" : "2"}]{" "}
								{opt.label}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			{/* Validation Error */}
			{validationError && (
				<Box marginBottom={1}>
					<Text color="red">⚠ {validationError}</Text>
				</Box>
			)}

			{/* Keyboard Hints */}
			<Box borderTop borderColor="gray" paddingTop={1} gap={1} flexWrap="wrap">
				<Text dimColor>
					[<Text color="cyan">Tab</Text>] Navigate
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="green">Enter</Text>] Submit
				</Text>
				<Text dimColor>│</Text>
				<Text dimColor>
					[<Text color="red">Esc</Text>] Cancel
				</Text>
			</Box>
		</Box>
	);
}
