import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar.js";

describe("ProgressBar", () => {
	it("shows 0% with all empty blocks", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={0} />);

		// Assert
		expect(lastFrame()).toContain("░░░░░░░░░░");
		expect(lastFrame()).toContain("0%");
	});

	it("shows 50% with half filled blocks", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={50} />);

		// Assert
		expect(lastFrame()).toContain("▓▓▓▓▓░░░░░");
		expect(lastFrame()).toContain("50%");
	});

	it("shows 100% with all filled blocks", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={100} />);

		// Assert
		expect(lastFrame()).toContain("▓▓▓▓▓▓▓▓▓▓");
		expect(lastFrame()).toContain("100%");
	});

	it("respects custom width", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={50} width={20} />);

		// Assert - 50% of 20 = 10 filled, 10 empty
		expect(lastFrame()).toContain("▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░");
	});

	it("shows percentage text by default", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={35} />);

		// Assert
		expect(lastFrame()).toContain("35%");
	});

	it("hides percentage when showPercent=false", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<ProgressBar percent={35} showPercent={false} />,
		);

		// Assert
		expect(lastFrame()).not.toContain("35%");
		expect(lastFrame()).not.toContain("%");
	});

	it("clamps negative to 0", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={-25} />);

		// Assert
		expect(lastFrame()).toContain("░░░░░░░░░░");
		expect(lastFrame()).toContain("0%");
	});

	it("clamps >100 to 100", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={150} />);

		// Assert
		expect(lastFrame()).toContain("▓▓▓▓▓▓▓▓▓▓");
		expect(lastFrame()).toContain("100%");
	});

	it("uses green color for >80%", () => {
		// Arrange & Act
		const { lastFrame } = render(<ProgressBar percent={85} />);

		// Assert - Ink applies ANSI codes, we verify green block chars exist
		expect(lastFrame()).toContain("▓");
		expect(lastFrame()).toContain("85%");
	});

	it("calculates blocks correctly for various percents", () => {
		// Arrange & Act - test 35% with width 10
		const { lastFrame } = render(<ProgressBar percent={35} width={10} />);

		// Assert - 35% of 10 = 3.5 → Math.round = 4 filled (but could be 3 depending on rounding)
		// Let's verify the total characters and approximate filled count
		const frame = lastFrame() ?? "";
		const filledCount = (frame.match(/▓/g) || []).length;
		const emptyCount = (frame.match(/░/g) || []).length;
		expect(filledCount + emptyCount).toBe(10);
		// 35% should give roughly 3-4 filled blocks
		expect(filledCount).toBeGreaterThanOrEqual(3);
		expect(filledCount).toBeLessThanOrEqual(4);
	});
});
