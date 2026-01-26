import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { NewTaskDialog } from "./NewTaskDialog.js";

describe("NewTaskDialog", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Visibility", () => {
		it("renders when isOpen=true", () => {
			// Arrange
			const onSubmit = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<NewTaskDialog isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />,
			);

			// Assert - should show dialog content
			const frame = lastFrame();
			expect(frame).toContain("New Task");
		});

		it("returns null when isOpen=false", () => {
			// Arrange
			const onSubmit = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<NewTaskDialog
					isOpen={false}
					onSubmit={onSubmit}
					onCancel={onCancel}
				/>,
			);

			// Assert - should be empty
			expect(lastFrame()).toBe("");
		});
	});

	describe("Key Handling", () => {
		it("Escape key calls onCancel", () => {
			// Arrange
			const onSubmit = vi.fn();
			const onCancel = vi.fn();
			const { stdin } = render(
				<NewTaskDialog isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />,
			);

			// Act - Escape key
			stdin.write("\u001b");

			// Assert
			expect(onCancel).toHaveBeenCalled();
		});

		it("Enter with empty title does not call onSubmit", () => {
			// Arrange
			const onSubmit = vi.fn();
			const onCancel = vi.fn();
			const { stdin } = render(
				<NewTaskDialog isOpen={true} onSubmit={onSubmit} onCancel={onCancel} />,
			);

			// Act - Enter without typing anything
			stdin.write("\r");

			// Assert
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe("Error Display", () => {
		it("displays error message when error prop is set", () => {
			// Arrange
			const onSubmit = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<NewTaskDialog
					isOpen={true}
					onSubmit={onSubmit}
					onCancel={onCancel}
					error="Failed to create task"
				/>,
			);

			// Assert
			const frame = lastFrame();
			expect(frame).toContain("Failed to create task");
		});
	});
});
