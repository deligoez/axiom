import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	BatchValidationResult,
	ValidatorTask,
} from "../services/TaskValidator.js";
import { ReviewLoop } from "./ReviewLoop.js";

// Mock useTerminalSize hook
vi.mock("../hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 100, height: 40 }),
}));

// Helper to create mock validation result
const createMockResult = (
	_valid: number,
	invalid: number,
): BatchValidationResult => ({
	tasks: [],
	valid: invalid === 0,
	errors: Array(invalid)
		.fill(null)
		.map((_, i) => ({ rule: `rule-${i}`, message: `Error ${i}` })),
	warnings: [],
	suggestions: [],
	getFixableTasks: () => [],
	applyAllFixes: () => [],
	getCounts: () => ({ errors: invalid, warnings: 0, suggestions: 0 }),
});

describe("ReviewLoop", () => {
	let onEventMock: ReturnType<typeof vi.fn<(event: unknown) => void>>;
	let mockValidateAll: ReturnType<
		typeof vi.fn<(tasks: ValidatorTask[]) => BatchValidationResult>
	>;
	let mockSave: ReturnType<typeof vi.fn<() => void>>;
	const mockTasks: ValidatorTask[] = [
		{ id: "task-1", title: "Task 1", deps: [] },
		{ id: "task-2", title: "Task 2", deps: ["task-1"] },
	];

	beforeEach(() => {
		vi.clearAllMocks();
		onEventMock = vi.fn();
		mockValidateAll = vi.fn().mockReturnValue(createMockResult(2, 0));
		mockSave = vi.fn();
	});

	describe("Validation loop", () => {
		it("runs TaskValidator on task list", () => {
			// Arrange & Act
			render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(mockValidateAll).toHaveBeenCalledWith(mockTasks);
		});

		it("emits VALIDATION_STARTED before validation", () => {
			// Arrange & Act
			render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(onEventMock).toHaveBeenCalledWith({
				type: "VALIDATION_STARTED",
				taskCount: 2,
			});
		});

		it("emits VALIDATION_COMPLETED with valid/invalid counts", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(1, 1));

			// Act
			render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(onEventMock).toHaveBeenCalledWith({
				type: "VALIDATION_COMPLETED",
				valid: 1,
				invalid: 1,
			});
		});

		it("Apply Fixes emits FIX_APPLIED event", () => {
			// Arrange
			const fixableResult = {
				...createMockResult(0, 2),
				getFixableTasks: () => mockTasks,
				applyAllFixes: () => mockTasks,
			};
			mockValidateAll.mockReturnValue(fixableResult);

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - press 'f' for fix
			stdin.write("f");

			// Assert
			expect(onEventMock).toHaveBeenCalledWith(
				expect.objectContaining({ type: "FIX_APPLIED" }),
			);
		});

		it("Review Again increments iteration and re-validates", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(0, 2));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - press 'r' to review again
			stdin.write("r");

			// Assert - validator called again (key behavior to test)
			expect(mockValidateAll).toHaveBeenCalledTimes(2);
			// VALIDATION_STARTED emitted again for re-validation
			expect(onEventMock).toHaveBeenCalledWith({
				type: "VALIDATION_STARTED",
				taskCount: 2,
			});
		});
	});

	describe("Iteration tracking", () => {
		it("tracks and displays iteration count", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Iteration 1/);
		});

		it("shows Iteration X/Y format where Y is maxIterations", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={5}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Iteration 1\/5/);
		});

		it("warns user when approaching max iterations", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(0, 2));

			// Act
			const { lastFrame } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					initialIteration={2}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/warning|last|final/i);
		});
	});

	describe("Mode selection and transition", () => {
		it("shows mode selection when all tasks valid", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(2, 0));

			// Act
			const { lastFrame } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/semi-auto|autopilot/i);
		});

		it("Confirm saves status=ready and chosenMode to planning-state", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(2, 0));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - select semi-auto mode (press 1 then enter)
			stdin.write("1");
			stdin.write("\r");

			// Assert
			expect(mockSave).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "ready",
					chosenMode: "semi-auto",
				}),
			);
		});

		it("emits REVIEW_COMPLETE event after state persisted", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(2, 0));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - select and confirm mode
			stdin.write("1");
			stdin.write("\r");

			// Assert
			expect(onEventMock).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "REVIEW_COMPLETE",
					mode: "semi-auto",
				}),
			);
		});

		it("state persistence happens BEFORE event emission", () => {
			// Arrange
			const callOrder: string[] = [];
			mockSave.mockImplementation(() => {
				callOrder.push("save");
			});
			onEventMock.mockImplementation((event) => {
				if ((event as { type: string }).type === "REVIEW_COMPLETE") {
					callOrder.push("event");
				}
			});
			mockValidateAll.mockReturnValue(createMockResult(2, 0));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act
			stdin.write("1");
			stdin.write("\r");

			// Assert - save happens BEFORE event
			expect(callOrder).toEqual(["save", "event"]);
		});
	});

	describe("Navigation", () => {
		it("Back to Plan emits BACK_TO_PLANNING event", () => {
			// Arrange
			mockValidateAll.mockReturnValue(createMockResult(0, 2));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - press 'b' for back
			stdin.write("b");

			// Assert
			expect(onEventMock).toHaveBeenCalledWith({ type: "BACK_TO_PLANNING" });
		});

		it("Edit Rules opens task-rules.md in editor", () => {
			// Arrange
			const onEditRulesMock = vi.fn();
			mockValidateAll.mockReturnValue(createMockResult(0, 2));

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
					onEditRules={onEditRulesMock}
				/>,
			);

			// Act - press 'e' for edit rules
			stdin.write("e");

			// Assert
			expect(onEditRulesMock).toHaveBeenCalled();
		});

		it("changes to rules affect next validation", () => {
			// Arrange
			mockValidateAll
				.mockReturnValueOnce(createMockResult(0, 2)) // First validation fails
				.mockReturnValueOnce(createMockResult(2, 0)); // Second passes

			const { stdin } = render(
				<ReviewLoop
					tasks={mockTasks}
					validator={{ validateAll: mockValidateAll }}
					planningState={{ save: mockSave }}
					maxIterations={3}
					onEvent={onEventMock}
				/>,
			);

			// Act - re-validate after rule change
			stdin.write("r");

			// Assert - validator called twice (rules can affect next validation)
			expect(mockValidateAll).toHaveBeenCalledTimes(2);
			// Second validation completed with different result
			expect(onEventMock).toHaveBeenCalledWith({
				type: "VALIDATION_COMPLETED",
				valid: 2,
				invalid: 0,
			});
		});
	});
});
