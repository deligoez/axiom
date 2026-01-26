import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { MergeQueueItem } from "./MergeQueuePanel.js";
import { MergeQueuePanel } from "./MergeQueuePanel.js";

describe("MergeQueuePanel", () => {
	const createItem = (
		id: string,
		status: MergeQueueItem["status"],
		overrides: Partial<MergeQueueItem> = {},
	): MergeQueueItem => ({
		id,
		taskId: `ch-${id}`,
		branch: `feature/${id}`,
		status,
		...overrides,
	});

	describe("visibility", () => {
		it("returns null when isOpen=false", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={false} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});

		it("renders when isOpen=true", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("MERGE QUEUE");
		});
	});

	describe("Panel Content", () => {
		it("shows queued items with task ID and branch", () => {
			// Arrange
			const queue = [createItem("001", "queued")];

			// Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={queue} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("feature/001");
		});

		it("shows in-progress item with status indicator", () => {
			// Arrange
			const queue = [createItem("002", "in_progress")];

			// Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={queue} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-002");
			expect(output).toContain("●"); // in_progress indicator
		});

		it("shows conflict count for items with conflicts", () => {
			// Arrange
			const queue = [createItem("003", "conflict", { conflictCount: 5 })];

			// Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={queue} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("Conflicts");
			expect(output).toContain("5 conflicts");
		});

		it("shows completed/failed items (last 5)", () => {
			// Arrange
			const queue = [
				createItem("001", "completed"),
				createItem("002", "failed"),
				createItem("003", "completed"),
			];

			// Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={queue} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("Recent");
			expect(output).toContain("ch-001");
			expect(output).toContain("✓"); // completed indicator
			expect(output).toContain("✗"); // failed indicator
		});
	});

	describe("empty state", () => {
		it("shows empty message when no items", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("No items in merge queue");
		});
	});

	describe("action hints", () => {
		it("shows navigation hints", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("j/k");
			expect(output).toContain("Navigate");
		});

		it("shows approve/reject hints", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("Approve");
			expect(output).toContain("Reject");
		});

		it("shows close hint", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<MergeQueuePanel isOpen={true} queue={[]} onClose={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("ESC");
		});
	});
});
