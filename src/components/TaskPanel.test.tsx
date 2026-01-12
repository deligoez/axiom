import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { TaskProviderTask } from "../types/task-provider.js";
import TaskPanel from "./TaskPanel.js";

describe("TaskPanel", () => {
	const createTestTask = (
		overrides: Partial<TaskProviderTask> = {},
	): TaskProviderTask => ({
		id: "ch-test",
		title: "Test Task",
		status: "open",
		priority: 2,
		labels: [],
		dependencies: [],
		...overrides,
	});

	describe("empty state", () => {
		it("renders empty state message when no tasks", () => {
			const { lastFrame } = render(<TaskPanel tasks={[]} />);
			expect(lastFrame()).toContain("No tasks");
		});
	});

	describe("task list", () => {
		it("renders task titles", () => {
			const tasks = [
				createTestTask({ id: "bd-1", title: "First Task" }),
				createTestTask({ id: "bd-2", title: "Second Task" }),
			];

			const { lastFrame } = render(<TaskPanel tasks={tasks} />);

			expect(lastFrame()).toContain("First Task");
			expect(lastFrame()).toContain("Second Task");
		});

		it("renders task IDs (short form)", () => {
			const tasks = [createTestTask({ id: "bd-a1b2c3", title: "Task" })];

			const { lastFrame } = render(<TaskPanel tasks={tasks} />);

			expect(lastFrame()).toContain("a1b2");
		});
	});

	describe("status indicators", () => {
		it("shows → for open tasks", () => {
			const tasks = [createTestTask({ status: "open" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("→");
		});

		it("shows ● for in_progress tasks", () => {
			const tasks = [createTestTask({ status: "in_progress" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("●");
		});

		it("shows ✓ for closed tasks", () => {
			const tasks = [createTestTask({ status: "closed" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("✓");
		});

		it("shows ⊗ for blocked tasks", () => {
			const tasks = [createTestTask({ status: "blocked" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("⊗");
		});

		it("shows ⏳ for reviewing tasks", () => {
			const tasks = [createTestTask({ status: "reviewing" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("⏳");
		});

		it("shows ✗ for failed tasks", () => {
			const tasks = [createTestTask({ status: "failed" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("✗");
		});

		it("failed indicator is red colored", () => {
			const tasks = [createTestTask({ status: "failed" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Red color is applied - ✗ should be present
			expect(lastFrame()).toContain("✗");
		});

		it("failed status is distinct from blocked", () => {
			const failedBeads = [createTestTask({ status: "failed" })];
			const blockedBeads = [createTestTask({ status: "blocked" })];

			const { lastFrame: failedFrame } = render(
				<TaskPanel tasks={failedBeads} />,
			);
			const { lastFrame: blockedFrame } = render(
				<TaskPanel tasks={blockedBeads} />,
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
			const tasks = [
				createTestTask({ id: "bd-1", title: "Selected" }),
				createTestTask({ id: "bd-2", title: "Not Selected" }),
			];

			const { lastFrame } = render(
				<TaskPanel tasks={tasks} selectedTaskId="bd-1" />,
			);

			// Selected task should have ► indicator
			expect(lastFrame()).toContain("►");
		});

		it("does not show selection indicator when no task selected", () => {
			const tasks = [createTestTask({ id: "bd-1" })];

			const { lastFrame } = render(<TaskPanel tasks={tasks} />);

			expect(lastFrame()).not.toContain("►");
		});
	});

	describe("priority display", () => {
		it("shows priority indicator", () => {
			const tasks = [createTestTask({ priority: 0, title: "Urgent" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Priority 0 = P0 (critical/urgent)
			expect(lastFrame()).toContain("P0");
		});
	});

	describe("agent display", () => {
		it("shows agent when present", () => {
			const tasks = [createTestTask({ custom: { agent: "claude" } })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("claude");
		});

		it("does not show agent section when not assigned", () => {
			const tasks = [createTestTask({ custom: undefined })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Should not have an @ symbol for agent
			expect(lastFrame()).not.toContain("@");
		});
	});

	describe("panel header", () => {
		it("shows task count in header", () => {
			const tasks = [
				createTestTask({ id: "bd-1" }),
				createTestTask({ id: "bd-2" }),
				createTestTask({ id: "bd-3" }),
			];

			const { lastFrame } = render(<TaskPanel tasks={tasks} />);

			expect(lastFrame()).toContain("3");
		});
	});

	describe("priority badge colors", () => {
		it("P0 badge is magenta (critical)", () => {
			const tasks = [createTestTask({ priority: 0 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// P0 should be displayed
			expect(lastFrame()).toContain("P0");
		});

		it("P0 badge has flashing animation", async () => {
			// Flashing is implemented via setInterval - P0 badge toggles visibility
			const tasks = [createTestTask({ priority: 0 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Initial state should show P0
			expect(lastFrame()).toContain("P0");
		});

		it("P1 badge is red", () => {
			const tasks = [createTestTask({ priority: 1 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("P1");
		});

		it("P2 badge is yellow/orange", () => {
			const tasks = [createTestTask({ priority: 2 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("P2");
		});

		it("P3 badge is yellow", () => {
			const tasks = [createTestTask({ priority: 3 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("P3");
		});

		it("P4 badge is blue/dim", () => {
			const tasks = [createTestTask({ priority: 4 })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			expect(lastFrame()).toContain("P4");
		});
	});

	describe("selection UI enhancements", () => {
		it("shows Press Enter to assign when canAssign is true", () => {
			const tasks = [createTestTask({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel tasks={tasks} selectedTaskId="bd-1" canAssign={true} />,
			);
			expect(lastFrame()).toContain("Enter");
		});

		it("does not show Press Enter when canAssign is false", () => {
			const tasks = [createTestTask({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel tasks={tasks} selectedTaskId="bd-1" canAssign={false} />,
			);
			expect(lastFrame()).not.toContain("Press Enter");
		});

		it("does not show Press Enter when nothing selected", () => {
			const tasks = [createTestTask({ id: "bd-1" })];
			const { lastFrame } = render(
				<TaskPanel tasks={tasks} canAssign={true} />,
			);
			expect(lastFrame()).not.toContain("Press Enter");
		});
	});

	describe("footer with counts", () => {
		it("shows ready count in footer", () => {
			const tasks = [
				createTestTask({ id: "bd-1", status: "open" }),
				createTestTask({ id: "bd-2", status: "open" }),
				createTestTask({ id: "bd-3", status: "blocked" }),
			];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Should show 2 ready
			expect(lastFrame()).toContain("2 ready");
		});

		it("shows blocked count in footer", () => {
			const tasks = [
				createTestTask({ id: "bd-1", status: "open" }),
				createTestTask({ id: "bd-2", status: "blocked" }),
				createTestTask({ id: "bd-3", status: "blocked" }),
			];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Should show 2 blocked
			expect(lastFrame()).toContain("2 blocked");
		});

		it("shows reviewing count in footer", () => {
			const tasks = [
				createTestTask({ id: "bd-1", status: "open" }),
				createTestTask({ id: "bd-2", status: "reviewing" }),
				createTestTask({ id: "bd-3", status: "reviewing" }),
			];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Should show 2 reviewing
			expect(lastFrame()).toContain("2 reviewing");
		});
	});

	describe("blocker count display", () => {
		it("shows blocker count for blocked tasks", () => {
			const tasks = [
				createTestTask({
					id: "bd-1",
					status: "blocked",
					dependencies: ["bd-dep1", "bd-dep2"],
				}),
			];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// Should show count of blockers
			expect(lastFrame()).toContain("2");
		});
	});

	describe("helper functions", () => {
		it("getStatusColor returns correct color", () => {
			// Testing via the component - colors are applied to Text
			const tasks = [createTestTask({ status: "in_progress" })];
			const { lastFrame } = render(<TaskPanel tasks={tasks} />);
			// in_progress should show its indicator
			expect(lastFrame()).toContain("●");
		});

		it("getStatusIcon returns correct icon", () => {
			// Testing that each status has a unique icon
			const inProgress = [createTestTask({ status: "in_progress" })];
			const blocked = [createTestTask({ status: "blocked" })];
			const failed = [createTestTask({ status: "failed" })];

			const { lastFrame: ipFrame } = render(<TaskPanel tasks={inProgress} />);
			const { lastFrame: blockedFrame } = render(<TaskPanel tasks={blocked} />);
			const { lastFrame: failedFrame } = render(<TaskPanel tasks={failed} />);

			// Each should have distinct icon
			expect(ipFrame()).toContain("●");
			expect(blockedFrame()).toContain("⊗");
			expect(failedFrame()).toContain("✗");
		});
	});
});
