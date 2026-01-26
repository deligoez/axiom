import { Box, Text } from "ink";
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
import type { TaskProviderTask } from "../types/task-provider.js";
import { useRecoveryKeys } from "./useRecoveryKeys.js";

// Test component that uses the hook
function TestComponent({
	selectedTask,
	taskProvider,
	iterationRollback,
	worktreeService,
	onToast,
	onIterationUpdate,
}: {
	selectedTask: TaskProviderTask | null;
	taskProvider: {
		updateCustomField: (
			id: string,
			key: string,
			value: string,
		) => Promise<void>;
	};
	iterationRollback: {
		rollback: (
			worktreePath: string,
			taskId: string,
		) => Promise<{ success: boolean; revertedCommits: string[] }>;
		getTaskCommitCount: (
			worktreePath: string,
			taskId: string,
		) => Promise<number>;
	};
	worktreeService: {
		remove: (
			agentType: string,
			taskId: string,
			options?: { force: boolean },
		) => Promise<void>;
		exists: (agentType: string, taskId: string) => boolean;
	};
	onToast?: (message: string) => void;
	onIterationUpdate?: (taskId: string, maxIterations: number) => void;
}) {
	useRecoveryKeys({
		selectedTask,
		taskProvider,
		iterationRollback,
		worktreeService,
		onToast,
		onIterationUpdate,
	});

	return (
		<Box flexDirection="column">
			<Text>Selected: {selectedTask ? selectedTask.id : "none"}</Text>
		</Box>
	);
}

