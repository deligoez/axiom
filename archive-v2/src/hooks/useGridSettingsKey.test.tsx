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
import { useGridSettingsKey } from "./useGridSettingsKey.js";

// Test component that uses the hook
function TestComponent({ onGridSettings }: { onGridSettings?: () => void }) {
	useGridSettingsKey({
		onGridSettings,
	});

	return (
		<Box flexDirection="column">
			<Text>Grid Settings Key Test</Text>
		</Box>
	);
}

describe("useGridSettingsKey", () => {
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
		it("'g' key calls onGridSettings callback", () => {
			// Arrange
			const onGridSettings = vi.fn();
			const { stdin } = render(
				<TestComponent onGridSettings={onGridSettings} />,
			);

			// Act
			stdin.write("g");

			// Assert
			expect(onGridSettings).toHaveBeenCalled();
		});

		it("other keys do not trigger onGridSettings", () => {
			// Arrange
			const onGridSettings = vi.fn();
			const { stdin } = render(
				<TestComponent onGridSettings={onGridSettings} />,
			);

			// Act
			stdin.write("G"); // uppercase
			stdin.write("a");
			stdin.write("h");

			// Assert
			expect(onGridSettings).not.toHaveBeenCalled();
		});

		it("works without onGridSettings callback (graceful no-op)", () => {
			// Arrange - no callback provided
			const { stdin } = render(<TestComponent />);

			// Act & Assert - should not throw
			expect(() => stdin.write("g")).not.toThrow();
		});
	});
});
