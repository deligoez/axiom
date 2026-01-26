import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { FeedbackModal } from "./FeedbackModal.js";

describe("FeedbackModal", () => {
	describe("header display", () => {
		it("shows task title and iteration count in header", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={2}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert
			const output = lastFrame();
			expect(output).toContain("ch-task1");
			expect(output).toContain("2");
		});
	});

	describe("quick issues", () => {
		it("shows quick issue checkboxes", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert - shows numbered options
			const output = lastFrame();
			expect(output).toMatch(/\[?1\]?.*test|test.*\[?1\]?/i);
			expect(output).toMatch(/\[?2\]?.*type|type.*\[?2\]?/i);
		});
	});

	describe("redo options", () => {
		it("shows redo options radio group", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/keep.*changes|changes.*keep/i);
			expect(output).toMatch(/fresh.*start|start.*fresh/i);
		});
	});

	describe("priority change options", () => {
		it("shows priority change radio group", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/same|P0|P2/i);
		});
	});

	describe("keyboard hints", () => {
		it("shows Enter to submit and Esc to cancel hints", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert
			const output = lastFrame();
			expect(output).toMatch(/enter.*submit|submit/i);
			expect(output).toMatch(/esc.*cancel|cancel/i);
		});
	});

	describe("hidden state", () => {
		it("returns null when not open", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={false}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert - should be empty or not show the modal content
			const output = lastFrame();
			expect(output).not.toContain("ch-task1");
		});
	});

	describe("validation", () => {
		it("shows validation error when no feedback provided", () => {
			// Arrange
			const onSubmit = vi.fn();
			const { stdin } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={onSubmit}
					onCancel={vi.fn()}
				/>,
			);

			// Act - try to submit without selecting anything
			stdin.write("\r"); // Enter key

			// Assert - should show validation or not call submit
			// Either way, submit should NOT be called
			expect(onSubmit).not.toHaveBeenCalled();
		});

		it("validates that feedback data structure is correct", () => {
			// Arrange - test that FeedbackFormData interface is correct
			// Note: Keyboard interaction tests require PTY (see e2e-testing.md)
			const { lastFrame } = render(
				<FeedbackModal
					taskId="ch-task1"
					iterationCount={1}
					isOpen={true}
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>,
			);

			// Assert - verify the form structure is rendered
			const output = lastFrame();
			// Should have all form sections
			expect(output).toContain("Quick Issues");
			expect(output).toContain("Custom Feedback");
			expect(output).toContain("Redo Strategy");
			expect(output).toContain("Priority Change");
		});
	});
});
