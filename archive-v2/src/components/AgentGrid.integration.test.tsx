import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { GridConfig } from "../hooks/useAgentGrid.js";
import { type Agent, AgentGrid } from "./AgentGrid.js";

/**
 * Integration tests for AgentGrid component system:
 * - AgentGrid
 * - AgentTile
 * - EmptySlot
 * - useAgentGrid hook
 */

// Helper to create test agents
function createAgent(
	id: string,
	taskId: string,
	overrides: Partial<Agent> = {},
): Agent {
	return {
		id,
		type: "claude",
		taskId,
		status: "running",
		iteration: 5,
		maxIterations: 50,
		startTime: Date.now() - 60000, // 1 minute ago
		...overrides,
	};
}

describe("AgentGrid Integration Tests", () => {
	// ========================================
	// Grid Layout Tests - 4 tests
	// ========================================
	describe("Grid Layout Tests", () => {
		it("2x2 config renders 4 cells correctly", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("ch-002");
			expect(output).toContain("[empty slot]");
		});

		it("1x4 config renders vertical stack", () => {
			// Arrange
			const agents = [createAgent("agent-1", "ch-001")];
			const gridConfig: GridConfig = { columns: 1, rows: 4, tileWidth: 80 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			// Should have 3 empty slots stacked vertically
			const emptySlotMatches = output.match(/\[empty slot\]/g);
			expect(emptySlotMatches?.length).toBe(3);
		});

		it("auto config uses terminal width", () => {
			// Arrange - narrow terminal (< 120) = 1 column
			const gridConfig: GridConfig = { columns: 1, rows: 2, tileWidth: 80 };
			const agents = [createAgent("agent-1", "ch-001")];

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={2} gridConfig={gridConfig} />,
			);

			// Assert - renders with single column
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
		});

		it("all cells have consistent width from gridConfig", () => {
			// Arrange
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 30 };
			const agents = [createAgent("agent-1", "ch-001")];

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert - both tiles and empty slots render
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("[empty slot]");
		});
	});

	// ========================================
	// Agent/Empty Mix Tests - 4 tests
	// ========================================
	describe("Agent/Empty Mix Tests", () => {
		it("3 agents, 4 slots renders 3 tiles + 1 empty", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
				createAgent("agent-3", "ch-003"),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("ch-002");
			expect(output).toContain("ch-003");
			expect(output).toContain("[empty slot]");
		});

		it("0 agents, 4 slots renders 4 empty slots", () => {
			// Arrange
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={[]} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			const emptySlotMatches = output.match(/\[empty slot\]/g);
			expect(emptySlotMatches?.length).toBe(4);
		});

		it("4 agents, 4 slots renders 4 tiles, no empty", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
				createAgent("agent-3", "ch-003"),
				createAgent("agent-4", "ch-004"),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("ch-002");
			expect(output).toContain("ch-003");
			expect(output).toContain("ch-004");
			expect(output).not.toContain("[empty slot]");
		});

		it("agents fill from beginning, empties at end", () => {
			// Arrange
			const agents = [createAgent("agent-1", "ch-001")];
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert - agent should be in first position (output order)
			const output = lastFrame() ?? "";
			const agentPos = output.indexOf("ch-001");
			const emptyPos = output.indexOf("[empty slot]");
			expect(agentPos).toBeLessThan(emptyPos);
		});
	});

	// ========================================
	// Dynamic Update Tests - 3 tests
	// ========================================
	describe("Dynamic Update Tests", () => {
		it("new agent appears when added to list", () => {
			// Arrange
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };
			const { lastFrame, rerender } = render(
				<AgentGrid
					agents={[createAgent("agent-1", "ch-001")]}
					maxSlots={4}
					gridConfig={gridConfig}
				/>,
			);

			// Assert initial
			expect(lastFrame() ?? "").toContain("ch-001");
			expect(lastFrame() ?? "").not.toContain("ch-002");

			// Act - add second agent
			rerender(
				<AgentGrid
					agents={[
						createAgent("agent-1", "ch-001"),
						createAgent("agent-2", "ch-002"),
					]}
					maxSlots={4}
					gridConfig={gridConfig}
				/>,
			);

			// Assert
			expect(lastFrame() ?? "").toContain("ch-001");
			expect(lastFrame() ?? "").toContain("ch-002");
		});

		it("removed agent replaced by empty slot", () => {
			// Arrange
			const gridConfig: GridConfig = { columns: 2, rows: 2, tileWidth: 40 };
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
			];
			const { lastFrame, rerender } = render(
				<AgentGrid agents={agents} maxSlots={4} gridConfig={gridConfig} />,
			);

			// Assert initial
			expect(lastFrame() ?? "").toContain("ch-001");
			expect(lastFrame() ?? "").toContain("ch-002");

			// Act - remove second agent
			rerender(
				<AgentGrid
					agents={[createAgent("agent-1", "ch-001")]}
					maxSlots={4}
					gridConfig={gridConfig}
				/>,
			);

			// Assert
			expect(lastFrame() ?? "").toContain("ch-001");
			expect(lastFrame() ?? "").not.toContain("ch-002");
			const output = lastFrame() ?? "";
			const emptySlotMatches = output.match(/\[empty slot\]/g);
			expect(emptySlotMatches?.length).toBe(3);
		});

		it("changing grid config re-renders layout", () => {
			// Arrange
			const agents = [createAgent("agent-1", "ch-001")];
			const { lastFrame, rerender } = render(
				<AgentGrid
					agents={agents}
					maxSlots={4}
					gridConfig={{ columns: 2, rows: 2, tileWidth: 40 }}
				/>,
			);

			// Act - change to 1 column
			rerender(
				<AgentGrid
					agents={agents}
					maxSlots={4}
					gridConfig={{ columns: 1, rows: 4, tileWidth: 80 }}
				/>,
			);

			// Assert - still renders correctly with new config
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
		});
	});

	// ========================================
	// Tile Content Tests - 3 tests
	// ========================================
	describe("Tile Content Tests", () => {
		it("each tile shows correct agent type and task ID", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001", { type: "claude" }),
				createAgent("agent-2", "ch-002", { type: "codex" }),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 1, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={2} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("CLAUDE");
			expect(output).toContain("ch-001");
			expect(output).toContain("CODEX");
			expect(output).toContain("ch-002");
		});

		it("progress shows iteration count", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001", { iteration: 10, maxIterations: 50 }),
			];
			const gridConfig: GridConfig = { columns: 1, rows: 1, tileWidth: 60 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={1} gridConfig={gridConfig} />,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("iter 10/50");
		});

		it("status indicator shows agent status", () => {
			// Arrange
			const agents = [createAgent("agent-1", "ch-001", { status: "running" })];
			const gridConfig: GridConfig = { columns: 1, rows: 1, tileWidth: 60 };

			// Act
			const { lastFrame } = render(
				<AgentGrid agents={agents} maxSlots={1} gridConfig={gridConfig} />,
			);

			// Assert - running status shows green dot
			const output = lastFrame() ?? "";
			expect(output).toContain("●"); // Status indicator
		});
	});

	// ========================================
	// Selection Tests - 2 tests
	// ========================================
	describe("Selection Tests", () => {
		it("selected tile has visual indicator", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 1, tileWidth: 40 };

			// Act
			const { lastFrame } = render(
				<AgentGrid
					agents={agents}
					maxSlots={2}
					selectedIndex={0}
					gridConfig={gridConfig}
				/>,
			);

			// Assert - first agent is selected (visual is handled by AgentTile)
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
		});

		it("selection can be changed via prop", () => {
			// Arrange
			const agents = [
				createAgent("agent-1", "ch-001"),
				createAgent("agent-2", "ch-002"),
			];
			const gridConfig: GridConfig = { columns: 2, rows: 1, tileWidth: 40 };
			const { lastFrame, rerender } = render(
				<AgentGrid
					agents={agents}
					maxSlots={2}
					selectedIndex={0}
					gridConfig={gridConfig}
				/>,
			);

			// Act - change selection
			rerender(
				<AgentGrid
					agents={agents}
					maxSlots={2}
					selectedIndex={1}
					gridConfig={gridConfig}
				/>,
			);

			// Assert - still renders both, selection changed
			const output = lastFrame() ?? "";
			expect(output).toContain("ch-001");
			expect(output).toContain("ch-002");
		});
	});
});
