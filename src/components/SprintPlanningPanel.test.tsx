import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { SprintPlanningPanel } from "./SprintPlanningPanel.js";

// Test task data
const testTasks = [
	{ id: "ch-task1", title: "First Task" },
	{ id: "ch-task2", title: "Second Task" },
	{ id: "ch-task3", title: "Third Task" },
];

describe("SprintPlanningPanel", () => {
	it("shows SPRINT PLANNING header when visible", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("SPRINT PLANNING");
	});

	it("is hidden when visible is false", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={false}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).not.toContain("SPRINT PLANNING");
	});

	it("shows sprint target options", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("tasks");
		expect(output).toContain("until done");
	});

	it("shows iteration settings", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("Max iterations");
		expect(output).toContain("Timeout");
	});

	it("shows task list with ready count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("Tasks (3)"); // ready count
		expect(output).toContain("First Task"); // task title shown
	});

	it("shows checkpoint option", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("Checkpoint");
	});

	it("shows estimated time when tasks selected", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
				avgMinutesPerTask={15}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("est");
	});

	it("shows Enter/Esc keyboard hints", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("Enter");
		expect(output).toContain("Esc");
	});

	it("shows select all/none buttons", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("All");
		expect(output).toContain("None");
	});

	it("shows selected count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintPlanningPanel
				visible={true}
				readyTasks={testTasks}
				onStart={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		// Assert
		const output = lastFrame();
		// Shows "selected" count indicator
		expect(output).toContain("selected");
	});
});
