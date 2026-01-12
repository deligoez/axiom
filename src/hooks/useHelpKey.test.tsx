import { Box, Text } from "ink";
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
import { useHelpKey } from "./useHelpKey.js";

// Test component that uses the hook
function TestComponent({
	visible,
	onToggle,
	onClose,
	isDisabled,
}: {
	visible: boolean;
	onToggle: () => void;
	onClose?: () => void;
	isDisabled?: boolean;
}) {
	useHelpKey({
		visible,
		onToggle,
		onClose,
		isDisabled,
	});

	return (
		<Box flexDirection="column">
			<Text>Help visible: {visible ? "yes" : "no"}</Text>
		</Box>
	);
}

describe("useHelpKey", () => {
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

	describe("Toggle Behavior", () => {
		it("calls onToggle when ? key is pressed while help hidden", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent visible={false} onToggle={onToggle} />,
			);

			// Act
			stdin.write("?");

			// Assert
			expect(onToggle).toHaveBeenCalledTimes(1);
		});

		it("calls onToggle when ? key is pressed while help visible", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent visible={true} onToggle={onToggle} />,
			);

			// Act
			stdin.write("?");

			// Assert
			expect(onToggle).toHaveBeenCalledTimes(1);
		});

		it("calls onClose when ESC key is pressed while help visible", () => {
			// Arrange
			const onToggle = vi.fn();
			const onClose = vi.fn();
			const { stdin } = render(
				<TestComponent visible={true} onToggle={onToggle} onClose={onClose} />,
			);

			// Act
			stdin.write("\x1B"); // Escape key

			// Assert
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(onToggle).not.toHaveBeenCalled();
		});
	});

	describe("Modal Exclusivity", () => {
		it("does not call onToggle when isDisabled is true", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent visible={false} onToggle={onToggle} isDisabled={true} />,
			);

			// Act
			stdin.write("?");

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});

		it("ignores ESC when help is not visible", () => {
			// Arrange
			const onToggle = vi.fn();
			const onClose = vi.fn();
			const { stdin } = render(
				<TestComponent visible={false} onToggle={onToggle} onClose={onClose} />,
			);

			// Act
			stdin.write("\x1B"); // Escape key

			// Assert
			expect(onClose).not.toHaveBeenCalled();
			expect(onToggle).not.toHaveBeenCalled();
		});
	});

	describe("Visual", () => {
		it("renders test component correctly when help is hidden", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TestComponent visible={false} onToggle={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("Help visible: no");
		});

		it("renders test component correctly when help is visible", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TestComponent visible={true} onToggle={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("Help visible: yes");
		});
	});
});
