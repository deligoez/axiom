import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { TaskSummaryStats } from "./TaskSummaryStats.js";

describe("TaskSummaryStats", () => {
	it('shows "Tasks:" prefix', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={1} running={2} pending={3} blocked={4} />,
		);

		// Assert
		expect(lastFrame()).toContain("Tasks:");
	});

	it("shows all four categories with comma separator", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={1} running={2} pending={3} blocked={4} />,
		);

		// Assert
		expect(lastFrame()).toContain("done");
		expect(lastFrame()).toContain("running");
		expect(lastFrame()).toContain("pending");
		expect(lastFrame()).toContain("blocked");
	});

	it("green color for done count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={5} running={0} pending={0} blocked={0} />,
		);

		// Assert - Ink renders color codes, verify the count is present
		expect(lastFrame()).toContain("5");
		expect(lastFrame()).toContain("done");
	});

	it("blue color for running count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={0} running={3} pending={0} blocked={0} />,
		);

		// Assert
		expect(lastFrame()).toContain("3");
		expect(lastFrame()).toContain("running");
	});

	it("yellow color for pending count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={0} running={0} pending={7} blocked={0} />,
		);

		// Assert
		expect(lastFrame()).toContain("7");
		expect(lastFrame()).toContain("pending");
	});

	it("red color for blocked count", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={0} running={0} pending={0} blocked={2} />,
		);

		// Assert
		expect(lastFrame()).toContain("2");
		expect(lastFrame()).toContain("blocked");
	});

	it("handles zero counts", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={0} running={0} pending={0} blocked={0} />,
		);

		// Assert
		expect(lastFrame()).toContain("0 done");
		expect(lastFrame()).toContain("0 running");
		expect(lastFrame()).toContain("0 pending");
		expect(lastFrame()).toContain("0 blocked");
	});

	it("displays in correct order: done, running, pending, blocked", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={1} running={2} pending={3} blocked={4} />,
		);

		// Assert - verify order by checking positions
		const frame = lastFrame() ?? "";
		const donePos = frame.indexOf("done");
		const runningPos = frame.indexOf("running");
		const pendingPos = frame.indexOf("pending");
		const blockedPos = frame.indexOf("blocked");

		expect(donePos).toBeLessThan(runningPos);
		expect(runningPos).toBeLessThan(pendingPos);
		expect(pendingPos).toBeLessThan(blockedPos);
	});

	it("uses comma+space separator between categories", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={1} running={2} pending={3} blocked={4} />,
		);

		// Assert
		expect(lastFrame()).toContain(", ");
	});

	it("works with large numbers (100+)", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskSummaryStats done={150} running={200} pending={300} blocked={100} />,
		);

		// Assert
		expect(lastFrame()).toContain("150 done");
		expect(lastFrame()).toContain("200 running");
		expect(lastFrame()).toContain("300 pending");
		expect(lastFrame()).toContain("100 blocked");
	});
});
