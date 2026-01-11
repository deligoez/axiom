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
	});

	it("shows AGENT CONTROL category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("AGENT CONTROL");
		expect(lastFrame()).toContain("Spawn agent");
	});

	it("shows MODE CONTROL category shortcuts (including 'm' key)", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("MODE CONTROL");
		expect(lastFrame()).toContain("Toggle mode");
	});

	it("shows TASK MANAGEMENT category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("TASK MANAGEMENT");
		expect(lastFrame()).toContain("New task");
	});

	it("shows VIEW category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("VIEW");
		expect(lastFrame()).toContain("Fullscreen");
	});

	it("shows RECOVERY category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("RECOVERY");
		expect(lastFrame()).toContain("Rollback");
	});

	it("shows PLANNING & LEARNING category shortcuts", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("PLANNING");
		expect(lastFrame()).toContain("Plan more");
	});

	it("shows GENERAL category shortcuts (including M for Merge queue view)", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("GENERAL");
		expect(lastFrame()).toContain("Merge queue");
	});

	it("categories in two-column layout", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert - Both column categories appear
		expect(lastFrame()).toContain("NAVIGATION");
		expect(lastFrame()).toContain("AGENT CONTROL");
	});

	it('P key shows "Plan more tasks"', () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Plan more");
	});

	it('m key shows "Toggle mode"', () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Toggle mode");
	});

	it("shows close hint", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert
		expect(lastFrame()).toContain("Press ? to close");
	});
});