describe("useRecoveryKeys", () => {
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

	// Create mock services
	const createMocks = () => ({
		taskProvider: {
			updateCustomField: vi.fn().mockResolvedValue(undefined),
		},
		iterationRollback: {
			rollback: vi
				.fn()
				.mockResolvedValue({ success: true, revertedCommits: ["abc123"] }),
			getTaskCommitCount: vi.fn().mockResolvedValue(3),
		},
		worktreeService: {
			remove: vi.fn().mockResolvedValue(undefined),
			exists: vi.fn().mockReturnValue(true),
		},
		onToast: vi.fn(),
		onIterationUpdate: vi.fn(),
	});

	// Helper to create task with custom fields
	const createTask = (
		id: string,
		custom?: { failed?: string; timeout?: string; maxIterations?: string },
	): TaskProviderTask => ({
		id,
		title: "Test Task",
		priority: 1,
		status: "open",
		labels: [],
		dependencies: [],
		custom: custom as TaskProviderTask["custom"],
	});

	describe("Retry Key (r)", () => {
		it("calls updateCustomField to clear flags when r pressed on failed task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test1", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("r");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).toHaveBeenCalledWith(
				"ch-test1",
				"failed",
				"",
			);
			expect(mocks.taskProvider.updateCustomField).toHaveBeenCalledWith(
				"ch-test1",
				"timeout",
				"",
			);
		});

		it("calls updateCustomField when r pressed on timeout task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test2", { timeout: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("r");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).toHaveBeenCalled();
		});

		it("calls onToast with confirmation message on retry", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test3", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("r");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith(
				"Task ch-test3 returned to pending",
			);
		});

		it("does nothing when r pressed on non-failed task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test4"); // No failed or timeout
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("r");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).not.toHaveBeenCalled();
		});
	});

	describe("Rollback Key (R)", () => {
		it("calls rollback when R pressed on failed task with commits", async () => {
			// Arrange
			const mocks = createMocks();
			mocks.iterationRollback.getTaskCommitCount.mockResolvedValue(3);
			const task = createTask("ch-test5", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("R");

			// Allow async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.iterationRollback.rollback).toHaveBeenCalled();
		});

		it("clears custom fields after successful rollback", async () => {
			// Arrange
			const mocks = createMocks();
			mocks.iterationRollback.getTaskCommitCount.mockResolvedValue(2);
			const task = createTask("ch-test6", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("R");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).toHaveBeenCalledWith(
				"ch-test6",
				"failed",
				"",
			);
			expect(mocks.taskProvider.updateCustomField).toHaveBeenCalledWith(
				"ch-test6",
				"timeout",
				"",
			);
		});

		it("shows confirmation with commit count after rollback", async () => {
			// Arrange
			const mocks = createMocks();
			mocks.iterationRollback.getTaskCommitCount.mockResolvedValue(3);
			mocks.iterationRollback.rollback.mockResolvedValue({
				success: true,
				revertedCommits: ["a", "b", "c"],
			});
			const task = createTask("ch-test7", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("R");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith(
				"Rolled back 3 commits for ch-test7",
			);
		});

		it("shows message when task has no commits to rollback", async () => {
			// Arrange
			const mocks = createMocks();
			mocks.iterationRollback.getTaskCommitCount.mockResolvedValue(0);
			const task = createTask("ch-test8", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("R");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith("No commits to rollback");
			expect(mocks.iterationRollback.rollback).not.toHaveBeenCalled();
		});

		it("does nothing when R pressed on non-failed task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test9"); // Not failed
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("R");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.iterationRollback.rollback).not.toHaveBeenCalled();
			expect(mocks.iterationRollback.getTaskCommitCount).not.toHaveBeenCalled();
		});
	});

	describe("Cleanup Key (X)", () => {
		it("calls worktreeService.remove with force when X pressed on failed task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test10", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("X");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.worktreeService.remove).toHaveBeenCalledWith(
				"claude",
				"ch-test10",
				{ force: true },
			);
		});

		it("shows confirmation after cleanup", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test11", { timeout: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("X");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith(
				"Worktree cleaned for ch-test11",
			);
		});

		it("shows message when task has no worktree", async () => {
			// Arrange
			const mocks = createMocks();
			mocks.worktreeService.exists.mockReturnValue(false);
			const task = createTask("ch-test12", { failed: "true" });
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("X");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith("No worktree to clean");
			expect(mocks.worktreeService.remove).not.toHaveBeenCalled();
		});

		it("does nothing when X pressed on non-failed/timeout task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test13");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("X");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.worktreeService.remove).not.toHaveBeenCalled();
		});
	});

	describe("Increase Iterations Key (+)", () => {
		it("calls onIterationUpdate when + pressed on timeout task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test14", {
				timeout: "true",
				maxIterations: "10",
			});
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert - should increase by 5 from current 10 to 15
			expect(mocks.onIterationUpdate).toHaveBeenCalledWith("ch-test14", 15);
		});

		it("shows confirmation message after iteration increase", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test15", {
				timeout: "true",
				maxIterations: "5",
			});
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onToast).toHaveBeenCalledWith(
				"Max iterations increased to 10 for ch-test15",
			);
		});

		it("does nothing when + pressed on non-timeout task", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test16", { failed: "true" }); // failed but not timeout
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.onIterationUpdate).not.toHaveBeenCalled();
		});
	});

	describe("Key State Management", () => {
		it("all keys disabled when no task selected", async () => {
			// Arrange
			const mocks = createMocks();
			const { stdin } = render(
				<TestComponent selectedTask={null} {...mocks} />,
			);

			// Act
			stdin.write("r");
			stdin.write("R");
			stdin.write("X");
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).not.toHaveBeenCalled();
			expect(mocks.iterationRollback.rollback).not.toHaveBeenCalled();
			expect(mocks.worktreeService.remove).not.toHaveBeenCalled();
			expect(mocks.onIterationUpdate).not.toHaveBeenCalled();
		});

		it("all keys disabled when selected task is not failed/timeout", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test17");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("r");
			stdin.write("R");
			stdin.write("X");
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(mocks.taskProvider.updateCustomField).not.toHaveBeenCalled();
			expect(mocks.iterationRollback.rollback).not.toHaveBeenCalled();
			expect(mocks.worktreeService.remove).not.toHaveBeenCalled();
			expect(mocks.onIterationUpdate).not.toHaveBeenCalled();
		});

		it("uses default maxIterations of 10 when not set", async () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test18", { timeout: "true" }); // no maxIterations
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("+");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert - default 10 + 5 = 15
			expect(mocks.onIterationUpdate).toHaveBeenCalledWith("ch-test18", 15);
		});
	});
});
