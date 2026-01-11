import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { Bead } from "../types/bead.js";
import TaskPanel from "./TaskPanel.js";

describe("TaskPanel", () => {
	const createTestBead = (overrides: Partial<Bead> = {}): Bead => ({
		id: "bd-test",
		title: "Test Task",
		status: "open",
		priority: 2,
		type: "task",
		created: "2026-01-09T10:00:00Z",
		updated: "2026-01-09T10:00:00Z",
		...overrides,
	});

	describe("empty state", () => {
		it("renders empty state message when no beads", () => {
			const { lastFrame } = render(<TaskPanel beads={[]} />);
			expect(lastFrame()).toContain("No tasks");
		});
	});

	describe("task list", () => {
		it("renders task titles", () => {
			const beads = [
				createTestBead({ id: "bd-1", title: "First Task" }),
				createTestBead({ id: "bd-2", title: "Second Task" }),
			];

			const { lastFrame } = render(<TaskPanel beads={beads} />);

			expect(lastFrame()).toContain("First Task");
			expect(lastFrame()).toContain("Second Task");
		});

		it("renders task IDs (short form)", () => {
			const beads = [createTestBead({ id: "bd-a1b2c3", title: "Task" })];

			const { lastFrame } = render(<TaskPanel beads={beads} />);

			expect(lastFrame()).toContain("a1b2");
		});
	});

	describe("status indicators", () => {
		it("shows → for open tasks", () => {
			const beads = [createTestBead({ status: "open" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("→");
		});

		it("shows ● for in_progress tasks", () => {
			const beads = [createTestBead({ status: "in_progress" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("●");
		});

		it("shows ✓ for closed tasks", () => {
			const beads = [createTestBead({ status: "closed" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("✓");
		});

		it("shows ⊗ for blocked tasks", () => {
			const beads = [createTestBead({ status: "blocked" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("⊗");
		});
	});

	describe("selection", () => {
		it("highlights selected task", () => {
			const beads = [
				createTestBead({ id: "bd-1", title: "Selected" }),
				createTestBead({ id: "bd-2", title: "Not Selected" }),
			];

			const { lastFrame } = render(
				<TaskPanel beads={beads} selectedBeadId="bd-1" />,
			);

			// Selected task should have ► indicator
			expect(lastFrame()).toContain("►");
		});

		it("does not show selection indicator when no task selected", () => {
			const beads = [createTestBead({ id: "bd-1" })];

			const { lastFrame } = render(<TaskPanel beads={beads} />);

			expect(lastFrame()).not.toContain("►");
		});
	});

	describe("priority display", () => {
		it("shows priority indicator", () => {
			const beads = [createTestBead({ priority: 0, title: "Urgent" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Priority 0 = P0 (critical/urgent)
			expect(lastFrame()).toContain("P0");
		});
	});

	describe("assignee display", () => {
		it("shows assignee when present", () => {
			const beads = [createTestBead({ assignee: "claude" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("claude");
		});

		it("does not show assignee section when not assigned", () => {
			const beads = [createTestBead({ assignee: undefined })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Should not have an @ symbol for assignee
			expect(lastFrame()).not.toContain("@");
		});
	});

	describe("panel header", () => {
		it("shows task count in header", () => {
			const beads = [
				createTestBead({ id: "bd-1" }),
				createTestBead({ id: "bd-2" }),
				createTestBead({ id: "bd-3" }),
			];

			const { lastFrame } = render(<TaskPanel beads={beads} />);

			expect(lastFrame()).toContain("3");
		});
	});
});
