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
import { type UseModeToggleOptions, useModeToggle } from "./useModeToggle.js";

// Store ref to toggle function for tests
let capturedToggle: (() => void) | null = null;

// Test component that uses the hook
function TestComponent({
	mode,
	onToggle,
	persistMode,
}: UseModeToggleOptions & { persistMode?: (mode: string) => void }) {
	const { toastMessage, isToastVisible, toggle } = useModeToggle({
		mode,
		onToggle,
		persistMode,
	});

	// Capture toggle for test use
	capturedToggle = toggle;

	return (
		<Box flexDirection="column">
			<Text>Mode: {mode}</Text>
			{isToastVisible && <Text>{toastMessage}</Text>}
		</Box>
	);
}

describe("useModeToggle", () => {
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
		capturedToggle = null;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("toggles from semi-auto to autopilot when toggle() is called", () => {
		// Arrange
		const onToggle = vi.fn();
		render(<TestComponent mode="semi-auto" onToggle={onToggle} />);

		// Act
		act(() => {
			capturedToggle?.();
		});

		// Assert
		expect(onToggle).toHaveBeenCalledWith("autopilot");
	});

	it("toggles from autopilot to semi-auto when toggle() is called", () => {
		// Arrange
		const onToggle = vi.fn();
		render(<TestComponent mode="autopilot" onToggle={onToggle} />);

		// Act
		act(() => {
			capturedToggle?.();
		});

		// Assert
		expect(onToggle).toHaveBeenCalledWith("semi-auto");
	});

	it("shows toast message when mode changes to autopilot", async () => {
		// Arrange
		const onToggle = vi.fn();
		const { lastFrame, rerender } = render(
			<TestComponent mode="semi-auto" onToggle={onToggle} />,
		);

		// Act - simulate parent updating mode prop after toggle
		await act(async () => {
			rerender(<TestComponent mode="autopilot" onToggle={onToggle} />);
		});

		// Assert
		expect(lastFrame()).toContain("Switched to autopilot mode");
	});

	it("shows toast message when mode changes to semi-auto", async () => {
		// Arrange
		const onToggle = vi.fn();
		const { lastFrame, rerender } = render(
			<TestComponent mode="autopilot" onToggle={onToggle} />,
		);

		// Act
		await act(async () => {
			rerender(<TestComponent mode="semi-auto" onToggle={onToggle} />);
		});

		// Assert
		expect(lastFrame()).toContain("Switched to semi-auto mode");
	});

	it("hides toast message after timeout", async () => {
		// Arrange
		const onToggle = vi.fn();
		const { lastFrame, rerender } = render(
			<TestComponent mode="semi-auto" onToggle={onToggle} />,
		);

		// Act - trigger mode change
		await act(async () => {
			rerender(<TestComponent mode="autopilot" onToggle={onToggle} />);
		});
		expect(lastFrame()).toContain("Switched to autopilot mode");

		// Wait for toast to disappear (2 seconds)
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});

		// Assert - toast should be hidden
		expect(lastFrame()).not.toContain("Switched to");
	});

	it("calls persistMode when mode changes", async () => {
		// Arrange
		const onToggle = vi.fn();
		const persistMode = vi.fn();
		const { rerender } = render(
			<TestComponent
				mode="semi-auto"
				onToggle={onToggle}
				persistMode={persistMode}
			/>,
		);

		// Act - trigger mode change
		await act(async () => {
			rerender(
				<TestComponent
					mode="autopilot"
					onToggle={onToggle}
					persistMode={persistMode}
				/>,
			);
		});

		// Assert
		expect(persistMode).toHaveBeenCalledWith("autopilot");
	});
});
