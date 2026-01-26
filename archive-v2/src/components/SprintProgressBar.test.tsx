import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { SprintProgressBar } from "./SprintProgressBar.js";

describe("SprintProgressBar", () => {
	it("shows SPRINT with task counts and target info", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintProgressBar
				isActive={true}
				tasksCompleted={2}
				totalTasks={5}
				tasksFailed={0}
				target={{ type: "taskCount", count: 5 }}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("SPRINT");
		expect(output).toContain("2/5");
		expect(output).toContain("task");
	});

	it("shows failed count when tasks have failed", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintProgressBar
				isActive={true}
				tasksCompleted={3}
				totalTasks={5}
				tasksFailed={2}
				target={{ type: "taskCount", count: 5 }}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("2 failed");
	});

	it("is hidden when sprint is not active (idle)", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintProgressBar
				isActive={false}
				tasksCompleted={0}
				totalTasks={5}
				tasksFailed={0}
				target={{ type: "taskCount", count: 5 }}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).not.toContain("SPRINT");
	});

	it("shows elapsed time for running sprint", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<SprintProgressBar
				isActive={true}
				tasksCompleted={1}
				totalTasks={3}
				tasksFailed={0}
				target={{ type: "noReady" }}
				elapsedMinutes={15}
			/>,
		);

		// Assert
		const output = lastFrame();
		expect(output).toContain("15");
		expect(output).toMatch(/min|m/);
	});
});
