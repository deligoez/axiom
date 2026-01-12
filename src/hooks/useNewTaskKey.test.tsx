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
import { useNewTaskKey } from "./useNewTaskKey.js";

// Test component that uses the hook
function TestComponent({ onNewTask }: { onNewTask?: () => void }) {
	useNewTaskKey({
		onNewTask,
	});

	return (
		<Box flexDirection="column">
			<Text>New Task Hook Test</Text>
		</Box>
	);
}

describe("useNewTaskKey", () => {
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
		it("'n' key calls onNewTask callback", () => {
			// Arrange
			const onNewTask = vi.fn();
			const { stdin } = render(<TestComponent onNewTask={onNewTask} />);

			// Act
			stdin.write("n");

			// Assert
			expect(onNewTask).toHaveBeenCalled();
		});

		it("other keys do not trigger onNewTask", () => {
			// Arrange
			const onNewTask = vi.fn();
			const { stdin } = render(<TestComponent onNewTask={onNewTask} />);

			// Act
			stdin.write("a");
			stdin.write("N"); // uppercase
			stdin.write("m");

			// Assert
			expect(onNewTask).not.toHaveBeenCalled();
		});

		it("works without onNewTask callback (graceful no-op)", () => {
			// Arrange - no callback provided
			const { stdin } = render(<TestComponent />);

			// Act & Assert - should not throw
			expect(() => stdin.write("n")).not.toThrow();
		});
	});
});
