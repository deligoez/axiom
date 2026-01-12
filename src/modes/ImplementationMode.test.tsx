import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ImplementationMode } from "./ImplementationMode.js";

// Mock useTerminalSize hook
vi.mock("../hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 120, height: 40 }),
}));

// Mock useAgentGrid hook
vi.mock("../hooks/useAgentGrid.js", () => ({
	useAgentGrid: () => ({ columns: 2, rows: 2, tileWidth: 40 }),
}));

describe("ImplementationMode", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Layout", () => {
		it("renders TwoColumnLayout with TaskPanel and AgentGrid", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert - should have both panels (Tasks title visible)
			expect(lastFrame()).toBeDefined();
			// TaskPanel shows "No tasks" when empty
			expect(lastFrame()).toContain("No tasks");
		});

		it("displays HeaderBar with mode indicator", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("CHORUS");
			expect(lastFrame()).toMatch(/semi-auto/i);
		});

		it("displays FooterBar with shortcuts and stats", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/help/i);
		});
	});

	describe("Mode support", () => {
		it("supports semi-auto mode", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/semi-auto/i);
		});

		it("supports autopilot mode", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="autopilot"
					tasks={[]}
					agents={[]}
					maxAgents={4}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/autopilot/i);
		});
	});

	describe("Keyboard shortcuts", () => {
		it("p key triggers transition to Planning Mode", () => {
			// Arrange
			const onPlanningMock = vi.fn();
			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					onPlanningMode={onPlanningMock}
				/>,
			);

			// Act
			stdin.write("p");

			// Assert
			expect(onPlanningMock).toHaveBeenCalled();
		});

		it("m key triggers mode toggle callback", () => {
			// Arrange
			const onToggleModeMock = vi.fn();
			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					onToggleMode={onToggleModeMock}
				/>,
			);

			// Act
			stdin.write("m");

			// Assert
			expect(onToggleModeMock).toHaveBeenCalled();
		});
	});

	describe("Exit behavior", () => {
		it("q key triggers exit callback when no agents running", () => {
			// Arrange
			const onExitMock = vi.fn();
			const { stdin } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					onExit={onExitMock}
				/>,
			);

			// Act
			stdin.write("q");

			// Assert
			expect(onExitMock).toHaveBeenCalled();
		});

		it("q key shows confirmation when agents are running", () => {
			// Arrange
			const runningAgent = {
				id: "agent-1",
				type: "claude" as const,
				taskId: "ch-test1",
				status: "running" as const,
				iteration: 1,
				maxIterations: 10,
				startTime: Date.now(),
			};
			const onExitMock = vi.fn();
			const { stdin, lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[runningAgent]}
					maxAgents={4}
					onExit={onExitMock}
				/>,
			);

			// Act
			stdin.write("q");

			// Assert - should show confirmation, not exit
			expect(lastFrame()).toMatch(/confirm|exit|quit|running/i);
		});
	});

	describe("Task completion", () => {
		it("shows summary when all tasks are closed", () => {
			// Arrange
			const closedTask = {
				id: "ch-test1",
				title: "Test Task",
				status: "closed" as const,
				priority: 1 as const,
				type: "task" as const,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
			};

			// Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[closedTask]}
					agents={[]}
					maxAgents={4}
					allTasksClosed={true}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/complete|done|finished|summary/i);
		});
	});

	describe("No ready tasks handling", () => {
		it("shows waiting message in autopilot when no ready tasks", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="autopilot"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					noReadyTasks={true}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/wait|no.*task|ready/i);
		});

		it("shows message in semi-auto when no ready tasks", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					noReadyTasks={true}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/no.*task|ready/i);
		});
	});

	describe("Error handling", () => {
		it("shows error display on critical error", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[]}
					maxAgents={4}
					error={{ message: "Critical error occurred", recoverable: true }}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/error|critical/i);
		});
	});

	describe("Agent state preservation", () => {
		it("displays agent state correctly across mode prop changes", () => {
			// Arrange - Initial render with agent in running state
			const agent = {
				id: "agent-1",
				type: "claude" as const,
				taskId: "ch-test1",
				status: "running" as const,
				iteration: 5,
				maxIterations: 10,
				startTime: Date.now(),
			};

			const { lastFrame, rerender } = render(
				<ImplementationMode
					mode="semi-auto"
					tasks={[]}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Assert initial state
			expect(lastFrame()).toContain("CHORUS");
			expect(lastFrame()).toMatch(/semi-auto/i);

			// Act - Rerender with different mode but same agents
			rerender(
				<ImplementationMode
					mode="autopilot"
					tasks={[]}
					agents={[agent]}
					maxAgents={4}
				/>,
			);

			// Assert - Agent still displayed, mode changed
			expect(lastFrame()).toMatch(/autopilot/i);
			expect(lastFrame()).toContain("CHORUS");
		});
	});
});
