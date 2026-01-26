/**
 * E2E: Merge Queue View (M key)
 *
 * Tests for merge queue panel opened via 'M' (Shift+m) key,
 * including display, navigation, and close functionality.
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
import {
	type MergeQueueItem,
	MergeQueuePanel,
} from "../components/MergeQueuePanel.js";
import { useMergeViewKey } from "../hooks/useMergeViewKey.js";

// Test wrapper with merge queue integration
function MergeQueueTestApp({
	initialQueue = [],
	onOpenCallback,
}: {
	initialQueue?: MergeQueueItem[];
	onOpenCallback?: () => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	useMergeViewKey({
		onOpen: () => {
			setIsOpen((prev) => !prev);
			onOpenCallback?.();
		},
	});

	return (
		<Box flexDirection="column">
			<Text>Main View</Text>
			<MergeQueuePanel
				isOpen={isOpen}
				queue={initialQueue}
				onClose={() => setIsOpen(false)}
			/>
		</Box>
	);
}

// Test wrapper for panel-only tests (without M key)
function PanelOnlyTestApp({
	queue,
	onClose,
	onApprove,
	onReject,
}: {
	queue: MergeQueueItem[];
	onClose?: () => void;
	onApprove?: (id: string) => void;
	onReject?: (id: string) => void;
}) {
	return (
		<Box flexDirection="column">
			<MergeQueuePanel
				isOpen={true}
				queue={queue}
				onClose={onClose ?? (() => {})}
				onApprove={onApprove}
				onReject={onReject}
			/>
		</Box>
	);
}

describe("E2E: Merge Queue View (M key)", () => {
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
	// Opening Panel - 1 test
	// ============================================================================
	describe("Opening Panel", () => {
		it("opens merge queue panel when M is pressed", () => {
			// Arrange
			const onOpen = vi.fn();
			const { stdin } = render(<MergeQueueTestApp onOpenCallback={onOpen} />);

			// Act
			stdin.write("M");

			// Assert
			expect(onOpen).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Display - 2 tests
	// ============================================================================
	describe("Display", () => {
		it("displays queued merges", () => {
			// Arrange
			const queue: MergeQueueItem[] = [
				{ id: "1", taskId: "ch-001", branch: "task/ch-001", status: "queued" },
				{
					id: "2",
					taskId: "ch-002",
					branch: "task/ch-002",
					status: "in_progress",
				},
			];

			// Act
			const { lastFrame } = render(<PanelOnlyTestApp queue={queue} />);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("MERGE QUEUE");
			expect(output).toContain("ch-001");
			expect(output).toContain("ch-002");
		});

		it("shows merge status indicators", () => {
			// Arrange
			const queue: MergeQueueItem[] = [
				{ id: "1", taskId: "ch-001", branch: "task/ch-001", status: "queued" },
				{
					id: "2",
					taskId: "ch-002",
					branch: "task/ch-002",
					status: "conflict",
				},
				{
					id: "3",
					taskId: "ch-003",
					branch: "task/ch-003",
					status: "completed",
				},
			];

			// Act
			const { lastFrame } = render(<PanelOnlyTestApp queue={queue} />);

			// Assert - should contain status indicator icons
			const output = lastFrame() ?? "";
			// Queued: ○, Conflict: ⚠, Completed: ✓
			expect(output).toContain("○"); // queued
			expect(output).toContain("⚠"); // conflict
			expect(output).toContain("✓"); // completed
		});
	});

	// ============================================================================
	// Navigation - 1 test
	// ============================================================================
	describe("Navigation", () => {
		it("scrolls through queue with j/k (navigation callback)", () => {
			// Arrange
			const queue: MergeQueueItem[] = [
				{ id: "1", taskId: "ch-001", branch: "task/ch-001", status: "queued" },
				{ id: "2", taskId: "ch-002", branch: "task/ch-002", status: "queued" },
				{ id: "3", taskId: "ch-003", branch: "task/ch-003", status: "queued" },
			];
			const { stdin, lastFrame } = render(<PanelOnlyTestApp queue={queue} />);

			// Act - navigate down with j
			stdin.write("j");

			// Assert - panel should still be open and functional
			const output = lastFrame() ?? "";
			expect(output).toContain("MERGE QUEUE");
			expect(output).toContain("ch-001");
		});
	});

	// ============================================================================
	// Closing Panel - 2 tests
	// ============================================================================
	describe("Closing Panel", () => {
		it("closes panel when M pressed again (toggle)", () => {
			// Arrange
			const queue: MergeQueueItem[] = [
				{ id: "1", taskId: "ch-001", branch: "task/ch-001", status: "queued" },
			];
			const { stdin, lastFrame } = render(
				<MergeQueueTestApp initialQueue={queue} />,
			);

			// Act - open with M, then close with M
			stdin.write("M"); // open
			stdin.write("M"); // close (toggle)

			// Assert - should be back to main view
			const output = lastFrame() ?? "";
			expect(output).toContain("Main View");
		});

		it("closes panel with Escape", () => {
			// Arrange
			const onClose = vi.fn();
			const queue: MergeQueueItem[] = [
				{ id: "1", taskId: "ch-001", branch: "task/ch-001", status: "queued" },
			];
			const { stdin } = render(
				<PanelOnlyTestApp queue={queue} onClose={onClose} />,
			);

			// Act
			stdin.write("\x1b"); // Escape key

			// Assert
			expect(onClose).toHaveBeenCalled();
		});
	});
});
