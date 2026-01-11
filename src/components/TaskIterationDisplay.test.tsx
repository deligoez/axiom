import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { TaskIterationDisplay } from "./TaskIterationDisplay.js";

describe("TaskIterationDisplay", () => {
	it("shows agent type lowercase", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskIterationDisplay agentType="claude" iteration={5} />,
		);

		// Assert
		expect(lastFrame()).toContain("claude");
	});

	it('shows "iter X" format', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskIterationDisplay agentType="claude" iteration={7} />,
		);

		// Assert
		expect(lastFrame()).toContain("iter 7");
	});

	it("uses pipe separator", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskIterationDisplay agentType="claude" iteration={3} />,
		);

		// Assert
		expect(lastFrame()).toContain("|");
	});

	it("shows green dot indicator", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskIterationDisplay agentType="codex" iteration={2} />,
		);

		// Assert
		expect(lastFrame()).toContain("●");
	});

	it("has proper indentation", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<TaskIterationDisplay agentType="opencode" iteration={1} />,
		);

		// Assert - starts with spaces for indentation
		expect(lastFrame()).toMatch(/^\s+●/);
	});

	it("uses correct styling for different agent types", () => {
		// Arrange & Act
		const { lastFrame: frame1 } = render(
			<TaskIterationDisplay agentType="claude" iteration={1} />,
		);
		const { lastFrame: frame2 } = render(
			<TaskIterationDisplay agentType="codex" iteration={1} />,
		);
		const { lastFrame: frame3 } = render(
			<TaskIterationDisplay agentType="opencode" iteration={1} />,
		);

		// Assert
		expect(frame1()).toContain("claude");
		expect(frame2()).toContain("codex");
		expect(frame3()).toContain("opencode");
	});
});
