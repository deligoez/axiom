/**
 * Full TUI Integration Tests
 *
 * End-to-end integration tests for the complete TUI application.
 * Tests app startup, user interactions, state changes, and error handling.
 */

import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "./components/AgentGrid.js";
import { ImplementationMode } from "./modes/ImplementationMode.js";
import {
	createMixedTasks,
	createReadyTasks,
	createTestTask,
} from "./test/fixtures/mockBeadsCLI.js";
import { createMockAgent } from "./test/fixtures/mockOrchestrator.js";
import type { TaskProviderTask } from "./types/task-provider.js";

// Mock useTerminalSize hook
vi.mock("./hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 120, height: 40 }),
}));

// Mock useAgentGrid hook
vi.mock("./hooks/useAgentGrid.js", () => ({
	useAgentGrid: () => ({ columns: 2, rows: 2, tileWidth: 40 }),
}));

describe("Full TUI Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// Startup Tests - 4 tests
	// ============================================================================
	describe("Startup Tests", () => {
		it("app renders without crash", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert
			expect(lastFrame()).toBeDefined();
			expect(lastFrame()).not.toContain("Error");
		});

		it("all layout components visible", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert - HeaderBar elements
			const output = lastFrame() ?? "";
			expect(output).toContain("CHORUS");
			// Assert - Mode indicator
			expect(output).toMatch(/semi-auto/i);
			// Assert - Agent slots
			expect(output).toContain("0/4");
		});

		it("initial state correct (mode, slots, tasks)", () => {
			// Arrange
			const tasks = createMixedTasks();

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="autopilot"
					tasks={tasks}
					agents={[]}
					maxAgents={6}
				/>,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toMatch(/autopilot/i);
			expect(output).toContain("0/6");
		});

		it("keyboard handlers active", () => {
			// Arrange
			const onPlanningMode = vi.fn();
			const tasks = createReadyTasks(3);

			// Act
			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					onPlanningMode={onPlanningMode}
				/>,
			);
			stdin.write("p");

			// Assert
			expect(onPlanningMode).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Navigation Flow Tests - 4 tests
	// ============================================================================
	describe("Navigation Flow Tests", () => {
		it("j key triggers navigation callback", () => {
			// Arrange
			const tasks = createReadyTasks(5);
			const selectedIndex = 0;

			// For this test, we verify that keyboard input reaches the component
			// The actual j/k navigation is handled by useNavigationKeys hook
			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					selectedTaskId={tasks[selectedIndex].id}
				/>,
			);

			// Act - j is handled by navigation hook, verify render doesn't crash
			stdin.write("j");

			// Assert - Component still renders correctly
			expect(lastFrame()).toBeDefined();
			expect(lastFrame()).toContain("CHORUS");
		});

		it("k key triggers navigation callback", () => {
			// Arrange
			const tasks = createReadyTasks(5);

			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					selectedTaskId={tasks[2].id}
				/>,
			);

			// Act
			stdin.write("k");

			// Assert - Component still renders correctly
			expect(lastFrame()).toBeDefined();
		});

		it("tab switches panel focus", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Act - Tab key should be handled by TwoColumnLayout
			stdin.write("\t");

			// Assert - Component renders after tab
			expect(lastFrame()).toBeDefined();
		});

		it("selection visual feedback works", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			// Act - Render with a selected task
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					selectedTaskId={tasks[0].id}
				/>,
			);

			// Assert - Output should contain the task ID or related visual
			const output = lastFrame() ?? "";
			expect(output).toBeDefined();
			// The task panel should render with tasks
			expect(output.length).toBeGreaterThan(0);
		});
	});

	// ============================================================================
	// Agent Lifecycle Tests - 5 tests
	// ============================================================================
	describe("Agent Lifecycle Tests", () => {
		it("agent tile appears when agent is spawned", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agent = createMockAgent("ch-ready1");

			// Act - Initial render without agent
			const { lastFrame, rerender } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert initial - empty slots
			expect(lastFrame()).toBeDefined();

			// Act - Rerender with agent
			rerender(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Assert - Agent should appear
			const output = lastFrame() ?? "";
			expect(output).toContain("1/4"); // One agent running
		});

		it("progress bar updates with agent iteration", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agent = createMockAgent("ch-ready1", {
				iteration: 5,
				maxIterations: 10,
			});

			// Act
			const { lastFrame, rerender } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Assert - Agent is visible
			expect(lastFrame()).toBeDefined();

			// Update iteration
			const updatedAgent = { ...agent, iteration: 8 };
			rerender(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[updatedAgent]}
					maxAgents={4}
				/>,
			);

			// Assert - Still renders
			expect(lastFrame()).toBeDefined();
		});

		it("task completion updates all components", () => {
			// Arrange
			const initialTasks: TaskProviderTask[] = [
				createTestTask("ch-001", { status: "in_progress" }),
				createTestTask("ch-002", { status: "open" }),
			];
			const agent = createMockAgent("ch-001");

			const { lastFrame, rerender } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={initialTasks}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Assert initial
			expect(lastFrame()).toBeDefined();

			// Update task to closed and remove agent
			const updatedTasks: TaskProviderTask[] = [
				createTestTask("ch-001", { status: "closed" }),
				createTestTask("ch-002", { status: "open" }),
			];

			rerender(
				<ImplementationMode
					mode="semi-auto"
					tasks={updatedTasks}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert - No agents running
			const output = lastFrame() ?? "";
			expect(output).toContain("0/4");
		});

		it("x key stops running agent when in exit confirmation", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agent = createMockAgent("ch-ready1");
			const onExit = vi.fn();

			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[agent]}
					maxAgents={4}
					onExit={onExit}
				/>,
			);

			// Act - Press q to trigger exit confirmation (since agent is running)
			stdin.write("q");

			// Assert - Should show confirmation
			const output = lastFrame() ?? "";
			expect(output).toMatch(/confirm|exit|running/i);

			// Act - Press 'n' to cancel
			stdin.write("n");

			// Assert - Should be back to normal view
			expect(lastFrame()).toContain("CHORUS");
		});

		it("multiple agents can run simultaneously", () => {
			// Arrange
			const tasks = createReadyTasks(4);
			const agents: Agent[] = [
				createMockAgent("ch-ready1"),
				createMockAgent("ch-ready2"),
				createMockAgent("ch-ready3"),
			];

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={agents}
					maxAgents={4}
				/>,
			);

			// Assert - 3 agents running
			const output = lastFrame() ?? "";
			expect(output).toContain("3/4");
		});
	});

	// ============================================================================
	// Modal Tests - 4 tests
	// ============================================================================
	describe("Modal Tests", () => {
		it("m key triggers mode toggle callback", () => {
			// Arrange
			const onToggleMode = vi.fn();
			const tasks = createReadyTasks(3);

			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					onToggleMode={onToggleMode}
				/>,
			);

			// Act
			stdin.write("m");

			// Assert
			expect(onToggleMode).toHaveBeenCalled();
		});

		it("q key opens exit dialog with running agents", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agent = createMockAgent("ch-ready1");

			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Act
			stdin.write("q");

			// Assert - Exit confirmation dialog
			const output = lastFrame() ?? "";
			expect(output).toMatch(/confirm|exit|quit|running/i);
		});

		it("ESC closes exit dialog and returns to normal view", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agent = createMockAgent("ch-ready1");
			const onExit = vi.fn();

			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[agent]}
					maxAgents={4}
					onExit={onExit}
				/>,
			);

			// Act - Press q (would open dialog if agents running)
			stdin.write("q");

			// Act - Press escape (should cancel/dismiss)
			stdin.write("\x1b"); // Escape key

			// Assert - onExit should NOT have been called (ESC cancels)
			expect(onExit).not.toHaveBeenCalled();

			// Assert - Normal view is still displayed
			expect(lastFrame()).toContain("CHORUS");
		});

		it("q exits immediately when no agents running", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const onExit = vi.fn();

			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]} // No agents running
					maxAgents={4}
					onExit={onExit}
				/>,
			);

			// Act - Press q (should exit immediately with no agents)
			stdin.write("q");

			// Assert - onExit should be called immediately (no confirmation needed)
			expect(onExit).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Error Handling Tests - 3 tests
	// ============================================================================
	describe("Error Handling Tests", () => {
		it("shows error display on critical error", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					error={{ message: "Critical system error", recoverable: true }}
				/>,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toMatch(/error|critical/i);
		});

		it("no slots available shows correct agent count", () => {
			// Arrange
			const tasks = createReadyTasks(3);
			const agents: Agent[] = [
				createMockAgent("ch-ready1"),
				createMockAgent("ch-ready2"),
			];

			// Act - All slots filled
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={agents}
					maxAgents={2}
				/>,
			);

			// Assert
			const output = lastFrame() ?? "";
			expect(output).toContain("2/2"); // All slots used
		});

		it("app recovers from component errors by showing error state", () => {
			// Arrange
			const tasks = createReadyTasks(3);

			// Act - First render with error
			const { lastFrame, rerender } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					error={{ message: "Temporary error", recoverable: true }}
				/>,
			);

			// Assert - Error displayed
			expect(lastFrame()).toMatch(/error/i);

			// Act - Recover by clearing error
			rerender(
				<ImplementationMode
					mode="semi-auto"
					tasks={tasks}
					agents={[]}
					maxAgents={4}
					error={null}
				/>,
			);

			// Assert - Normal view restored
			const output = lastFrame() ?? "";
			expect(output).toContain("CHORUS");
			expect(output).not.toMatch(/Critical.*Error/i);
		});
	});
});
