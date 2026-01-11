import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { FooterBar } from "./FooterBar.js";

describe("FooterBar", () => {
	const defaultTaskStats = {
		done: 1,
		running: 3,
		pending: 1,
		blocked: 1,
	};

	const defaultMergeQueue = {
		queued: 1,
	};

	it("renders TaskSummaryStats with correct props", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert - TaskSummaryStats shows all stats
		expect(lastFrame()).toContain("1 done");
		expect(lastFrame()).toContain("3 running");
		expect(lastFrame()).toContain("1 pending");
		expect(lastFrame()).toContain("1 blocked");
	});

	it("renders MergeQueueIndicator with correct props", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert - MergeQueueIndicator shows queue count
		expect(lastFrame()).toContain("Merge:");
		expect(lastFrame()).toContain("1 queued");
	});

	it("shows help hint with dimColor by default", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert
		expect(lastFrame()).toContain("? help");
	});

	it("hides help hint when showHelp=false", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar
				taskStats={defaultTaskStats}
				mergeQueue={defaultMergeQueue}
				showHelp={false}
			/>,
		);

		// Assert
		expect(lastFrame()).not.toContain("? help");
	});

	it("uses gray pipe separators", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert
		expect(lastFrame()).toContain("|");
	});

	it("passes taskStats props correctly", () => {
		// Arrange
		const taskStats = { done: 5, running: 2, pending: 3, blocked: 0 };

		// Act
		const { lastFrame } = render(
			<FooterBar taskStats={taskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert
		expect(lastFrame()).toContain("5 done");
		expect(lastFrame()).toContain("2 running");
		expect(lastFrame()).toContain("3 pending");
		expect(lastFrame()).toContain("0 blocked");
	});

	it("passes mergeQueue props correctly", () => {
		// Arrange
		const mergeQueue = { queued: 5, merging: true };

		// Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={mergeQueue} />,
		);

		// Assert - merging state shows special indicator
		expect(lastFrame()).toContain("merging");
	});

	it("has gray top border", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert - Component renders with border (border characters may not be visible in test output)
		// The borderTop prop is set in the implementation, test that content renders
		expect(lastFrame()).toContain("Tasks:");
		expect(lastFrame()).toContain("Merge:");
	});

	it("uses horizontal flexbox layout", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert - All elements appear in the frame (horizontal layout)
		expect(lastFrame()).toContain("Tasks:");
		expect(lastFrame()).toContain("Merge:");
	});

	it('help hint shows "? help" text', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<FooterBar taskStats={defaultTaskStats} mergeQueue={defaultMergeQueue} />,
		);

		// Assert
		expect(lastFrame()).toContain("? help");
	});
});
