import { describe, expect, it } from "vitest";
import type { TaskFeedback } from "../types/review.js";
import { injectFeedback } from "./FeedbackInjector.js";

describe("FeedbackInjector", () => {
	const basePrompt = "Complete the implementation of the login form.";

	const createFeedback = (
		overrides: Partial<TaskFeedback> = {},
	): TaskFeedback => ({
		taskId: "ch-test1",
		history: [
			{
				type: "redo",
				message: "Please fix the validation errors",
				timestamp: "2026-01-12T10:00:00Z",
			},
		],
		...overrides,
	});

	it("prepends feedback section to prompt", () => {
		// Arrange
		const feedback = createFeedback();

		// Act
		const result = injectFeedback(basePrompt, feedback);

		// Assert
		expect(result).toContain("## Feedback from Review");
		expect(result).toContain(basePrompt);
		// Feedback should come before the original prompt
		expect(result.indexOf("Feedback")).toBeLessThan(result.indexOf(basePrompt));
	});

	it("includes quick issues as bullet points", () => {
		// Arrange
		const feedback = createFeedback({
			history: [
				{
					type: "redo",
					message: "Fix type errors",
					timestamp: "2026-01-12T10:00:00Z",
				},
				{
					type: "redo",
					message: "Add error handling",
					timestamp: "2026-01-12T10:05:00Z",
				},
			],
		});

		// Act
		const result = injectFeedback(basePrompt, feedback);

		// Assert
		expect(result).toContain("- Fix type errors");
		expect(result).toContain("- Add error handling");
	});

	it("includes custom feedback as blockquote", () => {
		// Arrange
		const feedback = createFeedback({
			history: [
				{
					type: "comment",
					message:
						"The implementation looks good but needs better error messages",
					timestamp: "2026-01-12T10:00:00Z",
				},
			],
		});

		// Act
		const result = injectFeedback(basePrompt, feedback);

		// Assert
		expect(result).toContain("> The implementation looks good");
	});

	it("includes iteration number in header", () => {
		// Arrange - 3 redo entries = iteration 4
		const feedback = createFeedback({
			history: [
				{
					type: "redo",
					message: "First fix",
					timestamp: "2026-01-12T10:00:00Z",
				},
				{
					type: "redo",
					message: "Second fix",
					timestamp: "2026-01-12T10:05:00Z",
				},
				{
					type: "redo",
					message: "Third fix",
					timestamp: "2026-01-12T10:10:00Z",
				},
			],
		});

		// Act
		const result = injectFeedback(basePrompt, feedback);

		// Assert
		expect(result).toMatch(/Iteration\s*[:#]?\s*\d+/i);
	});

	it("returns original prompt when feedback history is empty", () => {
		// Arrange
		const feedback = createFeedback({ history: [] });

		// Act
		const result = injectFeedback(basePrompt, feedback);

		// Assert
		expect(result).toBe(basePrompt);
	});

	it("returns original prompt when feedback is null", () => {
		// Arrange & Act
		const result = injectFeedback(basePrompt, null);

		// Assert
		expect(result).toBe(basePrompt);
	});
});
