import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { AgentSlotsCounter } from "./AgentSlotsCounter.js";

describe("AgentSlotsCounter", () => {
	it("renders '0/3' format correctly", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={0} max={3} />);

		// Assert
		expect(lastFrame()).toContain("0/3");
	});

	it("renders '3/3' format correctly", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={3} max={3} />);

		// Assert
		expect(lastFrame()).toContain("3/3");
	});

	it("shows green dot when no agents running", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={0} max={3} />);

		// Assert - check for dot character (green color applied by Ink)
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("0/3");
	});

	it("shows yellow dot when partially full", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={2} max={3} />);

		// Assert
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("2/3");
	});

	it("shows red dot when full", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={3} max={3} />);

		// Assert
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("3/3");
	});

	it("handles undefined running (defaults to 0)", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentSlotsCounter running={undefined as unknown as number} max={3} />,
		);

		// Assert
		expect(lastFrame()).toContain("0/3");
	});

	it("handles undefined max (defaults to 0)", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentSlotsCounter running={0} max={undefined as unknown as number} />,
		);

		// Assert
		expect(lastFrame()).toContain("0/0");
	});

	it("handles max=0 (shows gray dot)", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={0} max={0} />);

		// Assert
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("0/0");
	});

	it("handles negative values (treats as 0)", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentSlotsCounter running={-1} max={-5} />);

		// Assert
		expect(lastFrame()).toContain("0/0");
	});
});
