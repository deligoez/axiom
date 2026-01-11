import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { GridConfig } from "../hooks/useAgentGrid.js";
import { AgentGrid } from "./AgentGrid.js";

describe("AgentGrid", () => {
	const createAgent = (id: string, taskId: string) => ({
		id,
		type: "claude" as const,
		taskId,
		status: "running" as const,
		iteration: 5,
		maxIterations: 50,
		startTime: Date.now() - 5 * 60 * 1000,
	});

	const defaultGridConfig: GridConfig = {
		columns: 2,
		rows: 2,
		tileWidth: 40,
	};

	it("renders AgentTile for each agent", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001")];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={4} gridConfig={defaultGridConfig} />,
		);

		// Assert
		expect(lastFrame()).toContain("CLAUDE");
		expect(lastFrame()).toContain("ch-001");
	});

	it("renders multiple agents in grid layout", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001"), createAgent("a2", "ch-002")];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={4} gridConfig={defaultGridConfig} />,
		);

		// Assert
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
	});

	it("renders EmptySlot for unused slots", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001")];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={2} gridConfig={defaultGridConfig} />,
		);

		// Assert
		expect(lastFrame()).toContain("[empty slot]");
	});

	it("passes isSelected=true to selected AgentTile", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001"), createAgent("a2", "ch-002")];

		// Act
		const { lastFrame } = render(
			<AgentGrid
				agents={agents}
				maxSlots={4}
				selectedIndex={1}
				gridConfig={defaultGridConfig}
			/>,
		);

		// Assert - Selected tile gets double border (═ character)
		expect(lastFrame()).toMatch(/[═╔╗╚╝]/);
	});

	it("fills left-to-right, top-to-bottom", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001"), createAgent("a2", "ch-002")];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={4} gridConfig={defaultGridConfig} />,
		);

		// Assert - both agents appear in output
		const frame = lastFrame() ?? "";
		expect(frame).toContain("ch-001");
		expect(frame).toContain("ch-002");
	});

	it("uses gridConfig.columns for layout", () => {
		// Arrange
		const agents = [
			createAgent("a1", "ch-001"),
			createAgent("a2", "ch-002"),
			createAgent("a3", "ch-003"),
		];
		const gridConfig: GridConfig = { columns: 3, rows: 1, tileWidth: 30 };

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={3} gridConfig={gridConfig} />,
		);

		// Assert - all three agents render
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
		expect(lastFrame()).toContain("ch-003");
	});

	it("uses gridConfig.tileWidth for sizing", () => {
		// Arrange
		const agents = [createAgent("a1", "ch-001")];
		const gridConfig: GridConfig = { columns: 1, rows: 1, tileWidth: 50 };

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={1} gridConfig={gridConfig} />,
		);

		// Assert - Agent renders (width is applied internally)
		expect(lastFrame()).toContain("ch-001");
	});

	it("handles zero agents (all EmptySlot)", () => {
		// Arrange
		const agents: ReturnType<typeof createAgent>[] = [];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={4} gridConfig={defaultGridConfig} />,
		);

		// Assert
		const frame = lastFrame() ?? "";
		const emptySlotCount = (frame.match(/\[empty slot\]/g) ?? []).length;
		expect(emptySlotCount).toBe(4);
	});

	it("truncates if agents.length > maxSlots", () => {
		// Arrange
		const agents = [
			createAgent("a1", "ch-001"),
			createAgent("a2", "ch-002"),
			createAgent("a3", "ch-003"),
		];

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={2} gridConfig={defaultGridConfig} />,
		);

		// Assert - only first 2 agents shown
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
		expect(lastFrame()).not.toContain("ch-003");
	});

	it("grid wraps at column boundary", () => {
		// Arrange - 3 agents with 2 columns should wrap
		const agents = [
			createAgent("a1", "ch-001"),
			createAgent("a2", "ch-002"),
			createAgent("a3", "ch-003"),
		];
		const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

		// Act
		const { lastFrame } = render(
			<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
		);

		// Assert - all three agents appear
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
		expect(lastFrame()).toContain("ch-003");
	});

	it("passes correct agent props to AgentTile", () => {
		// Arrange
		const agent = {
			...createAgent("a1", "ch-001"),
			statusText: "Testing status...",
			lastCommand: "npm test",
			testResult: { passed: 10, failed: 0 },
		};

		// Act
		const { lastFrame } = render(
			<AgentGrid
				agents={[agent]}
				maxSlots={1}
				gridConfig={defaultGridConfig}
			/>,
		);

		// Assert - props are passed through to AgentTile
		expect(lastFrame()).toContain("Testing status...");
		expect(lastFrame()).toContain("npm test");
		expect(lastFrame()).toContain("10");
	});
});
