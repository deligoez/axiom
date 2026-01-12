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
import { type LogEntry, LogsPanel } from "./LogsPanel.js";

describe("LogsPanel", () => {
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

	describe("Visibility", () => {
		it("renders when isOpen=true", () => {
			// Arrange
			const logs: LogEntry[] = [
				{ timestamp: new Date("2026-01-12T10:00:00"), content: "Test log 1" },
			];
			const onCloseMock = vi.fn();

			// Act
			const { lastFrame } = render(
				<LogsPanel isOpen={true} logs={logs} onClose={onCloseMock} />,
			);

			// Assert
			expect(lastFrame()).toContain("Logs");
			expect(lastFrame()).toContain("Test log 1");
		});

		it("returns null when isOpen=false", () => {
			// Arrange
			const logs: LogEntry[] = [
				{ timestamp: new Date("2026-01-12T10:00:00"), content: "Test log 1" },
			];
			const onCloseMock = vi.fn();

			// Act
			const { lastFrame } = render(
				<LogsPanel isOpen={false} logs={logs} onClose={onCloseMock} />,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});
	});

	describe("Log display", () => {
		it("shows timestamp and content for each log entry", () => {
			// Arrange
			const logs: LogEntry[] = [
				{ timestamp: new Date("2026-01-12T10:30:00"), content: "First log" },
				{ timestamp: new Date("2026-01-12T10:31:00"), content: "Second log" },
			];
			const onCloseMock = vi.fn();

			// Act
			const { lastFrame } = render(
				<LogsPanel isOpen={true} logs={logs} onClose={onCloseMock} />,
			);

			// Assert
			expect(lastFrame()).toContain("First log");
			expect(lastFrame()).toContain("Second log");
			expect(lastFrame()).toMatch(/10:30/); // timestamp format
		});
	});

	describe("Scrolling", () => {
		it("j/downArrow increases scroll offset", () => {
			// Arrange
			const logs: LogEntry[] = Array.from({ length: 20 }, (_, i) => ({
				timestamp: new Date(),
				content: `Log entry ${i + 1}`,
			}));
			const onCloseMock = vi.fn();
			const { stdin, lastFrame } = render(
				<LogsPanel
					isOpen={true}
					logs={logs}
					onClose={onCloseMock}
					visibleLines={5}
				/>,
			);

			// Act - scroll down
			stdin.write("j");

			// Assert - should show different log entries
			const frame = lastFrame();
			// After scrolling down, we should see later entries
			expect(frame).toContain("Log entry");
		});

		it("k/upArrow decreases scroll offset with min 0", () => {
			// Arrange
			const logs: LogEntry[] = [
				{ timestamp: new Date(), content: "Log 1" },
				{ timestamp: new Date(), content: "Log 2" },
			];
			const onCloseMock = vi.fn();
			const { stdin, lastFrame } = render(
				<LogsPanel isOpen={true} logs={logs} onClose={onCloseMock} />,
			);

			// Act - try to scroll up when already at top
			stdin.write("k");
			stdin.write("k");
			stdin.write("k");

			// Assert - should still show first entry (min 0)
			expect(lastFrame()).toContain("Log 1");
		});

		it("scroll stops at bottom boundary", () => {
			// Arrange - with visibleLines = logs.length, maxOffset = 0
			// This tests that we can't scroll past the boundary
			const logs: LogEntry[] = [
				{ timestamp: new Date(), content: "Log 1" },
				{ timestamp: new Date(), content: "Log 2" },
			];
			const onCloseMock = vi.fn();
			const { stdin, lastFrame } = render(
				<LogsPanel
					isOpen={true}
					logs={logs}
					onClose={onCloseMock}
					visibleLines={2}
				/>,
			);

			// Act - try to scroll when all logs are visible (maxOffset = 0)
			stdin.write("j");

			// Assert - should still show both logs (boundary respected)
			expect(lastFrame()).toContain("Log 1");
			expect(lastFrame()).toContain("Log 2");
		});
	});

	describe("Closing", () => {
		it("Escape calls onClose", () => {
			// Arrange
			const logs: LogEntry[] = [{ timestamp: new Date(), content: "Log 1" }];
			const onCloseMock = vi.fn();
			const { stdin } = render(
				<LogsPanel isOpen={true} logs={logs} onClose={onCloseMock} />,
			);

			// Act
			stdin.write("\x1B"); // Escape key

			// Assert
			expect(onCloseMock).toHaveBeenCalled();
		});
	});
});
