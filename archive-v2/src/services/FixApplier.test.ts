import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Fix, FixApplier, type FixableTask } from "./FixApplier.js";
import type { SessionLogger } from "./SessionLogger.js";

describe("FixApplier", () => {
	let mockSessionLogger: SessionLogger;
	let applier: FixApplier;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSessionLogger = {
			log: vi.fn(),
		} as unknown as SessionLogger;

		applier = new FixApplier({
			sessionLogger: mockSessionLogger,
			taskIdPrefix: "ch-",
		});
	});

	describe("applyFix() - Core functionality", () => {
		it("applyFix(task, fix) returns modified task", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Original title",
				description: "Original desc",
				deps: [],
			};
			const fix: Fix = {
				type: "rewrite",
				field: "title",
				newValue: "Updated title",
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			expect(result.modified).toBeDefined();
			expect(result.modified[0].title).toBe("Updated title");
		});

		it("handles rewrite fix: returns single modified task", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Old title",
				description: "Desc",
				deps: [],
			};
			const fix: Fix = {
				type: "rewrite",
				field: "description",
				newValue: "New description",
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			expect(result.modified.length).toBe(1);
			expect(result.modified[0].description).toBe("New description");
		});
	});

	describe("Split fix handling", () => {
		it("handles split fix: returns array of multiple tasks", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Create login and signup",
				description: "Multiple features",
				deps: [],
			};
			const fix: Fix = {
				type: "split",
				splitInto: [
					{ title: "Create login", description: "Login feature" },
					{ title: "Create signup", description: "Signup feature" },
				],
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			expect(result.modified.length).toBe(2);
			expect(result.modified[0].title).toBe("Create login");
			expect(result.modified[1].title).toBe("Create signup");
		});

		it("generates new sequential IDs for split tasks", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Multi-task",
				description: "Split me",
				deps: [],
			};
			const fix: Fix = {
				type: "split",
				splitInto: [
					{ title: "Part 1" },
					{ title: "Part 2" },
					{ title: "Part 3" },
				],
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			// All split tasks should have unique IDs with the prefix
			const ids = result.modified.map((t) => t.id);
			expect(ids[0]).toMatch(/^ch-/);
			expect(ids[1]).toMatch(/^ch-/);
			expect(ids[2]).toMatch(/^ch-/);
			expect(new Set(ids).size).toBe(3); // All unique
		});

		it("updates dependencies when task is split", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Multi-task",
				description: "Split me",
				deps: ["ch-000"],
			};
			const fix: Fix = {
				type: "split",
				splitInto: [{ title: "Part 1" }, { title: "Part 2" }],
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			// First task inherits original dependencies
			expect(result.modified[0].deps).toContain("ch-000");
			// Second task depends on first
			expect(result.modified[1].deps).toContain(result.modified[0].id);
		});
	});

	describe("Reorder fix handling", () => {
		it("handles reorder fix: returns reordered task list", () => {
			// Arrange
			const tasks: FixableTask[] = [
				{ id: "ch-001", title: "Task A", deps: [] },
				{ id: "ch-002", title: "Task B", deps: [] },
				{ id: "ch-003", title: "Task C", deps: [] },
			];
			const fix: Fix = {
				type: "reorder",
				newOrder: ["ch-003", "ch-001", "ch-002"],
			};

			// Act
			const result = applier.applyFixToList(tasks, fix);

			// Assert
			expect(result.length).toBe(3);
			expect(result[0].id).toBe("ch-003");
			expect(result[1].id).toBe("ch-001");
			expect(result[2].id).toBe("ch-002");
		});
	});

	describe("ID preservation", () => {
		it("preserves original task ID on modification", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-original",
				title: "Title",
				description: "Desc",
				deps: [],
			};
			const fix: Fix = {
				type: "rewrite",
				field: "title",
				newValue: "New title",
			};

			// Act
			const result = applier.applyFix(task, fix);

			// Assert
			expect(result.modified[0].id).toBe("ch-original");
		});
	});

	describe("User input requirement", () => {
		it("needsUserInput(fix) returns true for clarification fixes", () => {
			// Arrange
			const clarificationFix: Fix = {
				type: "clarify",
				question: "Which authentication method should be used?",
				options: ["OAuth", "JWT", "Session"],
			};

			// Act
			const needsInput = applier.needsUserInput(clarificationFix);

			// Assert
			expect(needsInput).toBe(true);
		});

		it("needsUserInput(fix) returns false for automatic fixes", () => {
			// Arrange
			const autoFix: Fix = {
				type: "rewrite",
				field: "title",
				newValue: "Fixed title",
			};

			// Act
			const needsInput = applier.needsUserInput(autoFix);

			// Assert
			expect(needsInput).toBe(false);
		});
	});

	describe("Logging", () => {
		it("logs applied fixes via SessionLogger", () => {
			// Arrange
			const task: FixableTask = {
				id: "ch-001",
				title: "Task",
				description: "Desc",
				deps: [],
			};
			const fix: Fix = {
				type: "rewrite",
				field: "title",
				newValue: "Fixed",
			};

			// Act
			applier.applyFix(task, fix);

			// Assert
			expect(mockSessionLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "planning",
					eventType: "fix_applied",
				}),
			);
		});
	});
});
