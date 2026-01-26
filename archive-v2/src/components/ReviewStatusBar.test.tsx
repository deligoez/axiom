import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { ReviewStatusBar } from "./ReviewStatusBar.js";

describe("ReviewStatusBar", () => {
	describe("pending reviews display", () => {
		it("shows pending count and press R message when N > 0", () => {
			// Arrange & Act
			const { lastFrame } = render(<ReviewStatusBar pendingCount={3} />);

			// Assert
			const output = lastFrame();
			expect(output).toContain("REVIEW PENDING");
			expect(output).toContain("3");
			expect(output).toContain("[R]");
		});

		it("is hidden when no pending reviews (N = 0)", () => {
			// Arrange & Act
			const { lastFrame } = render(<ReviewStatusBar pendingCount={0} />);

			// Assert
			const output = lastFrame();
			expect(output).not.toContain("REVIEW PENDING");
		});

		it("updates count reactively when reviews added", () => {
			// Arrange
			const { lastFrame, rerender } = render(
				<ReviewStatusBar pendingCount={2} />,
			);
			expect(lastFrame()).toContain("2");

			// Act - rerender with new count
			rerender(<ReviewStatusBar pendingCount={5} />);

			// Assert
			expect(lastFrame()).toContain("5");
		});
	});

	describe("attention indicators", () => {
		it("shows flash indicator for per-task mode", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ReviewStatusBar pendingCount={1} hasPerTaskReviews={true} />,
			);

			// Assert - should have some attention indicator (bold, color, or special char)
			const output = lastFrame();
			expect(output).toContain("REVIEW PENDING");
			// Per-task reviews should have visual indicator like ! or different color
			expect(output).toMatch(/!|⚠|●/);
		});
	});

	describe("auto-approve notifications", () => {
		it("shows auto-approve notification with task details", () => {
			// Arrange & Act
			const notification = {
				taskId: "ch-test1",
				title: "Test Task",
				reason: "Quality passed",
			};
			const { lastFrame } = render(
				<ReviewStatusBar
					pendingCount={0}
					autoApproveNotification={notification}
				/>,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("ch-test1");
			expect(output).toContain("auto");
		});

		it("auto-approve notification can be dismissed", () => {
			// Arrange
			const onDismiss = vi.fn();
			const notification = {
				taskId: "ch-test1",
				title: "Test Task",
				reason: "Quality passed",
			};

			// Act
			const { lastFrame, rerender } = render(
				<ReviewStatusBar
					pendingCount={0}
					autoApproveNotification={notification}
					onDismissNotification={onDismiss}
				/>,
			);
			expect(lastFrame()).toContain("ch-test1");

			// Simulate dismiss by removing notification
			rerender(<ReviewStatusBar pendingCount={0} />);

			// Assert - notification no longer visible
			expect(lastFrame()).not.toContain("ch-test1");
		});
	});
});
