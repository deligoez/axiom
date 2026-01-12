import { Box, Text, useInput } from "ink";
import type React from "react";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface PatternSuggestion {
	id: string;
	category: string;
	sourceTask: string;
	sourceAgent: string;
	content: string;
	createdAt: Date;
	expiresAt: Date;
}

export interface PatternReviewDialogProps {
	isOpen: boolean;
	suggestion: PatternSuggestion;
	onApprove: (pattern: PatternSuggestion) => void;
	onEdit: (pattern: PatternSuggestion, edited: string) => void;
	onReject: (pattern: PatternSuggestion) => void;
	onLater: (pattern: PatternSuggestion) => void;
}

/**
 * PatternReviewDialog - Dialog for reviewing pattern suggestions
 *
 * Keyboard shortcuts:
 * - a: Approve and add to PATTERNS.md
 * - e: Edit pattern content
 * - r: Reject and discard
 * - l: Defer to pending queue (Later)
 */
export function PatternReviewDialog({
	isOpen,
	suggestion,
	onApprove,
	onEdit,
	onReject,
	onLater,
}: PatternReviewDialogProps): React.ReactElement | null {
	useInput(
		(input, _key) => {
			if (!isOpen) return;

			if (input === "a" || input === "A") {
				onApprove(suggestion);
				return;
			}

			if (input === "e" || input === "E") {
				onEdit(suggestion, "");
				return;
			}

			if (input === "r" || input === "R") {
				onReject(suggestion);
				return;
			}

			if (input === "l" || input === "L") {
				onLater(suggestion);
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
			borderColor="yellow"
			paddingX={2}
			paddingY={1}
		>
			<Text bold color="yellow">
				NEW PATTERN SUGGESTION
			</Text>

			<Box marginTop={1} flexDirection="column" gap={0}>
				<Text>
					<Text dimColor>Category:</Text> {suggestion.category}
				</Text>
				<Text>
					<Text dimColor>Source:</Text> {suggestion.sourceTask} (
					{suggestion.sourceAgent})
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Suggested pattern:</Text>
				<Box marginLeft={1}>
					<Text color="cyan">&gt; {suggestion.content}</Text>
				</Box>
			</Box>

			<Box marginTop={1} gap={2}>
				<Text>
					<Text color="green" bold>
						[A]
					</Text>{" "}
					Approve
				</Text>
				<Text>
					<Text color="cyan" bold>
						[E]
					</Text>{" "}
					Edit
				</Text>
				<Text>
					<Text color="red" bold>
						[R]
					</Text>{" "}
					Reject
				</Text>
				<Text>
					<Text color="yellow" bold>
						[L]
					</Text>{" "}
					Later
				</Text>
			</Box>
		</Box>
	);
}
