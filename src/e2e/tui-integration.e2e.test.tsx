/**
 * E2E: TUI Integration - Keyboard routing and modal state machine
 *
 * Tests keyboard routing, focus management, modal state, and selection
 * using ink-testing-library for reliable component-level E2E testing.
 */

import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { useState } from "react";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import HelpPanel from "../components/HelpPanel.js";
import { TwoColumnLayout } from "../components/TwoColumnLayout.js";
import { useHelpKey } from "../hooks/useHelpKey.js";
import { useKeyboard } from "../hooks/useKeyboard.js";
import { useNavigationKeys } from "../hooks/useNavigationKeys.js";

// Test wrapper component for TUI testing
function TUITestApp({
	tasks = ["Task 1", "Task 2", "Task 3"],
	onTaskSelect,
	onFocusChange,
	onHelpToggle,
	onQuit,
}: {
	tasks?: string[];
	onTaskSelect?: (index: number) => void;
	onFocusChange?: (focus: "left" | "right") => void;
	onHelpToggle?: () => void;
	onQuit?: () => void;
}) {
	// Navigation state with React useState
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Navigation keys hook (j/k)
	useNavigationKeys({
		itemCount: tasks.length,
		selectedIndex,
		onSelect: (index) => {
			setSelectedIndex(index);
			onTaskSelect?.(index);
		},
	});

	// Help toggle
	useHelpKey({
		visible: false,
		onToggle: onHelpToggle ?? (() => {}),
	});

	// Quick select keys (1-9) and quit
	useKeyboard({
		onQuickSelect: (index) => {
			if (index < tasks.length) {
				setSelectedIndex(index);
				onTaskSelect?.(index);
			}
		},
		onQuit: onQuit ?? (() => {}),
	});

	return (
		<Box flexDirection="column">
			<Text>TUI Test App</Text>
			<TwoColumnLayout
				left={
					<Box flexDirection="column">
						<Text bold>Tasks</Text>
						{tasks.map((task, idx) => (
							<Text key={task} inverse={idx === selectedIndex}>
								{idx === selectedIndex ? ">" : " "} {task}
							</Text>
						))}
					</Box>
				}
				right={
					<Box flexDirection="column">
						<Text bold>Agents</Text>
						<Text>[empty slot]</Text>
					</Box>
				}
				onToggleFocus={onFocusChange}
			/>
		</Box>
	);
}

