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
import { useSpawnKey } from "./useSpawnKey.js";

// Test component that uses the hook
function TestComponent({
	selectedTask,
	slotManager,
	orchestrator,
	onSpawned,
	onError,
}: {
	selectedTask: TaskProviderTask | null;
	slotManager: {
		hasAvailable: () => boolean;
	};
	orchestrator: {
		spawnAgent: (taskId: string) => string;
	};
	onSpawned?: (taskId: string, agentId: string) => void;
	onError?: (error: string) => void;
}) {
	useSpawnKey({
		selectedTask,
		slotManager,
		orchestrator,
		onSpawned,
		onError,
	});

	return (
		<Box flexDirection="column">
			<Text>Selected: {selectedTask ? selectedTask.id : "none"}</Text>
		</Box>
	);
}

describe("useSpawnKey", () => {
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

	// Helper to create task
	const createTask = (id: string, status = "open"): TaskProviderTask => ({
		id,
		title: "Test Task",
		priority: 1,
		status,
		labels: [],
		dependencies: [],
	});

	// Helper to create mocks
	const createMocks = () => ({
		slotManager: {
			hasAvailable: vi.fn().mockReturnValue(true),
		},
		orchestrator: {
			spawnAgent: vi.fn().mockReturnValue("agent-1"),
		},
		onSpawned: vi.fn(),
		onError: vi.fn(),
	});

	describe("Spawn Success", () => {
		it("calls orchestrator.spawnAgent when s pressed with valid task", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test1");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.orchestrator.spawnAgent).toHaveBeenCalledWith("ch-test1");
		});

		it("calls onSpawned with taskId and agentId on success", () => {
			// Arrange
			const mocks = createMocks();
			mocks.orchestrator.spawnAgent.mockReturnValue("agent-42");
			const task = createTask("ch-test2");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.onSpawned).toHaveBeenCalledWith("ch-test2", "agent-42");
		});

		it("checks slot availability before spawning", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test3");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert - slot check happens before spawn
			expect(mocks.slotManager.hasAvailable).toHaveBeenCalled();
			expect(mocks.orchestrator.spawnAgent).toHaveBeenCalled();
		});
	});

	describe("Validation", () => {
		it("calls onError when no task selected", () => {
			// Arrange
			const mocks = createMocks();
			const { stdin } = render(
				<TestComponent selectedTask={null} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("No task selected");
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});

		it("calls onError when task status is not open", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test4", "in_progress");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("Task not available");
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});

		it("calls onError when task has unmet dependencies", () => {
			// Arrange
			const mocks = createMocks();
			const task: TaskProviderTask = {
				...createTask("ch-test5"),
				dependencies: ["ch-blocker"],
			};
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("Task is blocked");
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});

		it("calls onError when no slots available", () => {
			// Arrange
			const mocks = createMocks();
			mocks.slotManager.hasAvailable.mockReturnValue(false);
			const task = createTask("ch-test6");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("No agent slots available");
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});
	});

	describe("Slot Check", () => {
		it("does not spawn when slotManager.hasAvailable returns false", () => {
			// Arrange
			const mocks = createMocks();
			mocks.slotManager.hasAvailable.mockReturnValue(false);
			const task = createTask("ch-test7");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("s");

			// Assert
			expect(mocks.slotManager.hasAvailable).toHaveBeenCalled();
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});

		it("ignores other keys", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test8");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("a");
			stdin.write("S"); // uppercase
			stdin.write("x");

			// Assert
			expect(mocks.orchestrator.spawnAgent).not.toHaveBeenCalled();
		});
	});
});
