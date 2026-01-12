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
import type { Task } from "../services/BeadsCLI.js";
import { useAssignKey } from "./useAssignKey.js";

// Test component that uses the hook
function TestComponent({
	selectedTask,
	slotManager,
	onAssigned,
	onError,
}: {
	selectedTask: Task | null;
	slotManager: {
		hasAvailable: () => boolean;
		assignTask: (taskId: string) => string;
	};
	onAssigned?: (taskId: string, slotId: string) => void;
	onError?: (error: string) => void;
}) {
	useAssignKey({
		selectedTask,
		slotManager,
		onAssigned,
		onError,
	});

	return (
		<Box flexDirection="column">
			<Text>Selected: {selectedTask ? selectedTask.id : "none"}</Text>
		</Box>
	);
}

describe("useAssignKey", () => {
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
	const createTask = (id: string, status = "open"): Task => ({
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
			assignTask: vi.fn().mockReturnValue("slot-1"),
		},
		onAssigned: vi.fn(),
		onError: vi.fn(),
	});

	describe("Assign Success", () => {
		it("calls slotManager.assignTask when Enter pressed with valid task", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test1");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act - simulate Enter key
			stdin.write("\r");

			// Assert
			expect(mocks.slotManager.assignTask).toHaveBeenCalledWith("ch-test1");
		});

		it("calls onAssigned with taskId and slotId on success", () => {
			// Arrange
			const mocks = createMocks();
			mocks.slotManager.assignTask.mockReturnValue("slot-42");
			const task = createTask("ch-test2");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("\r");

			// Assert
			expect(mocks.onAssigned).toHaveBeenCalledWith("ch-test2", "slot-42");
		});

		it("checks slot availability before assigning", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test3");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("\r");

			// Assert - slot check happens before assign
			expect(mocks.slotManager.hasAvailable).toHaveBeenCalled();
			expect(mocks.slotManager.assignTask).toHaveBeenCalled();
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
			stdin.write("\r");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("No task selected");
			expect(mocks.slotManager.assignTask).not.toHaveBeenCalled();
		});

		it("calls onError when task status is not open", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test4", "in_progress");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("\r");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("Task not available");
			expect(mocks.slotManager.assignTask).not.toHaveBeenCalled();
		});

		it("calls onError when no idle slots available", () => {
			// Arrange
			const mocks = createMocks();
			mocks.slotManager.hasAvailable.mockReturnValue(false);
			const task = createTask("ch-test5");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("\r");

			// Assert
			expect(mocks.onError).toHaveBeenCalledWith("No idle slots available");
			expect(mocks.slotManager.assignTask).not.toHaveBeenCalled();
		});
	});

	describe("Key Detection", () => {
		it("responds to Enter key (key.return)", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test6");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act - \r is carriage return (Enter)
			stdin.write("\r");

			// Assert
			expect(mocks.slotManager.assignTask).toHaveBeenCalled();
		});

		it("does not respond to other keys", () => {
			// Arrange
			const mocks = createMocks();
			const task = createTask("ch-test7");
			const { stdin } = render(
				<TestComponent selectedTask={task} {...mocks} />,
			);

			// Act
			stdin.write("a");
			stdin.write("s");
			stdin.write(" ");

			// Assert
			expect(mocks.slotManager.assignTask).not.toHaveBeenCalled();
		});
	});
});