describe("E2E: TUI Integration", () => {
	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: undefined,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// Tab Focus Routing - 2 tests
	// ============================================================================
	describe("Tab Focus Routing", () => {
		it("Tab switches focus to right panel", () => {
			// Arrange
			const onFocusChange = vi.fn();
			const { stdin } = render(<TUITestApp onFocusChange={onFocusChange} />);

			// Act
			stdin.write("\t");

			// Assert
			expect(onFocusChange).toHaveBeenCalledWith("right");
		});

		it("Tab triggers focus callback multiple times", () => {
			// Arrange
			const onFocusChange = vi.fn();
			const { stdin } = render(<TUITestApp onFocusChange={onFocusChange} />);

			// Act
			stdin.write("\t");
			stdin.write("\t");

			// Assert - callback should be called twice
			expect(onFocusChange).toHaveBeenCalledTimes(2);
		});
	});

	// ============================================================================
	// Navigation Keys j/k - 2 tests
	// ============================================================================
	describe("Navigation Keys (j/k)", () => {
		it("j key triggers select callback with next index", () => {
			// Arrange
			const onTaskSelect = vi.fn();
			const { stdin } = render(
				<TUITestApp
					tasks={["Task A", "Task B", "Task C"]}
					onTaskSelect={onTaskSelect}
				/>,
			);

			// Act
			stdin.write("j");

			// Assert - selection callback called with index 1
			expect(onTaskSelect).toHaveBeenCalledWith(1);
		});

		it("k key selects previous task", () => {
			// Arrange
			const onTaskSelect = vi.fn();
			const { stdin, lastFrame } = render(
				<TUITestApp
					tasks={["Task A", "Task B", "Task C"]}
					onTaskSelect={onTaskSelect}
				/>,
			);

			// Act - move down then up
			stdin.write("j"); // Select B
			stdin.write("k"); // Select A

			// Assert - selection moved back to first
			const output = lastFrame() ?? "";
			expect(output).toContain("> Task A");
		});
	});

	// ============================================================================
	// Quick Select 1-9 - 2 tests
	// ============================================================================
	describe("Quick Select (1-9)", () => {
		it("pressing 2 triggers select callback with index 1", () => {
			// Arrange
			const onTaskSelect = vi.fn();
			const { stdin } = render(
				<TUITestApp
					tasks={["First", "Second", "Third"]}
					onTaskSelect={onTaskSelect}
				/>,
			);

			// Act
			stdin.write("2");

			// Assert - callback called with zero-indexed value
			expect(onTaskSelect).toHaveBeenCalledWith(1);
		});

		it("pressing 9 is no-op with 3 tasks", () => {
			// Arrange
			const onTaskSelect = vi.fn();
			const { stdin, lastFrame } = render(
				<TUITestApp
					tasks={["First", "Second", "Third"]}
					onTaskSelect={onTaskSelect}
				/>,
			);

			// Act
			stdin.write("9");

			// Assert - selection unchanged (stays on first task)
			expect(onTaskSelect).not.toHaveBeenCalled();
			const output = lastFrame() ?? "";
			expect(output).toContain("> First");
		});
	});

	// ============================================================================
	// Help Modal - 2 tests
	// ============================================================================
	describe("Help Modal (?)", () => {
		it("? key triggers help toggle", () => {
			// Arrange
			const onHelpToggle = vi.fn();
			const { stdin } = render(<TUITestApp onHelpToggle={onHelpToggle} />);

			// Act
			stdin.write("?");

			// Assert
			expect(onHelpToggle).toHaveBeenCalled();
		});

		it("HelpPanel shows implemented keyboard shortcuts", () => {
			// Arrange & Act
			const { lastFrame } = render(<HelpPanel visible={true} />);

			// Assert - Check implemented categories exist (ch-6dg1 removed unimplemented)
			const output = lastFrame() ?? "";
			expect(output).toContain("NAVIGATION");
			expect(output).toContain("MODE CONTROL");
			expect(output).toContain("VIEW");
			expect(output).toContain("GENERAL");
		});
	});

	// ============================================================================
	// Quit Confirmation - 2 tests
	// ============================================================================
	describe("Quit Confirmation", () => {
		it("q key triggers quit callback", () => {
			// Arrange
			const onQuit = vi.fn();
			const { stdin } = render(<TUITestApp onQuit={onQuit} />);

			// Act
			stdin.write("q");

			// Assert
			expect(onQuit).toHaveBeenCalled();
		});

		it("Ctrl+C triggers quit callback", () => {
			// Arrange
			const onQuit = vi.fn();
			const { stdin } = render(<TUITestApp onQuit={onQuit} />);

			// Act
			stdin.write("\x03"); // Ctrl+C

			// Assert
			expect(onQuit).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Selection State - 2 tests
	// ============================================================================
	describe("Selection State", () => {
		it("navigation callback is called for each key press", () => {
			// Arrange
			const onTaskSelect = vi.fn();
			const { stdin } = render(
				<TUITestApp tasks={["A", "B", "C", "D"]} onTaskSelect={onTaskSelect} />,
			);

			// Act - navigate down twice
			stdin.write("j");
			stdin.write("j");

			// Assert - callback should be called twice
			expect(onTaskSelect).toHaveBeenCalledTimes(2);
		});

		it("selection visual indicator (>) shows on selected task", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TUITestApp tasks={["One", "Two", "Three"]} />,
			);

			// Assert - first task selected by default
			const output = lastFrame() ?? "";
			expect(output).toContain("> One");
			expect(output).toContain("  Two"); // Non-selected
			expect(output).toContain("  Three"); // Non-selected
		});
	});
});
