import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { PendingReview } from "../machines/reviewRegion.js";
import type { Signal, SignalType } from "../types/signal.js";
import { TaskReviewPanel } from "./TaskReviewPanel.js";

// Helper to create mock pending review with full data
const createReview = (
	taskId: string,
	overrides: Partial<{
		agentId: string;
		iterations: number;
		duration: number;
		signal: Signal | null;
		quality: Array<{
			name: string;
			passed: boolean;
			duration: number;
			error?: string;
		}>;
		changes: Array<{
			path: string;
			type: "added" | "modified" | "deleted";
			linesAdded: number;
			linesRemoved: number;
		}>;
	}> = {},
): PendingReview => ({
	taskId,
	result: {
		taskId,
		agentId: overrides.agentId ?? "agent-1",
		iterations: overrides.iterations ?? 1,
		duration: overrides.duration ?? 60000,
		signal: overrides.signal ?? {
			type: "COMPLETE" as SignalType,
			payload: "Done",
			raw: "::signal::COMPLETE::Done::",
		},
		quality: overrides.quality ?? [
			{ name: "test", passed: true, duration: 1000 },
			{ name: "typecheck", passed: true, duration: 500 },
		],
		changes: overrides.changes ?? [
			{
				path: "src/file.ts",
				type: "modified",
				linesAdded: 10,
				linesRemoved: 5,
			},
		],
	},
	addedAt: Date.now(),
});

describe("TaskReviewPanel", () => {
	describe("header display", () => {
		it("shows position indicator [N/M] and taskId", () => {
			// Arrange
			const review = createReview("ch-task1");

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={3} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("[1/3]");
			expect(output).toContain("ch-task1");
		});
	});

	describe("task details", () => {
		it("shows agent ID and iterations count", () => {
			// Arrange
			const review = createReview("ch-task1", {
				agentId: "agent-42",
				iterations: 3,
			});

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("agent-42");
			expect(output).toContain("3");
		});

		it("shows formatted duration", () => {
			// Arrange - 90 seconds = 1m 30s
			const review = createReview("ch-task1", { duration: 90000 });

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/1m.*30s|1:30|90s/);
		});
	});

	describe("changes summary", () => {
		it("shows files added/modified/deleted with line counts", () => {
			// Arrange
			const review = createReview("ch-task1", {
				changes: [
					{
						path: "src/new.ts",
						type: "added",
						linesAdded: 20,
						linesRemoved: 0,
					},
					{
						path: "src/edit.ts",
						type: "modified",
						linesAdded: 5,
						linesRemoved: 3,
					},
					{
						path: "src/old.ts",
						type: "deleted",
						linesAdded: 0,
						linesRemoved: 15,
					},
				],
			});

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("new.ts");
			expect(output).toContain("edit.ts");
			expect(output).toContain("old.ts");
		});

		it("shows 'No changes' when no files changed", () => {
			// Arrange
			const review = createReview("ch-task1", { changes: [] });

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("No changes");
		});
	});

	describe("quality checks", () => {
		it("shows per-command breakdown with pass/fail indicators", () => {
			// Arrange
			const review = createReview("ch-task1", {
				quality: [
					{ name: "test", passed: true, duration: 1000 },
					{ name: "typecheck", passed: true, duration: 500 },
					{ name: "lint", passed: false, duration: 200, error: "Lint failed" },
				],
			});

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("test");
			expect(output).toContain("typecheck");
			expect(output).toContain("lint");
			expect(output).toContain("✓"); // Passed
			expect(output).toContain("✗"); // Failed
		});

		it("shows quality failure details", () => {
			// Arrange
			const review = createReview("ch-task1", {
				quality: [
					{
						name: "test",
						passed: false,
						duration: 1000,
						error: "3 tests failed",
					},
				],
			});

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("3 tests failed");
		});
	});

	describe("signal message", () => {
		it("shows agent signal message", () => {
			// Arrange
			const review = createReview("ch-task1", {
				signal: {
					type: "COMPLETE" as SignalType,
					payload: "Task completed successfully",
					raw: "::signal::COMPLETE::Task completed successfully::",
				},
			});

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("Task completed successfully");
		});

		it("handles null signal gracefully", () => {
			// Arrange
			const review = createReview("ch-task1", { signal: null });

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert - should render without crashing
			const output = lastFrame();
			expect(output).toContain("ch-task1");
		});
	});

	describe("keyboard hints", () => {
		it("shows keyboard hints (A/R/X/N/P/Esc)", () => {
			// Arrange
			const review = createReview("ch-task1");

			// Act
			const { lastFrame } = render(
				<TaskReviewPanel review={review} currentIndex={0} totalCount={1} />,
			);

			// Assert
			const output = lastFrame();
			// Check for key hints
			expect(output).toMatch(/[Aa].*pprove|approve/i);
			expect(output).toMatch(/[Rr].*edo|redo/i);
			expect(output).toMatch(/[Xx].*eject|[Rr]eject/i);
			expect(output).toMatch(/[Ee]sc.*cancel|cancel/i);
		});
	});
});
