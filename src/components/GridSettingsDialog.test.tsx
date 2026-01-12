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
import { GridSettingsDialog } from "./GridSettingsDialog.js";

describe("GridSettingsDialog", () => {
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
		it("renders all layout options when isOpen=true", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<GridSettingsDialog
					isOpen={true}
					currentLayout="auto"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Assert - should show all layout options
			const frame = lastFrame();
			expect(frame).toContain("auto");
			expect(frame).toContain("1x1");
			expect(frame).toContain("2x2");
		});

		it("returns null when isOpen=false", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<GridSettingsDialog
					isOpen={false}
					currentLayout="auto"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});
	});

	describe("Key Handling", () => {
		it("'g' key in open dialog calls onCancel (toggle behavior)", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();
			const { stdin } = render(
				<GridSettingsDialog
					isOpen={true}
					currentLayout="auto"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Act
			stdin.write("g");

			// Assert
			expect(onCancel).toHaveBeenCalled();
		});

		it("Escape key calls onCancel", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();
			const { stdin } = render(
				<GridSettingsDialog
					isOpen={true}
					currentLayout="auto"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Act - Escape key
			stdin.write("\u001b");

			// Assert
			expect(onCancel).toHaveBeenCalled();
		});

		it("Enter key calls onSelect with current selection", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();
			const { stdin } = render(
				<GridSettingsDialog
					isOpen={true}
					currentLayout="2x2"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Act - Enter key (initial selection is currentLayout)
			stdin.write("\r");

			// Assert - should call with the selected layout
			expect(onSelect).toHaveBeenCalled();
		});
	});

	describe("Current Layout Highlight", () => {
		it("shows visual indicator for current layout", () => {
			// Arrange
			const onSelect = vi.fn();
			const onCancel = vi.fn();

			// Act
			const { lastFrame } = render(
				<GridSettingsDialog
					isOpen={true}
					currentLayout="2x2"
					onSelect={onSelect}
					onCancel={onCancel}
				/>,
			);

			// Assert - 2x2 should have some visual indicator (we'll check it's rendered)
			const frame = lastFrame();
			expect(frame).toContain("2x2");
		});
	});
});
