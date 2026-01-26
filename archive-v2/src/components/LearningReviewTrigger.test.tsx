import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Learning } from "../types/learning.js";
import { LearningReviewDialog } from "./LearningReviewDialog.js";
import { LearningReviewTrigger } from "./LearningReviewTrigger.js";

function createMockLearning(overrides: Partial<Learning> = {}): Learning {
	return {
		id: `learn-${Math.random().toString(36).slice(2, 8)}`,
		content: "Test learning content",
		scope: "local",
		category: "general",
		source: {
			taskId: "ch-task1",
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
		...overrides,
	};
}

describe("LearningReviewTrigger", () => {
	const mockOnRunReview = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Component Rendering", () => {
		it("renders the component", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={[]}
					unreviewedLearnings={[]}
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toBeDefined();
		});

		it("displays unreviewed learning count when learnings exist", () => {
			// Arrange
			const learnings = [
				createMockLearning({ id: "1" }),
				createMockLearning({ id: "2" }),
				createMockLearning({ id: "3" }),
			];

			// Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={learnings}
					unreviewedLearnings={learnings}
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Learnings:");
			expect(lastFrame()).toContain("3 new");
		});

		it("shows 'All reviewed' when no unreviewed learnings", () => {
			// Arrange
			const learnings = [createMockLearning()];

			// Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={learnings}
					unreviewedLearnings={[]} // All reviewed
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("All reviewed");
		});

		it("shows disabled hint for Ctrl+L when no unreviewed learnings", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={[]}
					unreviewedLearnings={[]}
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("[Ctrl+L] disabled");
		});

		it("shows enabled hint for Ctrl+L when unreviewed learnings exist", () => {
			// Arrange
			const learnings = [createMockLearning()];

			// Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={learnings}
					unreviewedLearnings={learnings}
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("[Ctrl+L]");
			expect(lastFrame()).toContain("Review");
		});
	});

	describe("Keyboard Shortcuts", () => {
		it("shows Shift+L hint for force review", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewTrigger
					learnings={[]}
					unreviewedLearnings={[]}
					onRunReview={mockOnRunReview}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("[Shift+L]");
			expect(lastFrame()).toContain("Force");
		});
	});
});

describe("LearningReviewDialog", () => {
	const mockOnRunReview = vi.fn();
	const mockOnSkipLocal = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Dialog Rendering", () => {
		it("returns null when not open", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewDialog
					isOpen={false}
					learnings={[]}
					onRunReview={mockOnRunReview}
					onSkipLocal={mockOnSkipLocal}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});

		it("renders dialog when open", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewDialog
					isOpen={true}
					learnings={[]}
					onRunReview={mockOnRunReview}
					onSkipLocal={mockOnSkipLocal}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("LEARNING REVIEW");
		});

		it("displays learnings with categories", () => {
			// Arrange
			const learnings = [
				createMockLearning({ scope: "local", content: "Local learning" }),
				createMockLearning({
					scope: "cross-cutting",
					content: "Cross-cutting learning",
				}),
				createMockLearning({
					scope: "architectural",
					content: "Architectural learning",
				}),
			];

			// Act
			const { lastFrame } = render(
				<LearningReviewDialog
					isOpen={true}
					learnings={learnings}
					onRunReview={mockOnRunReview}
					onSkipLocal={mockOnSkipLocal}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("LOCAL");
			expect(lastFrame()).toContain("CROSS-CUTTING");
			expect(lastFrame()).toContain("ARCHITECTURAL");
		});

		it("shows [R] Run Review, [S] Skip LOCAL, [C] Cancel buttons", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<LearningReviewDialog
					isOpen={true}
					learnings={[]}
					onRunReview={mockOnRunReview}
					onSkipLocal={mockOnSkipLocal}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("[R]");
			expect(lastFrame()).toContain("Run Review");
			expect(lastFrame()).toContain("[S]");
			expect(lastFrame()).toContain("Skip LOCAL");
			expect(lastFrame()).toContain("[C]");
			expect(lastFrame()).toContain("Cancel");
		});
	});
});
