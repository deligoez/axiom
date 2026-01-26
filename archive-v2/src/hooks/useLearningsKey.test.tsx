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
import { useLearningsKey } from "./useLearningsKey.js";

// Test component that uses the hook
function TestComponent({
	onOpen,
	isDisabled,
}: {
	onOpen?: () => void;
	isDisabled?: boolean;
}) {
	useLearningsKey({
		onOpen,
		isDisabled,
	});

	return (
		<Box flexDirection="column">
			<Text>Learnings Key Test</Text>
		</Box>
	);
}

describe("useLearningsKey", () => {
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

	describe("Key Detection", () => {
		it("'L' (uppercase) key calls onOpen callback", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act
			stdin.write("L");

			// Assert
			expect(onOpen).toHaveBeenCalled();
		});

		it("'l' (lowercase) key does not trigger onOpen", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act
			stdin.write("l");

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});

		it("other keys do not trigger onOpen", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act
			stdin.write("a");
			stdin.write("K");
			stdin.write("m");

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	describe("Disabled State", () => {
		it("does not call onOpen when isDisabled=true", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(
				<TestComponent onOpen={onOpen} isDisabled={true} />,
			);

			// Act
			stdin.write("L");

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});

		it("calls onOpen when isDisabled=false", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(
				<TestComponent onOpen={onOpen} isDisabled={false} />,
			);

			// Act
			stdin.write("L");

			// Assert
			expect(onOpen).toHaveBeenCalled();
		});
	});

	describe("Callback Safety", () => {
		it("works without onOpen callback (graceful no-op)", () => {
			// Arrange - no callback provided
			const { stdin } = render(<TestComponent />);

			// Act & Assert - should not throw
			expect(() => stdin.write("L")).not.toThrow();
		});
	});
});
