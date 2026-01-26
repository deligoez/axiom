import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { PendingReview } from "../machines/reviewRegion.js";
import { ReviewSummaryPanel } from "./ReviewSummaryPanel.js";

// Helper to create mock pending review
const createReview = (
	taskId: string,
	_title: string,
	qualityPassed: boolean,
): PendingReview => ({
	taskId,
	result: {
		taskId,
		agentId: "agent-1",
		iterations: 1,
		duration: 1000,
		signal: null,
		quality: [{ name: "test", passed: qualityPassed, duration: 100 }],
		changes: [],
	},
	addedAt: Date.now(),
});

describe("ReviewSummaryPanel", () => {
	describe("header", () => {
		it("shows task count in header", () => {
			// Arrange
			const reviews = [
				createReview("ch-task1", "First Task", true),
				createReview("ch-task2", "Second Task", true),
				createReview("ch-task3", "Third Task", false),
			];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={0} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("REVIEW SUMMARY");
			expect(output).toContain("3");
		});

		it("shows quality passed/failed summary", () => {
			// Arrange
			const reviews = [
				createReview("ch-task1", "First Task", true),
				createReview("ch-task2", "Second Task", true),
				createReview("ch-task3", "Third Task", false),
			];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={0} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/passed.*2|2.*passed/i);
			expect(output).toMatch(/failed.*1|1.*failed/i);
		});
	});

	describe("task list", () => {
		it("lists tasks with ID, short ID, and quality indicator", () => {
			// Arrange
			const reviews = [
				createReview("ch-task1", "First Task", true),
				createReview("ch-task2", "Second Task", false),
			];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={0} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("ch-task1"); // Full taskId
			expect(output).toContain("task"); // Short ID (first 4 chars after ch-)
			expect(output).toContain("✓"); // Quality passed
			expect(output).toContain("✗"); // Quality failed
		});

		it("shows short ID extracted from taskId", () => {
			// Arrange
			const reviews = [createReview("ch-abc123", "Task Title", true)];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={0} />,
			);

			// Assert - Short ID is first 4 chars after "ch-"
			const output = lastFrame();
			expect(output).toContain("abc1"); // Extracted short ID
			expect(output).toContain("ch-abc123"); // Full taskId
		});

		it("highlights selected task with cursor (►)", () => {
			// Arrange
			const reviews = [
				createReview("ch-task1", "First Task", true),
				createReview("ch-task2", "Second Task", true),
				createReview("ch-task3", "Third Task", true),
			];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={1} />,
			);

			// Assert - Second task should have cursor
			const output = lastFrame();
			expect(output).toContain("►");
		});
	});

	describe("keyboard hints", () => {
		it("shows keyboard hints at bottom", () => {
			// Arrange
			const reviews = [createReview("ch-task1", "First Task", true)];

			// Act
			const { lastFrame } = render(
				<ReviewSummaryPanel reviews={reviews} selectedIndex={0} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/enter|review/i);
			expect(output).toMatch(/esc|cancel/i);
		});
	});

	describe("interactions", () => {
		it("calls onReviewAll when Enter pressed", () => {
			// Arrange
			const onReviewAll = vi.fn();
			const reviews = [createReview("ch-task1", "First Task", true)];
			const { stdin } = render(
				<ReviewSummaryPanel
					reviews={reviews}
					selectedIndex={0}
					onReviewAll={onReviewAll}
				/>,
			);

			// Act
			stdin.write("\r"); // Enter key

			// Assert
			expect(onReviewAll).toHaveBeenCalled();
		});

		it("calls onJumpToTask when number key pressed", () => {
			// Arrange
			const onJumpToTask = vi.fn();
			const reviews = [
				createReview("ch-task1", "First Task", true),
				createReview("ch-task2", "Second Task", true),
				createReview("ch-task3", "Third Task", true),
			];
			const { stdin } = render(
				<ReviewSummaryPanel
					reviews={reviews}
					selectedIndex={0}
					onJumpToTask={onJumpToTask}
				/>,
			);

			// Act
			stdin.write("2"); // Press 2 to jump to second task

			// Assert
			expect(onJumpToTask).toHaveBeenCalledWith(1); // 0-indexed
		});
	});
});
