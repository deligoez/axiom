import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidationError } from "../services/ValidationRulesEngine.js";
import { ReviewResults } from "./ReviewResults.js";

// Mock useTerminalSize hook
vi.mock("../hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 100, height: 40 }),
}));

describe("ReviewResults", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Iteration display", () => {
		it("shows iteration number", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={[]}
					warnings={[]}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Iteration 1\/3/i);
		});
	});

	describe("Error display", () => {
		it("lists errors with task ID and error message", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "title-length", message: "Title too short", field: "title" },
			];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					taskId="task-1"
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("task-1");
			expect(lastFrame()).toContain("Title too short");
		});

		it("shows suggested fix for each error", () => {
			// Arrange
			const errors: ValidationError[] = [
				{
					rule: "description-length",
					message: "Description too long",
					field: "description",
				},
			];
			const suggestions = ["Truncate description to 500 chars"];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					suggestions={suggestions}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Truncate");
		});

		it("shows splitting suggestion for oversized tasks", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "too-many-criteria", message: "Task has too many criteria" },
			];
			const suggestions = ["-> Splitting into: Task A, Task B"];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					suggestions={suggestions}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Splitting into");
		});

		it("shows reordering suggestion for dependency issues", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "dependency-circular", message: "Circular dependency" },
			];
			const suggestions = ["-> Reordering: Move task-2 before task-1"];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					suggestions={suggestions}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Reordering");
		});

		it("shows need clarification for vague criteria", () => {
			// Arrange
			const errors: ValidationError[] = [
				{
					rule: "vague-criteria",
					message: "Acceptance criteria uses vague words",
				},
			];
			const suggestions = ["-> Need clarification: Define 'works correctly'"];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					suggestions={suggestions}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Need clarification");
		});
	});

	describe("Warning display", () => {
		it("lists warnings in separate section", () => {
			// Arrange
			const warnings: ValidationError[] = [
				{ rule: "missing-files", message: "No files specified" },
			];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={[]}
					warnings={warnings}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/warning/i);
			expect(lastFrame()).toContain("No files specified");
		});
	});

	describe("Actions display", () => {
		it("shows available actions", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "title-length", message: "Title too short" },
			];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
					showActions
				/>,
			);

			// Assert - should show action hints
			expect(lastFrame()).toMatch(/fix|split|reorder/i);
		});
	});

	describe("Summary counts", () => {
		it("shows summary counts for errors and warnings", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "a", message: "Error 1" },
				{ rule: "b", message: "Error 2" },
			];
			const warnings: ValidationError[] = [{ rule: "c", message: "Warning 1" }];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={warnings}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/2.*error/i);
			expect(lastFrame()).toMatch(/1.*warning/i);
		});
	});

	describe("Scrolling support", () => {
		it("handles many validation issues", () => {
			// Arrange
			const errors: ValidationError[] = Array(20)
				.fill(null)
				.map((_, i) => ({ rule: `rule-${i}`, message: `Error ${i}` }));

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={[]}
				/>,
			);

			// Assert - should render without error
			expect(lastFrame()).toBeDefined();
			expect(lastFrame()).toContain("20");
		});
	});

	describe("Valid state", () => {
		it("shows all tasks valid when no issues", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={[]}
					warnings={[]}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/all.*valid|no.*issues/i);
		});
	});

	describe("Visual indicators", () => {
		it("uses distinct symbols for errors and warnings", () => {
			// Arrange
			const errors: ValidationError[] = [
				{ rule: "a", message: "Error message" },
			];
			const warnings: ValidationError[] = [
				{ rule: "b", message: "Warning message" },
			];

			// Act
			const { lastFrame } = render(
				<ReviewResults
					iteration={1}
					maxIterations={3}
					errors={errors}
					warnings={warnings}
				/>,
			);

			// Assert - error symbol ✗ and warning symbol ⚠
			expect(lastFrame()).toContain("✗");
			expect(lastFrame()).toContain("⚠");
		});
	});
});
