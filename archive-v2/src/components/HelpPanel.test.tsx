import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import HelpPanel from "./HelpPanel.js";

describe("HelpPanel", () => {
	it("returns null when visible=false", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={false} />);

		// Assert
		expect(lastFrame()).toBe("");
	});

	it("shows NAVIGATION category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("NAVIGATION");
		expect(lastFrame()).toContain("Move down");
		expect(lastFrame()).toContain("Move up");
		expect(lastFrame()).toContain("Switch panels");
	});

	it("shows MODE CONTROL category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("MODE CONTROL");
		expect(lastFrame()).toContain("Toggle mode");
		expect(lastFrame()).toContain("Planning mode");
	});

	it("shows VIEW category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("VIEW");
		expect(lastFrame()).toContain("View learnings");
	});

	it("shows GENERAL category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("GENERAL");
		expect(lastFrame()).toContain("Toggle help");
		expect(lastFrame()).toContain("Intervention menu");
		expect(lastFrame()).toContain("Quit");
	});

	it("categories in two-column layout", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert - Both column categories appear
		expect(lastFrame()).toContain("NAVIGATION");
		expect(lastFrame()).toContain("MODE CONTROL");
		expect(lastFrame()).toContain("VIEW");
		expect(lastFrame()).toContain("GENERAL");
	});

	it('m key shows "Toggle mode"', () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Toggle mode");
	});

	it('p key shows "Planning mode"', () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Planning mode");
	});

	it("shows close hint", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Press ? to close");
	});
});
