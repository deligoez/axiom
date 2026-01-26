import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { useNavigationKeys } from "./useNavigationKeys.js";

// Test component that uses the hook
function TestComponent({
	itemCount,
	selectedIndex,
	onSelect,
	isActive = true,
}: {
	itemCount: number;
	selectedIndex: number;
	onSelect: (index: number) => void;
	isActive?: boolean;
}) {
	useNavigationKeys({ itemCount, selectedIndex, onSelect, isActive });
	return null;
}

describe("useNavigationKeys", () => {
	describe("down navigation (j/↓)", () => {
		it("j key increments selectedIndex by 1", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={0} onSelect={onSelect} />,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it("down arrow key increments selectedIndex by 1", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={0} onSelect={onSelect} />,
			);

			// Act
			stdin.write("\x1b[B"); // Down arrow

			// Assert
			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it("stops at last item, does not wrap", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={4} onSelect={onSelect} />,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(onSelect).toHaveBeenCalledWith(4); // Stays at 4
		});

		it("no-op when isActive=false", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent
					itemCount={5}
					selectedIndex={0}
					onSelect={onSelect}
					isActive={false}
				/>,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	describe("up navigation (k/↑)", () => {
		it("k key decrements selectedIndex by 1", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={2} onSelect={onSelect} />,
			);

			// Act
			stdin.write("k");

			// Assert
			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it("up arrow key decrements selectedIndex by 1", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={2} onSelect={onSelect} />,
			);

			// Act
			stdin.write("\x1b[A"); // Up arrow

			// Assert
			expect(onSelect).toHaveBeenCalledWith(1);
		});

		it("stops at first item, does not wrap", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={5} selectedIndex={0} onSelect={onSelect} />,
			);

			// Act
			stdin.write("k");

			// Assert
			expect(onSelect).toHaveBeenCalledWith(0); // Stays at 0
		});

		it("no-op when isActive=false", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent
					itemCount={5}
					selectedIndex={2}
					onSelect={onSelect}
					isActive={false}
				/>,
			);

			// Act
			stdin.write("k");

			// Assert
			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	describe("edge cases", () => {
		it("empty list (itemCount=0) does not call onSelect", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={0} selectedIndex={0} onSelect={onSelect} />,
			);

			// Act
			stdin.write("j");
			stdin.write("k");

			// Assert
			expect(onSelect).not.toHaveBeenCalled();
		});

		it("single item list (itemCount=1) keys are no-op", () => {
			// Arrange
			const onSelect = vi.fn();
			const { stdin } = render(
				<TestComponent itemCount={1} selectedIndex={0} onSelect={onSelect} />,
			);

			// Act
			stdin.write("j");
			stdin.write("k");

			// Assert - Can be called but value stays 0
			// With itemCount=1, both j and k would result in index 0
			const calls = onSelect.mock.calls;
			for (const call of calls) {
				expect(call[0]).toBe(0);
			}
		});
	});
});
