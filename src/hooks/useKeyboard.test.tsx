import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { useKeyboard } from "./useKeyboard.js";

// Test component that uses the hook
function TestComponent({
	onQuit,
	onSpawn,
	onNavigate,
	onMarkDone,
	onQuickSelect,
}: {
	onQuit: () => void;
	onSpawn?: () => void;
	onNavigate?: (direction: "next" | "prev") => void;
	onMarkDone?: () => void;
	onQuickSelect?: (index: number) => void;
}) {
	useKeyboard({ onQuit, onSpawn, onNavigate, onMarkDone, onQuickSelect });
	return null;
}

describe("useKeyboard", () => {
	it("calls onQuit when q is pressed", () => {
		const onQuit = vi.fn();
		const { stdin } = render(<TestComponent onQuit={onQuit} />);

		stdin.write("q");

		expect(onQuit).toHaveBeenCalledTimes(1);
	});

	it("calls onQuit when ctrl+c is pressed", () => {
		const onQuit = vi.fn();
		const { stdin } = render(<TestComponent onQuit={onQuit} />);

		stdin.write("\x03"); // Ctrl+C

		expect(onQuit).toHaveBeenCalledTimes(1);
	});

	it("does not call onQuit for other keys", () => {
		const onQuit = vi.fn();
		const { stdin } = render(<TestComponent onQuit={onQuit} />);

		stdin.write("a");
		stdin.write("b");
		stdin.write("x");

		expect(onQuit).not.toHaveBeenCalled();
	});

	it("calls onSpawn when s is pressed", () => {
		const onQuit = vi.fn();
		const onSpawn = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onSpawn={onSpawn} />,
		);

		stdin.write("s");

		expect(onSpawn).toHaveBeenCalledTimes(1);
		expect(onQuit).not.toHaveBeenCalled();
	});

	it("does not error when s is pressed without onSpawn handler", () => {
		const onQuit = vi.fn();
		const { stdin } = render(<TestComponent onQuit={onQuit} />);

		expect(() => stdin.write("s")).not.toThrow();
	});

	it('calls onNavigate with "next" when j is pressed', () => {
		const onQuit = vi.fn();
		const onNavigate = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onNavigate={onNavigate} />,
		);

		stdin.write("j");

		expect(onNavigate).toHaveBeenCalledWith("next");
	});

	it('calls onNavigate with "prev" when k is pressed', () => {
		const onQuit = vi.fn();
		const onNavigate = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onNavigate={onNavigate} />,
		);

		stdin.write("k");

		expect(onNavigate).toHaveBeenCalledWith("prev");
	});

	it("calls onMarkDone when d is pressed", () => {
		const onQuit = vi.fn();
		const onMarkDone = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onMarkDone={onMarkDone} />,
		);

		stdin.write("d");

		expect(onMarkDone).toHaveBeenCalledTimes(1);
		expect(onQuit).not.toHaveBeenCalled();
	});

	it("does not error when d is pressed without onMarkDone handler", () => {
		const onQuit = vi.fn();
		const { stdin } = render(<TestComponent onQuit={onQuit} />);

		expect(() => stdin.write("d")).not.toThrow();
	});

	it("calls onQuickSelect(0) when 1 is pressed", () => {
		// Arrange
		const onQuit = vi.fn();
		const onQuickSelect = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onQuickSelect={onQuickSelect} />,
		);

		// Act
		stdin.write("1");

		// Assert
		expect(onQuickSelect).toHaveBeenCalledWith(0);
	});

	it("calls onQuickSelect(8) when 9 is pressed", () => {
		// Arrange
		const onQuit = vi.fn();
		const onQuickSelect = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onQuickSelect={onQuickSelect} />,
		);

		// Act
		stdin.write("9");

		// Assert
		expect(onQuickSelect).toHaveBeenCalledWith(8);
	});

	it("does not call onQuickSelect when 0 is pressed", () => {
		// Arrange
		const onQuit = vi.fn();
		const onQuickSelect = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onQuickSelect={onQuickSelect} />,
		);

		// Act
		stdin.write("0");

		// Assert
		expect(onQuickSelect).not.toHaveBeenCalled();
	});

	it("does not call onQuickSelect for non-numeric keys", () => {
		// Arrange
		const onQuit = vi.fn();
		const onQuickSelect = vi.fn();
		const { stdin } = render(
			<TestComponent onQuit={onQuit} onQuickSelect={onQuickSelect} />,
		);

		// Act
		stdin.write("a");

		// Assert
		expect(onQuickSelect).not.toHaveBeenCalled();
	});
});
