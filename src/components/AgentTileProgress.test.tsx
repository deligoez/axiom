import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { AgentTileProgress } from "./AgentTileProgress.js";

describe("AgentTileProgress", () => {
	it('shows "iter X/Y" format correctly', () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 12 * 60 * 1000; // 12 minutes ago

		// Act
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={7}
				maxIterations={50}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert
		expect(lastFrame()).toContain("iter 7/50");
	});

	it("renders DurationDisplay with startTime prop", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 12 * 60 * 1000; // 12 minutes ago

		// Act
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={7}
				maxIterations={50}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert - DurationDisplay formats 12 minutes as "12m"
		expect(lastFrame()).toContain("12m");
	});

	it("renders ProgressBar component", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 5 * 60 * 1000;

		// Act
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={5}
				maxIterations={10}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert - ProgressBar uses ▓ and ░ characters
		expect(lastFrame()).toMatch(/[▓░]/);
	});

	it("uses gray pipe separator between iteration and duration", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 5 * 60 * 1000;

		// Act
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={5}
				maxIterations={10}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert - Contains pipe separator
		expect(lastFrame()).toContain("|");
	});

	it("calculates progress = (iteration/maxIterations)*100 when progressPercent undefined", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 5 * 60 * 1000;

		// Act - 7/50 = 14%
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={7}
				maxIterations={50}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert - Should show 14%
		expect(lastFrame()).toContain("14%");
	});

	it("uses explicit progressPercent when provided (overrides calculation)", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 5 * 60 * 1000;

		// Act - iteration would calculate to 14%, but we override with 35%
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={7}
				maxIterations={50}
				startTime={startTime}
				progressPercent={35}
				now={now}
			/>,
		);

		// Assert - Should show explicit 35%, not calculated 14%
		expect(lastFrame()).toContain("35%");
		expect(lastFrame()).not.toContain("14%");
	});

	it("passes width prop to ProgressBar", () => {
		// Arrange
		const now = Date.now();
		const startTime = now - 5 * 60 * 1000;

		// Act - 100% progress with width 10 should show 10 filled blocks
		const { lastFrame } = render(
			<AgentTileProgress
				iteration={10}
				maxIterations={10}
				startTime={startTime}
				now={now}
			/>,
		);

		// Assert - Default width is 10, so at 100% we should have 10 ▓ characters
		const frame = lastFrame() ?? "";
		const filledBlocks = (frame.match(/▓/g) ?? []).length;
		expect(filledBlocks).toBe(10);
	});
});
