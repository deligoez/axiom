import { describe, expect, it } from "vitest";
import {
	type Task,
	type ValidationError,
	type ValidationRulesConfig,
	ValidationRulesEngine,
} from "./ValidationRulesEngine.js";

describe("ValidationRulesEngine", () => {
	const defaultConfig: ValidationRulesConfig = {
		maxAcceptanceCriteria: 15,
		maxDescriptionLength: 1000,
		maxContextSize: 100000,
		requireTestFile: false,
		enforceNaming: undefined,
		forbiddenWords: [],
	};

	describe("validate() - Core functionality", () => {
		it("validate(task) returns ValidationResult with errors/warnings/suggestions", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const task: Task = {
				id: "ch-001",
				title: "Valid task",
				description: "A simple task description",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			expect(result).toHaveProperty("errors");
			expect(result).toHaveProperty("warnings");
			expect(result).toHaveProperty("suggestions");
			expect(Array.isArray(result.errors)).toBe(true);
			expect(Array.isArray(result.warnings)).toBe(true);
			expect(Array.isArray(result.suggestions)).toBe(true);
		});

		it("returns empty errors array for valid task", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const task: Task = {
				id: "ch-001",
				title: "Create login form",
				description: "Build a login form component",
				acceptanceCriteria: ["Form renders", "Validates input"],
			};

			// Act
			const result = engine.validate(task);

			// Assert
			expect(result.errors).toEqual([]);
		});
	});

	describe("Built-in rules - Atomic check", () => {
		it("flags tasks with multiple responsibilities (multiple verbs)", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const task: Task = {
				id: "ch-001",
				title: "Create form and validate data and submit to server",
				description: "Do multiple things",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const atomicError = result.warnings.find((e) => e.rule === "atomic");
			expect(atomicError).toBeDefined();
			expect(atomicError?.message).toMatch(/multiple|responsibilities/i);
		});
	});

	describe("Built-in rules - Testable check", () => {
		it("flags vague words like 'works correctly', 'handles properly'", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const task: Task = {
				id: "ch-001",
				title: "Make it work correctly",
				description: "The feature should handle things properly",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const testableError = result.warnings.find((e) => e.rule === "testable");
			expect(testableError).toBeDefined();
			expect(testableError?.message).toMatch(/vague|testable/i);
		});
	});

	describe("Built-in rules - Right-sized checks", () => {
		it("flags tasks with > max_criteria acceptance criteria", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				maxAcceptanceCriteria: 3,
			});
			const task: Task = {
				id: "ch-001",
				title: "Big task",
				description: "Too many criteria",
				acceptanceCriteria: ["1", "2", "3", "4", "5"],
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const sizeError = result.errors.find((e) => e.rule === "right-sized");
			expect(sizeError).toBeDefined();
			expect(sizeError?.message).toMatch(/acceptance criteria|too many/i);
		});

		it("flags tasks with description > max_length chars", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				maxDescriptionLength: 50,
			});
			const task: Task = {
				id: "ch-001",
				title: "Task with long description",
				description: "A".repeat(100),
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const lengthError = result.errors.find(
				(e) => e.rule === "description-length",
			);
			expect(lengthError).toBeDefined();
			expect(lengthError?.message).toMatch(/description|length|long/i);
		});

		it("flags tasks that exceed estimated context window size", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				maxContextSize: 100,
			});
			const task: Task = {
				id: "ch-001",
				title: "Huge task",
				description: "A".repeat(200),
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const contextError = result.warnings.find(
				(e) => e.rule === "context-fit",
			);
			expect(contextError).toBeDefined();
			expect(contextError?.message).toMatch(/context|size/i);
		});
	});

	describe("Configurable rules", () => {
		it("checks naming pattern if configured in rules", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				enforceNaming: "F\\d+:",
			});
			const task: Task = {
				id: "ch-001",
				title: "Invalid naming format",
				description: "Missing F## prefix",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const namingError = result.errors.find(
				(e) => e.rule === "naming-pattern",
			);
			expect(namingError).toBeDefined();
		});

		it("checks forbidden words if configured in rules", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				forbiddenWords: ["todo", "fixme", "hack"],
			});
			const task: Task = {
				id: "ch-001",
				title: "Task with TODO marker",
				description: "FIXME: This is a hack",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const forbiddenError = result.warnings.find(
				(e) => e.rule === "forbidden-words",
			);
			expect(forbiddenError).toBeDefined();
			expect(forbiddenError?.message).toMatch(/forbidden/i);
		});

		it("flags tasks without test file reference when require_test_file enabled", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				requireTestFile: true,
			});
			const task: Task = {
				id: "ch-001",
				title: "Feature task",
				description: "No test file mentioned",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const testFileError = result.errors.find(
				(e) => e.rule === "require-test-file",
			);
			expect(testFileError).toBeDefined();
		});
	});

	describe("Fix suggestions", () => {
		it("suggestFix(error) returns fix suggestion string", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const error: ValidationError = {
				rule: "atomic",
				message: "Task has multiple responsibilities",
				field: "title",
			};

			// Act
			const suggestion = engine.suggestFix(error);

			// Assert
			expect(typeof suggestion).toBe("string");
			expect(suggestion.length).toBeGreaterThan(0);
		});

		it("canAutoFix(error) returns boolean", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const error: ValidationError = {
				rule: "description-length",
				message: "Description too long",
				field: "description",
			};

			// Act
			const canFix = engine.canAutoFix(error);

			// Assert
			expect(typeof canFix).toBe("boolean");
		});

		it("applyFix(task, fix) returns modified task", () => {
			// Arrange
			const engine = new ValidationRulesEngine(defaultConfig);
			const task: Task = {
				id: "ch-001",
				title: "make it work correctly",
				description: "Test",
			};
			const fix = {
				field: "title" as const,
				replacement: "Implement user login",
			};

			// Act
			const modified = engine.applyFix(task, fix);

			// Assert
			expect(modified).not.toBe(task); // New object
			expect(modified.title).toBe("Implement user login");
			expect(modified.id).toBe(task.id);
		});
	});

	describe("Rules configuration", () => {
		it("valid task with test file reference passes require_test_file check", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				requireTestFile: true,
			});
			const task: Task = {
				id: "ch-001",
				title: "Feature task",
				description: "Implement feature",
				files: ["src/feature.ts", "src/feature.test.ts"],
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const testFileError = result.errors.find(
				(e) => e.rule === "require-test-file",
			);
			expect(testFileError).toBeUndefined();
		});

		it("valid task matching naming pattern passes check", () => {
			// Arrange
			const engine = new ValidationRulesEngine({
				...defaultConfig,
				enforceNaming: "F\\d+:",
			});
			const task: Task = {
				id: "ch-001",
				title: "F42: Feature implementation",
				description: "Valid naming",
			};

			// Act
			const result = engine.validate(task);

			// Assert
			const namingError = result.errors.find(
				(e) => e.rule === "naming-pattern",
			);
			expect(namingError).toBeUndefined();
		});

		it("built-in rules always run regardless of config", () => {
			// Arrange
			const minimalConfig: ValidationRulesConfig = {
				maxAcceptanceCriteria: 15,
				maxDescriptionLength: 1000,
				maxContextSize: 100000,
				requireTestFile: false,
			};
			const engine = new ValidationRulesEngine(minimalConfig);
			const task: Task = {
				id: "ch-001",
				title: "Create and update and delete everything correctly",
				description: "Works properly",
			};

			// Act
			const result = engine.validate(task);

			// Assert - should still check atomic and testable
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it("custom rules are optional and additive", () => {
			// Arrange
			const configWithCustom: ValidationRulesConfig = {
				...defaultConfig,
				forbiddenWords: ["hack"],
				enforceNaming: "F\\d+:",
			};
			const engine = new ValidationRulesEngine(configWithCustom);
			const task: Task = {
				id: "ch-001",
				title: "Good task without forbidden words",
				description: "Clean description",
			};

			// Act
			const result = engine.validate(task);

			// Assert - naming pattern should trigger
			const namingError = result.errors.find(
				(e) => e.rule === "naming-pattern",
			);
			expect(namingError).toBeDefined();
		});
	});
});
