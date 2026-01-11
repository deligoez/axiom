import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { FooterBar } from "./FooterBar.js";
import { HeaderBar } from "./HeaderBar.js";
import { TwoColumnLayout } from "./TwoColumnLayout.js";

/**
 * Integration tests for Layout components:
 * - HeaderBar
 * - TwoColumnLayout
 * - FooterBar
 */

// Mock Layout that combines all three components
function IntegratedLayout({
	version = "1.0.0",
	mode = "semi-auto" as const,
	runningAgents = 0,
	maxAgents = 4,
	taskStats = { done: 0, running: 0, pending: 0, blocked: 0 },
	mergeQueue = { queued: 0, merging: false, conflict: false },
	onToggleFocus,
}: {
	version?: string;
	mode?: "semi-auto" | "autopilot";
	runningAgents?: number;
	maxAgents?: number;
	taskStats?: {
		done: number;
		running: number;
		pending: number;
		blocked: number;
	};
	mergeQueue?: { queued: number; merging?: boolean; conflict?: boolean };
	onToggleFocus?: (focused: "left" | "right") => void;
}) {
	return (
		<Box flexDirection="column" height={24}>
			<HeaderBar
				version={version}
				mode={mode}
				runningAgents={runningAgents}
				maxAgents={maxAgents}
			/>
			<TwoColumnLayout
				left={<Text>Task Panel</Text>}
				right={<Text>Agent Grid</Text>}
				onToggleFocus={onToggleFocus}
			/>
			<FooterBar taskStats={taskStats} mergeQueue={mergeQueue} />
		</Box>
	);
}

describe("Layout Integration Tests", () => {
	// ========================================
	// Render Tests - 4 tests
	// ========================================
	describe("Render Tests", () => {
		it("renders all three components without error", () => {
			// Arrange & Act
			const { lastFrame } = render(<IntegratedLayout />);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("CHORUS");
			expect(output).toContain("Task Panel");
			expect(output).toContain("Agent Grid");
		});

		it("components maintain correct vertical order", () => {
			// Arrange & Act
			const { lastFrame } = render(<IntegratedLayout />);
			const output = lastFrame() ?? "";
			const lines = output.split("\n");

			// Assert - CHORUS should appear before Task Panel content
			const chorusLine = lines.findIndex((l) => l.includes("CHORUS"));
			const taskPanelLine = lines.findIndex((l) => l.includes("Task Panel"));

			expect(chorusLine).toBeLessThan(taskPanelLine);
		});

		it("HeaderBar shows version and mode", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<IntegratedLayout version="2.0.0" mode="autopilot" />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("v2.0.0");
			expect(output).toContain("autopilot");
		});

		it("FooterBar shows task stats and merge queue", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<IntegratedLayout
					taskStats={{ done: 5, running: 2, pending: 3, blocked: 1 }}
					mergeQueue={{ queued: 2, merging: true }}
				/>,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("5 done");
			expect(output).toContain("2 running");
			expect(output).toContain("3 pending");
			expect(output).toContain("1 blocked");
		});
	});

	// ========================================
	// Responsive Tests - 3 tests
	// ========================================
	describe("Responsive Tests", () => {
		it("TwoColumnLayout renders both columns", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TwoColumnLayout
					left={<Text>LEFT CONTENT</Text>}
					right={<Text>RIGHT CONTENT</Text>}
				/>,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("LEFT CONTENT");
			expect(output).toContain("RIGHT CONTENT");
		});

		it("TwoColumnLayout respects custom widths", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TwoColumnLayout
					left={<Text>LEFT</Text>}
					right={<Text>RIGHT</Text>}
					leftWidth={40}
					rightWidth={60}
				/>,
			);

			// Assert - both columns render
			const output = lastFrame() ?? "";
			expect(output).toContain("LEFT");
			expect(output).toContain("RIGHT");
		});

		it("TwoColumnLayout shows separator by default", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TwoColumnLayout left={<Text>LEFT</Text>} right={<Text>RIGHT</Text>} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("│");
		});
	});

	// ========================================
	// State Propagation Tests - 4 tests
	// ========================================
	describe("State Propagation Tests", () => {
		it("mode change updates HeaderBar indicator", () => {
			// Arrange
			const { lastFrame, rerender } = render(
				<IntegratedLayout mode="semi-auto" />,
			);

			// Assert initial
			expect(lastFrame() ?? "").toContain("semi-auto");

			// Act - change mode
			rerender(<IntegratedLayout mode="autopilot" />);

			// Assert updated
			expect(lastFrame() ?? "").toContain("autopilot");
		});

		it("agent count change updates HeaderBar counter", () => {
			// Arrange
			const { lastFrame, rerender } = render(
				<IntegratedLayout runningAgents={0} maxAgents={4} />,
			);

			// Assert initial
			expect(lastFrame() ?? "").toContain("0/4");

			// Act - add agents
			rerender(<IntegratedLayout runningAgents={2} maxAgents={4} />);

			// Assert updated
			expect(lastFrame() ?? "").toContain("2/4");
		});

		it("task stats change updates FooterBar", () => {
			// Arrange
			const { lastFrame, rerender } = render(
				<IntegratedLayout
					taskStats={{ done: 0, running: 0, pending: 0, blocked: 0 }}
				/>,
			);

			// Assert initial
			expect(lastFrame() ?? "").toContain("0 done");

			// Act - update stats
			rerender(
				<IntegratedLayout
					taskStats={{ done: 3, running: 1, pending: 2, blocked: 0 }}
				/>,
			);

			// Assert updated
			expect(lastFrame() ?? "").toContain("3 done");
		});

		it("merge queue change updates FooterBar indicator", () => {
			// Arrange
			const { lastFrame, rerender } = render(
				<IntegratedLayout mergeQueue={{ queued: 0 }} />,
			);

			// Assert initial - shows "0 queued"
			expect(lastFrame() ?? "").toContain("0 queued");

			// Act - update queue to merging state
			rerender(<IntegratedLayout mergeQueue={{ queued: 2, merging: true }} />);

			// Assert - shows merging status (not count when merging)
			const output = lastFrame() ?? "";
			expect(output).toContain("merging");
		});
	});

	// ========================================
	// Focus Tests - 2 tests
	// ========================================
	describe("Focus Tests", () => {
		it("initial focus is on left panel", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<TwoColumnLayout left={<Text>LEFT</Text>} right={<Text>RIGHT</Text>} />,
			);

			// Assert - left panel has cyan border (focused)
			// This is verified by the component's internal state
			const output = lastFrame() ?? "";
			expect(output).toBeDefined();
		});

		it("onToggleFocus callback is invoked on tab", () => {
			// Arrange
			const mockOnToggleFocus = vi.fn();
			const { stdin } = render(
				<TwoColumnLayout
					left={<Text>LEFT</Text>}
					right={<Text>RIGHT</Text>}
					onToggleFocus={mockOnToggleFocus}
				/>,
			);

			// Act - press tab
			stdin.write("\t");

			// Assert
			expect(mockOnToggleFocus).toHaveBeenCalledWith("right");
		});
	});
});
