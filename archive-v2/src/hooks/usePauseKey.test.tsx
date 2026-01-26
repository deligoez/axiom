import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { act } from "react";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { usePauseKey } from "./usePauseKey.js";

// Test component that uses the hook
function TestComponent({
	isPaused,
	onToggle,
	isDisabled,
}: {
	isPaused: boolean;
	onToggle: () => void | Promise<void>;
	isDisabled?: boolean;
}) {
	const { toastMessage, isToastVisible } = usePauseKey({
		isPaused,
		onToggle,
		isDisabled,
	});

	return (
		<Box flexDirection="column">
			<Text>Paused: {isPaused ? "yes" : "no"}</Text>
			{isToastVisible && <Text>{toastMessage}</Text>}
		</Box>
	);
}

describe("usePauseKey", () => {
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
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Toggle Pause", () => {
		it("calls onToggle when Space is pressed while running", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent isPaused={false} onToggle={onToggle} />,
			);

			// Act
			stdin.write(" "); // Space key

			// Assert
			expect(onToggle).toHaveBeenCalledTimes(1);
		});

		it("calls onToggle when Space is pressed while paused", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent isPaused={true} onToggle={onToggle} />,
			);

			// Act
			stdin.write(" "); // Space key

			// Assert
			expect(onToggle).toHaveBeenCalledTimes(1);
		});

		it("passes isPaused state correctly to determine toggle direction", () => {
			// Arrange - Start running
			const { lastFrame } = render(
				<TestComponent isPaused={false} onToggle={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("Paused: no");
		});
	});

	describe("Visual Feedback", () => {
		it("shows toast when pausing", async () => {
			// Arrange
			const onToggle = vi.fn();
			const { lastFrame, rerender } = render(
				<TestComponent isPaused={false} onToggle={onToggle} />,
			);

			// Act - simulate state change after toggle
			await act(async () => {
				rerender(<TestComponent isPaused={true} onToggle={onToggle} />);
			});

			// Assert
			expect(lastFrame()).toContain("Orchestration paused");
		});

		it("shows toast when resuming", async () => {
			// Arrange
			const onToggle = vi.fn();
			const { lastFrame, rerender } = render(
				<TestComponent isPaused={true} onToggle={onToggle} />,
			);

			// Act - simulate state change after toggle
			await act(async () => {
				rerender(<TestComponent isPaused={false} onToggle={onToggle} />);
			});

			// Assert
			expect(lastFrame()).toContain("Orchestration resumed");
		});
	});

	describe("Behavior When Paused", () => {
		it("renders paused state correctly", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TestComponent isPaused={true} onToggle={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("Paused: yes");
		});

		it("renders running state correctly", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TestComponent isPaused={false} onToggle={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("Paused: no");
		});
	});

	describe("Disabled State", () => {
		it("does not call onToggle when isDisabled is true", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent
					isPaused={false}
					onToggle={onToggle}
					isDisabled={true}
				/>,
			);

			// Act
			stdin.write(" "); // Space key

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});

		it("ignores Space key when disabled even if paused", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent isPaused={true} onToggle={onToggle} isDisabled={true} />,
			);

			// Act
			stdin.write(" "); // Space key

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});
	});
});
