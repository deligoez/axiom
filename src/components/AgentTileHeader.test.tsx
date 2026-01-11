import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { AgentTileHeader } from "./AgentTileHeader.js";

describe("AgentTileHeader", () => {
	it("shows CLAUDE uppercase and bold", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="claude" taskId="ch-001" status="running" />,
		);

		// Assert
		expect(lastFrame()).toContain("CLAUDE");
	});

	it("shows (ch-xxx) task ID format", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="claude" taskId="ch-001" status="running" />,
		);

		// Assert
		expect(lastFrame()).toContain("(ch-001)");
	});

	it("shows green dot for running status", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="claude" taskId="ch-001" status="running" />,
		);

		// Assert
		expect(lastFrame()).toContain("●");
	});

	it("shows gray dot for idle status", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="codex" taskId="ch-002" status="idle" />,
		);

		// Assert
		expect(lastFrame()).toContain("○");
	});

	it("shows yellow pause for paused status", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="opencode" taskId="ch-003" status="paused" />,
		);

		// Assert
		expect(lastFrame()).toContain("⏸");
	});

	it("shows red X for error status", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="claude" taskId="ch-001" status="error" />,
		);

		// Assert
		expect(lastFrame()).toContain("✗");
	});

	it("status icon appears before agent type", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileHeader agentType="claude" taskId="ch-001" status="running" />,
		);

		// Assert
		const frame = lastFrame() ?? "";
		const iconPos = frame.indexOf("●");
		const typePos = frame.indexOf("CLAUDE");
		expect(iconPos).toBeLessThan(typePos);
	});
});
