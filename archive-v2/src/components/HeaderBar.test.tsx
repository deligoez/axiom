import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { HeaderBar } from "./HeaderBar.js";

describe("HeaderBar", () => {
	it('shows "CHORUS" title in bold cyan', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={3} maxAgents={50} />,
		);

		// Assert
		expect(lastFrame()).toContain("CHORUS");
	});

	it("shows version in gray when provided", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar
				version="2.0"
				mode="semi-auto"
				runningAgents={3}
				maxAgents={50}
			/>,
		);

		// Assert
		expect(lastFrame()).toContain("v2.0");
	});

	it("hides version when not provided", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={3} maxAgents={50} />,
		);

		// Assert - Should show CHORUS but not "v" prefix
		expect(lastFrame()).toContain("CHORUS");
		expect(lastFrame()).not.toMatch(/v\d/);
	});

	it("renders ModeIndicator with correct mode", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={3} maxAgents={50} />,
		);

		// Assert - ModeIndicator shows mode text and dot
		expect(lastFrame()).toContain("semi-auto");
		expect(lastFrame()).toContain("●");
	});

	it("renders AgentSlotsCounter with correct counts", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={3} maxAgents={50} />,
		);

		// Assert - AgentSlotsCounter shows X/Y format
		expect(lastFrame()).toContain("3/50");
	});

	it("shows help hint with dimColor", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={3} maxAgents={50} />,
		);

		// Assert
		expect(lastFrame()).toContain("? for help");
	});

	it("hides help hint when showHelp=false", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar
				mode="semi-auto"
				runningAgents={3}
				maxAgents={50}
				showHelp={false}
			/>,
		);

		// Assert
		expect(lastFrame()).not.toContain("? for help");
	});

	it("uses space-between layout", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar
				version="2.0"
				mode="semi-auto"
				runningAgents={3}
				maxAgents={50}
			/>,
		);

		// Assert - All elements appear in the frame
		const frame = lastFrame() ?? "";
		expect(frame).toContain("CHORUS");
		expect(frame).toContain("semi-auto");
		expect(frame).toContain("3/50");
	});

	it("passes correct props to ModeIndicator", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="autopilot" runningAgents={3} maxAgents={50} />,
		);

		// Assert - autopilot mode shows in indicator
		expect(lastFrame()).toContain("autopilot");
	});

	it("passes correct props to AgentSlotsCounter", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<HeaderBar mode="semi-auto" runningAgents={10} maxAgents={20} />,
		);

		// Assert - counts are passed correctly
		expect(lastFrame()).toContain("10/20");
	});
});
