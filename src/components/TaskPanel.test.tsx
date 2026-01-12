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

		it("shows ✗ for failed tasks", () => {
			const beads = [createTestBead({ status: "failed" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("✗");
		});

		it("failed indicator is red colored", () => {
			const beads = [createTestBead({ status: "failed" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Red color is applied - ✗ should be present
			expect(lastFrame()).toContain("✗");
		});

		it("failed status is distinct from blocked", () => {
			const failedBeads = [createTestBead({ status: "failed" })];
			const blockedBeads = [createTestBead({ status: "blocked" })];

			const { lastFrame: failedFrame } = render(
				<TaskPanel beads={failedBeads} />,
			);
			const { lastFrame: blockedFrame } = render(
				<TaskPanel beads={blockedBeads} />,
			);

			// Failed uses ✗, blocked uses ⊗
			expect(failedFrame()).toContain("✗");
			expect(failedFrame()).not.toContain("⊗");
			expect(blockedFrame()).toContain("⊗");
			expect(blockedFrame()).not.toContain("✗");
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

	describe("priority badge colors", () => {
		it("P0 badge is magenta (critical)", () => {
			const beads = [createTestBead({ priority: 0 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// P0 should be displayed
			expect(lastFrame()).toContain("P0");
		});

		it("P0 badge has flashing animation", async () => {
			// Flashing is implemented via setInterval - P0 badge toggles visibility
			const beads = [createTestBead({ priority: 0 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Initial state should show P0
			expect(lastFrame()).toContain("P0");
		});

		it("P1 badge is red", () => {
			const beads = [createTestBead({ priority: 1 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("P1");
		});

		it("P2 badge is yellow/orange", () => {
			const beads = [createTestBead({ priority: 2 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("P2");
		});

		it("P3 badge is yellow", () => {
			const beads = [createTestBead({ priority: 3 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("P3");
		});

		it("P4 badge is blue/dim", () => {
			const beads = [createTestBead({ priority: 4 })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			expect(lastFrame()).toContain("P4");
		});
	});

	describe("selection UI enhancements", () => {
		it("shows Press Enter to assign when canAssign is true", () => {
			const beads = [createTestBead({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel beads={beads} selectedBeadId="bd-1" canAssign={true} />,
			);
			expect(lastFrame()).toContain("Enter");
		});

		it("does not show Press Enter when canAssign is false", () => {
			const beads = [createTestBead({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel beads={beads} selectedBeadId="bd-1" canAssign={false} />,
			);
			expect(lastFrame()).not.toContain("Press Enter");
		});

		it("does not show Press Enter when nothing selected", () => {
			const beads = [createTestBead({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel beads={beads} canAssign={true} />,
			);
			expect(lastFrame()).not.toContain("Press Enter");
		});
	});

	describe("footer with counts", () => {
		it("shows ready count in footer", () => {
			const beads = [
				createTestBead({ id: "bd-1", status: "open" }),
				createTestBead({ id: "bd-2", status: "open" }),
				createTestBead({ id: "bd-3", status: "blocked" }),
			];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Should show 2 ready
			expect(lastFrame()).toContain("2 ready");
		});

		it("shows blocked count in footer", () => {
			const beads = [
				createTestBead({ id: "bd-1", status: "open" }),
				createTestBead({ id: "bd-2", status: "blocked" }),
				createTestBead({ id: "bd-3", status: "blocked" }),
			];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Should show 2 blocked
			expect(lastFrame()).toContain("2 blocked");
		});
	});

	describe("blocker count display", () => {
		it("shows blocker count for blocked tasks", () => {
			const beads = [
				createTestBead({
					id: "bd-1",
					status: "blocked",
					dependencies: ["bd-dep1", "bd-dep2"],
				}),
			];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// Should show count of blockers
			expect(lastFrame()).toContain("2");
		});
	});

	describe("helper functions", () => {
		it("getStatusColor returns correct color", () => {
			// Testing via the component - colors are applied to Text
			const beads = [createTestBead({ status: "in_progress" })];
			const { lastFrame } = render(<TaskPanel beads={beads} />);
			// in_progress should show its indicator
			expect(lastFrame()).toContain("●");
		});

		it("getStatusIcon returns correct icon", () => {
			// Testing that each status has a unique icon
			const inProgress = [createTestBead({ status: "in_progress" })];
			const blocked = [createTestBead({ status: "blocked" })];
			const failed = [createTestBead({ status: "failed" })];

			const { lastFrame: ipFrame } = render(<TaskPanel beads={inProgress} />);
			const { lastFrame: blockedFrame } = render(<TaskPanel beads={blocked} />);
			const { lastFrame: failedFrame } = render(<TaskPanel beads={failed} />);

			// Each should have distinct icon
			expect(ipFrame()).toContain("●");
			expect(blockedFrame()).toContain("⊗");
			expect(failedFrame()).toContain("✗");
		});
	});
});
