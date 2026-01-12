import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	DependencyChecker,
	DependencyResult,
} from "./DependencyChecker.js";
import type { SessionLogger } from "./SessionLogger.js";
import { TaskValidator, type ValidatorTask } from "./TaskValidator.js";
import type {
	ValidationResult,
	ValidationRulesEngine,
} from "./ValidationRulesEngine.js";

describe("TaskValidator", () => {
	let mockRulesEngine: ValidationRulesEngine;
	let mockDepChecker: DependencyChecker;
	let mockSessionLogger: SessionLogger;
	let validator: TaskValidator;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRulesEngine = {
			validate: vi.fn().mockReturnValue({
				errors: [],
				warnings: [],
				suggestions: [],
			} as ValidationResult),
			suggestFix: vi.fn().mockReturnValue("Fix suggestion"),
			canAutoFix: vi.fn().mockReturnValue(false),
			applyFix: vi.fn(),
		} as unknown as ValidationRulesEngine;

		mockDepChecker = {
			check: vi.fn().mockReturnValue({
				valid: true,
				errors: [],
			} as DependencyResult),
		} as unknown as DependencyChecker;

		mockSessionLogger = {
			log: vi.fn(),
		} as unknown as SessionLogger;

		validator = new TaskValidator({
			rulesEngine: mockRulesEngine,
			depChecker: mockDepChecker,
			sessionLogger: mockSessionLogger,
		});
	});

	describe("validateAll() - Core functionality", () => {
		it("validateAll(tasks) returns BatchValidationResult", () => {
			// Arrange
			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task 1", description: "Desc", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);

			// Assert
			expect(result).toHaveProperty("tasks");
			expect(result).toHaveProperty("valid");
			expect(result).toHaveProperty("errors");
			expect(result).toHaveProperty("warnings");
			expect(result).toHaveProperty("suggestions");
		});

		it("runs ValidationRulesEngine on each task", () => {
			// Arrange
			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task 1", description: "Desc 1", deps: [] },
				{ id: "ch-002", title: "Task 2", description: "Desc 2", deps: [] },
			];

			// Act
			validator.validateAll(tasks);

			// Assert
			expect(mockRulesEngine.validate).toHaveBeenCalledTimes(2);
		});

		it("runs DependencyChecker on all tasks", () => {
			// Arrange
			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task 1", deps: [] },
				{ id: "ch-002", title: "Task 2", deps: ["ch-001"] },
			];

			// Act
			validator.validateAll(tasks);

			// Assert
			expect(mockDepChecker.check).toHaveBeenCalledTimes(1);
			expect(mockDepChecker.check).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ id: "ch-001" }),
					expect.objectContaining({ id: "ch-002" }),
				]),
			);
		});

		it("aggregates errors, warnings, suggestions from all sources", () => {
			// Arrange
			vi.mocked(mockRulesEngine.validate)
				.mockReturnValueOnce({
					errors: [{ rule: "test", message: "Error 1" }],
					warnings: [{ rule: "test", message: "Warning 1" }],
					suggestions: ["Suggestion 1"],
				} as ValidationResult)
				.mockReturnValueOnce({
					errors: [],
					warnings: [{ rule: "test", message: "Warning 2" }],
					suggestions: [],
				} as ValidationResult);

			vi.mocked(mockDepChecker.check).mockReturnValue({
				valid: false,
				errors: [{ type: "circular", taskId: "ch-001", cyclePath: ["ch-001"] }],
			});

			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task 1", deps: [] },
				{ id: "ch-002", title: "Task 2", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);

			// Assert
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.warnings.length).toBe(2);
			expect(result.suggestions.length).toBe(1);
		});
	});

	describe("Validation status", () => {
		it("isAllValid() returns true only if no errors", () => {
			// Arrange
			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Valid task", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);

			// Assert
			expect(result.valid).toBe(true);
		});

		it("getErrors() returns errors only (no warnings)", () => {
			// Arrange
			vi.mocked(mockRulesEngine.validate).mockReturnValue({
				errors: [{ rule: "test", message: "Error" }],
				warnings: [{ rule: "test", message: "Warning" }],
				suggestions: [],
			} as ValidationResult);

			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);

			// Assert
			expect(result.errors.length).toBe(1);
			expect(result.warnings.length).toBe(1);
			expect(result.errors[0].message).toBe("Error");
		});
	});

	describe("Auto-fix capabilities", () => {
		it("getFixableTasks() returns tasks with auto-fixable errors", () => {
			// Arrange
			vi.mocked(mockRulesEngine.validate).mockReturnValue({
				errors: [
					{
						rule: "description-length",
						message: "Too long",
						field: "description",
					},
				],
				warnings: [],
				suggestions: [],
			} as ValidationResult);
			vi.mocked(mockRulesEngine.canAutoFix).mockReturnValue(true);

			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task", description: "Long desc", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);
			const fixable = result.getFixableTasks();

			// Assert
			expect(fixable.length).toBe(1);
			expect(fixable[0].id).toBe("ch-001");
		});

		it("applyAllFixes() returns array of fixed tasks", () => {
			// Arrange
			vi.mocked(mockRulesEngine.validate).mockReturnValue({
				errors: [
					{
						rule: "description-length",
						message: "Too long",
						field: "description",
					},
				],
				warnings: [],
				suggestions: [],
			} as ValidationResult);
			vi.mocked(mockRulesEngine.canAutoFix).mockReturnValue(true);
			vi.mocked(mockRulesEngine.applyFix).mockImplementation((task, _fix) => ({
				...task,
				description: "Fixed description",
			}));

			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task", description: "Long desc", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);
			const fixed = result.applyAllFixes();

			// Assert
			expect(fixed.length).toBe(1);
			expect(fixed[0].description).toBe("Fixed description");
		});
	});

	describe("Statistics and logging", () => {
		it("getCounts() returns { errors, warnings, suggestions }", () => {
			// Arrange
			vi.mocked(mockRulesEngine.validate).mockReturnValue({
				errors: [{ rule: "test", message: "E1" }],
				warnings: [
					{ rule: "test", message: "W1" },
					{ rule: "test", message: "W2" },
				],
				suggestions: ["S1"],
			} as ValidationResult);

			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task", deps: [] },
			];

			// Act
			const result = validator.validateAll(tasks);
			const counts = result.getCounts();

			// Assert
			expect(counts).toEqual({
				errors: 1,
				warnings: 2,
				suggestions: 1,
			});
		});

		it("logs validation results via SessionLogger", () => {
			// Arrange
			const tasks: ValidatorTask[] = [
				{ id: "ch-001", title: "Task", deps: [] },
			];

			// Act
			validator.validateAll(tasks);

			// Assert
			expect(mockSessionLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "planning",
					eventType: expect.any(String),
				}),
			);
		});
	});
});
