import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { StatusLine } from "./StatusLine.js";

describe("StatusLine", () => {
	it("shows MAESTRO prefix in gold color", () => {
		// Arrange & Act
		const { lastFrame } = render(<StatusLine />);

		// Assert - MAESTRO prefix is shown
		expect(lastFrame()).toContain("MAESTRO");
	});

	it("shows worker count using persona name plural", () => {
		// Arrange
		const workers = [
			{ persona: "chip" as const, count: 2 },
			{ persona: "patch" as const, count: 1 },
		];

		// Act
		const { lastFrame } = render(<StatusLine workers={workers} />);

		// Assert - plural for 2+, singular for 1
		expect(lastFrame()).toContain("2 Chips");
		expect(lastFrame()).toContain("1 Patch");
		expect(lastFrame()).toContain("active");
	});

	it("shows Scout recommendation in parentheses", () => {
		// Arrange
		const scoutRecommendation = { taskId: "ch-xyz" };

		// Act
		const { lastFrame } = render(
			<StatusLine scoutRecommendation={scoutRecommendation} />,
		);

		// Assert - Scout recommendation format
		expect(lastFrame()).toContain("(Scout: ch-xyz next)");
	});
});
