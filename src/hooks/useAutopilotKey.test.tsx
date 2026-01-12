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
import { useAutopilotKey } from "./useAutopilotKey.js";

// Test component
function TestComponent({
	mode,
	isPaused,
	onToggle,
	onAutopilotStart,
}: {
	mode: "semi-auto" | "autopilot";
	isPaused?: boolean;
	onToggle?: (newMode: "semi-auto" | "autopilot") => void;
	onAutopilotStart?: () => void;
}) {
	useAutopilotKey({
		currentMode: mode,
		isPaused,
		onToggle,
		onAutopilotStart,
	});

	return null;
}

describe("useAutopilotKey", () => {
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

	describe("Start Autopilot", () => {
		it("'a' key in semi-auto mode calls onToggle with 'autopilot'", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" onToggle={onToggle} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onToggle).toHaveBeenCalledWith("autopilot");
		});

		it("'a' key in semi-auto mode calls onAutopilotStart", () => {
			// Arrange
			const onAutopilotStart = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" onAutopilotStart={onAutopilotStart} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onAutopilotStart).toHaveBeenCalled();
		});

		it("uppercase 'A' does not trigger autopilot", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" onToggle={onToggle} />,
			);

			// Act
			stdin.write("A");

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});
	});

	describe("Mode Validation", () => {
		it("no-op when already in autopilot mode", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent mode="autopilot" onToggle={onToggle} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});

		it("no-op when orchestration is paused", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" isPaused={true} onToggle={onToggle} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onToggle).not.toHaveBeenCalled();
		});
	});

	describe("Visual Feedback", () => {
		it("onToggle triggers mode change in orchestration", () => {
			// Arrange
			const onToggle = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" onToggle={onToggle} />,
			);

			// Act
			stdin.write("a");

			// Assert - caller can use this to update ModeIndicator
			expect(onToggle).toHaveBeenCalledWith("autopilot");
		});

		it("onAutopilotStart triggers RalphLoop to start", () => {
			// Arrange
			const onAutopilotStart = vi.fn();
			const { stdin } = render(
				<TestComponent mode="semi-auto" onAutopilotStart={onAutopilotStart} />,
			);

			// Act
			stdin.write("a");

			// Assert - caller can use this to start RalphLoop
			expect(onAutopilotStart).toHaveBeenCalled();
		});
	});
});
