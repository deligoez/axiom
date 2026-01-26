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
import { useInterventionKey } from "./useInterventionKey.js";

// Test component that uses the hook
function TestComponent({
	onOpen,
	isDisabled = false,
}: {
	onOpen: () => void;
	isDisabled?: boolean;
}) {
	useInterventionKey({ onOpen, isDisabled });
	return (
		<Box>
			<Text>Test</Text>
		</Box>
	);
}

describe("useInterventionKey", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		// Mock isTTY to enable input handling in tests
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		// Restore original isTTY value
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Open Panel", () => {
		it("'i' key calls onOpen callback", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act
			stdin.write("i");

			// Assert
			expect(onOpen).toHaveBeenCalled();
		});

		it("onOpen is called exactly once per keypress", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act
			stdin.write("i");

			// Assert
			expect(onOpen).toHaveBeenCalledTimes(1);
		});
	});

	describe("Close Panel", () => {
		it("ESC key is handled by InterventionPanel (not this hook)", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act - ESC key
			stdin.write("\x1B");

			// Assert - onOpen should NOT be called
			expect(onOpen).not.toHaveBeenCalled();
		});

		it("other keys do not trigger onOpen", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<TestComponent onOpen={onOpen} />);

			// Act - press various other keys
			stdin.write("a");
			stdin.write("x");
			stdin.write("?");

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	describe("Modal Exclusivity", () => {
		it("no-op when isDisabled=true", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(
				<TestComponent onOpen={onOpen} isDisabled={true} />,
			);

			// Act
			stdin.write("i");

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});

		it("works when isDisabled=false", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(
				<TestComponent onOpen={onOpen} isDisabled={false} />,
			);

			// Act
			stdin.write("i");

			// Assert
			expect(onOpen).toHaveBeenCalled();
		});
	});
});
