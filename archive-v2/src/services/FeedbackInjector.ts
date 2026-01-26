import type { TaskFeedback } from "../types/review.js";

/**
 * Injects review feedback into an agent prompt for redo tasks.
 *
 * @param prompt - The original task prompt
 * @param feedback - The task feedback history (can be null)
 * @returns The prompt with feedback prepended, or original prompt if no feedback
 */
export function injectFeedback(
	prompt: string,
	feedback: TaskFeedback | null,
): string {
	// Return original prompt if no feedback or empty history
	if (!feedback || feedback.history.length === 0) {
		return prompt;
	}

	// Count redo entries to determine iteration
	const redoCount = feedback.history.filter((e) => e.type === "redo").length;
	const iteration = redoCount + 1;

	// Build feedback section
	const lines: string[] = [];
	lines.push(`## Feedback from Review (Iteration ${iteration})`);
	lines.push("");

	// Group entries by type
	const redoEntries = feedback.history.filter((e) => e.type === "redo");
	const commentEntries = feedback.history.filter((e) => e.type === "comment");

	// Add redo entries as bullet points (quick issues)
	if (redoEntries.length > 0) {
		lines.push("### Issues to Fix");
		for (const entry of redoEntries) {
			lines.push(`- ${entry.message}`);
		}
		lines.push("");
	}

	// Add comment entries as blockquotes
	if (commentEntries.length > 0) {
		lines.push("### Additional Comments");
		for (const entry of commentEntries) {
			lines.push(`> ${entry.message}`);
		}
		lines.push("");
	}

	// Combine feedback section with original prompt
	lines.push("---");
	lines.push("");
	lines.push(prompt);

	return lines.join("\n");
}
