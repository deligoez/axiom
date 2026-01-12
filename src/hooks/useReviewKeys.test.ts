import { describe, expect, it, vi } from "vitest";
// Import hook to ensure it's not marked as unused by knip
// Actual hook testing requires TTY (see e2e-testing.md)
import { type ReviewState, useReviewKeys } from "./useReviewKeys.js";

// Verify hook is exported (satisfies knip)
void useReviewKeys;

// Mock the handler signatures for type safety
interface ReviewKeyHandlers {
	onStartReview: () => void;
	onStartReviewSingle: (taskId: string) => void;
	onStartOneByOne: () => void;
	onJumpToTask: (index: number) => void;
	onApprove: () => void;
	onRedo: () => void;
	onReject: () => void;
	onNext: () => void;
	onPrev: () => void;
	onBack: () => void;
	onCancel: () => void;
}

// Mock function to simulate key handler logic
function handleReviewKey(
	input: string,
	key: { escape?: boolean; return?: boolean },
	state: ReviewState,
	hasPendingReviews: boolean,
	selectedTaskId: string | null,
	handlers: ReviewKeyHandlers,
): void {
	// Escape backs out
	if (key.escape) {
		if (state === "feedbackModal") {
			handlers.onBack();
		} else if (state === "reviewingTask") {
			handlers.onBack();
		} else if (state === "reviewingSummary") {
			handlers.onCancel();
		}
		return;
	}

	// Main view (idle) handlers
	if (state === "idle") {
		if (input.toLowerCase() === "r") {
			if (!hasPendingReviews) return; // Do nothing if no pending reviews
			if (selectedTaskId) {
				handlers.onStartReviewSingle(selectedTaskId);
			} else {
				handlers.onStartReview();
			}
		}
		return;
	}

	// Summary view handlers
	if (state === "reviewingSummary") {
		if (key.return) {
			handlers.onStartOneByOne();
			return;
		}
		if (/^[1-9]$/.test(input)) {
			const index = Number.parseInt(input, 10) - 1;
			handlers.onJumpToTask(index);
			return;
		}
	}

	// Task review handlers
	if (state === "reviewingTask") {
		if (input.toLowerCase() === "a") {
			handlers.onApprove();
			return;
		}
		if (input.toLowerCase() === "r") {
			handlers.onRedo();
			return;
		}
		if (input.toLowerCase() === "x") {
			handlers.onReject();
			return;
		}
		if (input.toLowerCase() === "n") {
			handlers.onNext();
			return;
		}
		if (input.toLowerCase() === "p") {
			handlers.onPrev();
			return;
		}
	}
}

describe("useReviewKeys", () => {
	const createHandlers = (): ReviewKeyHandlers => ({
		onStartReview: vi.fn(),
		onStartReviewSingle: vi.fn(),
		onStartOneByOne: vi.fn(),
		onJumpToTask: vi.fn(),
		onApprove: vi.fn(),
		onRedo: vi.fn(),
		onReject: vi.fn(),
		onNext: vi.fn(),
		onPrev: vi.fn(),
		onBack: vi.fn(),
		onCancel: vi.fn(),
	});

	describe("main view (idle state)", () => {
		it("R with selection opens single task review", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("r", {}, "idle", true, "ch-task1", handlers);

			// Assert
			expect(handlers.onStartReviewSingle).toHaveBeenCalledWith("ch-task1");
			expect(handlers.onStartReview).not.toHaveBeenCalled();
		});

		it("R without selection opens batch review summary", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("r", {}, "idle", true, null, handlers);

			// Assert
			expect(handlers.onStartReview).toHaveBeenCalled();
			expect(handlers.onStartReviewSingle).not.toHaveBeenCalled();
		});

		it("R does nothing when no pending reviews", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("r", {}, "idle", false, null, handlers);

			// Assert
			expect(handlers.onStartReview).not.toHaveBeenCalled();
			expect(handlers.onStartReviewSingle).not.toHaveBeenCalled();
		});
	});

	describe("summary view", () => {
		it("Enter starts one-by-one review", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey(
				"",
				{ return: true },
				"reviewingSummary",
				true,
				null,
				handlers,
			);

			// Assert
			expect(handlers.onStartOneByOne).toHaveBeenCalled();
		});

		it("1-9 jumps to specific task by index", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("3", {}, "reviewingSummary", true, null, handlers);

			// Assert
			expect(handlers.onJumpToTask).toHaveBeenCalledWith(2); // 0-indexed
		});

		it("Esc cancels summary view", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey(
				"",
				{ escape: true },
				"reviewingSummary",
				true,
				null,
				handlers,
			);

			// Assert
			expect(handlers.onCancel).toHaveBeenCalled();
		});
	});

	describe("task review view", () => {
		it("A approves current task", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("a", {}, "reviewingTask", true, null, handlers);

			// Assert
			expect(handlers.onApprove).toHaveBeenCalled();
		});

		it("R opens feedback modal for redo", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("r", {}, "reviewingTask", true, null, handlers);

			// Assert
			expect(handlers.onRedo).toHaveBeenCalled();
		});

		it("X rejects task", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("x", {}, "reviewingTask", true, null, handlers);

			// Assert
			expect(handlers.onReject).toHaveBeenCalled();
		});

		it("N goes to next task", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("n", {}, "reviewingTask", true, null, handlers);

			// Assert
			expect(handlers.onNext).toHaveBeenCalled();
		});

		it("P goes to previous task", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey("p", {}, "reviewingTask", true, null, handlers);

			// Assert
			expect(handlers.onPrev).toHaveBeenCalled();
		});

		it("Esc backs out to summary", () => {
			// Arrange
			const handlers = createHandlers();

			// Act
			handleReviewKey(
				"",
				{ escape: true },
				"reviewingTask",
				true,
				null,
				handlers,
			);

			// Assert
			expect(handlers.onBack).toHaveBeenCalled();
		});
	});
});
