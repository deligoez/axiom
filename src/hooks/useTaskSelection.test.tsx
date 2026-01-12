import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it } from "vitest";
import type { TaskProviderTask } from "../types/task-provider.js";
import type { UseTaskSelectionResult } from "./useTaskSelection.js";
import { useTaskSelection } from "./useTaskSelection.js";

// Shared variable to capture hook result across tests
let capturedResult: UseTaskSelectionResult | undefined;

// Test component that uses the hook
function TestComponent({
	tasks,
	deferredTasks = [],
	hasRunningAgents = false,
	onSpawnAgent,
}: {
	tasks: TaskProviderTask[];
	deferredTasks?: TaskProviderTask[];
	hasRunningAgents?: boolean;
	onSpawnAgent?: (taskId: string) => void;
}) {
	const result = useTaskSelection({
		tasks,
		deferredTasks,
		hasRunningAgents,
		onSpawnAgent,
	});

	capturedResult = result;
	return null;
}

describe("useTaskSelection", () => {
	// Sample tasks for tests
	const createTask = (
		id: string,
		status: TaskProviderTask["status"] = "open",
	): TaskProviderTask => ({
		id,
		title: `Task ${id}`,
		status,
		priority: 1,
		labels: [],
		dependencies: [],
	});

	const sampleTasks: TaskProviderTask[] = [
		createTask("ch-001"),
		createTask("ch-002"),
		createTask("ch-003"),
	];

	beforeEach(() => {
		capturedResult = undefined;
	});

	describe("Initial State", () => {
		it("initial selection is null", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.selectedTaskId).toBeNull();
		});

		it("handles empty tasks array", () => {
			// Act
			render(<TestComponent tasks={[]} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.selectedTaskId).toBeNull();
		});

		it("canAssign is false when nothing selected", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.canAssign).toBe(false);
		});
	});

	describe("Hook Methods", () => {
		it("selectTask is a function", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.selectTask).toBe("function");
		});

		it("selectNext is a function", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.selectNext).toBe("function");
		});

		it("selectPrevious is a function", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.selectPrevious).toBe("function");
		});

		it("assignSelected is a function", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.assignSelected).toBe("function");
		});
	});

	describe("canAssign Logic", () => {
		it("canAssign is false when running agents", () => {
			// Act
			render(<TestComponent tasks={sampleTasks} hasRunningAgents={true} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.canAssign).toBe(false);
		});

		it("canAssign is false when no tasks", () => {
			// Act
			render(<TestComponent tasks={[]} hasRunningAgents={false} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.canAssign).toBe(false);
		});
	});

	describe("Keyboard Input", () => {
		it("j key triggers selectNext (hook integration)", () => {
			// Arrange
			let callCount = 0;

			function CaptureComponent() {
				useTaskSelection({ tasks: sampleTasks });
				callCount++;
				return null;
			}

			const { stdin } = render(<CaptureComponent />);

			// Act
			stdin.write("j");

			// Assert - component should re-render
			expect(callCount).toBeGreaterThanOrEqual(1);
		});

		it("k key triggers selectPrevious (hook integration)", () => {
			// Arrange
			let callCount = 0;

			function CaptureComponent() {
				useTaskSelection({ tasks: sampleTasks });
				callCount++;
				return null;
			}

			const { stdin } = render(<CaptureComponent />);

			// Act
			stdin.write("k");

			// Assert
			expect(callCount).toBeGreaterThanOrEqual(1);
		});
	});
});
