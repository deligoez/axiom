import { beforeEach, describe, expect, it } from "vitest";
import { DependencyChecker, type Task } from "./DependencyChecker.js";

describe("DependencyChecker", () => {
	let checker: DependencyChecker;

	beforeEach(() => {
		checker = new DependencyChecker();
	});

	describe("check", () => {
		it("returns DependencyResult object", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
			];

			// Act
			const result = checker.check(tasks);

			// Assert
			expect(result).toHaveProperty("valid");
			expect(result).toHaveProperty("errors");
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it("detects circular dependencies (A→B→C→A)", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: ["C"] },
				{ id: "B", deps: ["A"] },
				{ id: "C", deps: ["B"] },
			];

			// Act
			const result = checker.check(tasks);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].type).toBe("circular");
		});

		it("returns cycle path array for circular dependency errors", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: ["C"] },
				{ id: "B", deps: ["A"] },
				{ id: "C", deps: ["B"] },
			];

			// Act
			const result = checker.check(tasks);

			// Assert
			expect(result.errors[0].cyclePath).toBeDefined();
			expect(result.errors[0].cyclePath?.length).toBeGreaterThan(0);
		});

		it("validates all dependency IDs exist in task list", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
			];

			// Act
			const result = checker.check(tasks);

			// Assert
			expect(result.valid).toBe(true);
		});

		it("returns error for non-existent dependency ID", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["NonExistent"] },
			];

			// Act
			const result = checker.check(tasks);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.errors[0].type).toBe("missing");
			expect(result.errors[0].taskId).toBe("B");
			expect(result.errors[0].missingDep).toBe("NonExistent");
		});
	});

	describe("topologicalSort", () => {
		it("returns execution order array", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
				{ id: "C", deps: ["B"] },
			];

			// Act
			const sorted = checker.topologicalSort(tasks);

			// Assert
			expect(Array.isArray(sorted)).toBe(true);
			expect(sorted).toHaveLength(3);
		});

		it("places tasks with no deps first", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "C", deps: ["B"] },
				{ id: "B", deps: ["A"] },
				{ id: "A", deps: [] },
			];

			// Act
			const sorted = checker.topologicalSort(tasks);

			// Assert
			expect(sorted[0]).toBe("A");
			expect(sorted.indexOf("A")).toBeLessThan(sorted.indexOf("B"));
			expect(sorted.indexOf("B")).toBeLessThan(sorted.indexOf("C"));
		});

		it("handles deep dependency chains (A→B→C→D→E)", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "E", deps: ["D"] },
				{ id: "D", deps: ["C"] },
				{ id: "C", deps: ["B"] },
				{ id: "B", deps: ["A"] },
				{ id: "A", deps: [] },
			];

			// Act
			const sorted = checker.topologicalSort(tasks);

			// Assert
			expect(sorted).toEqual(["A", "B", "C", "D", "E"]);
		});
	});

	describe("getDependents", () => {
		it("returns tasks depending on given task", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
				{ id: "C", deps: ["A"] },
				{ id: "D", deps: ["B"] },
			];
			checker.check(tasks); // Build internal graph

			// Act
			const dependents = checker.getDependents("A");

			// Assert
			expect(dependents).toContain("B");
			expect(dependents).toContain("C");
			expect(dependents).not.toContain("D"); // D depends on B, not directly on A
		});
	});

	describe("getBlockers", () => {
		it("returns tasks blocking given task", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: [] },
				{ id: "C", deps: ["A", "B"] },
			];
			checker.check(tasks); // Build internal graph

			// Act
			const blockers = checker.getBlockers("C");

			// Assert
			expect(blockers).toContain("A");
			expect(blockers).toContain("B");
			expect(blockers).toHaveLength(2);
		});

		it("returns empty array for task with no dependencies", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
			];
			checker.check(tasks); // Build internal graph

			// Act
			const blockers = checker.getBlockers("A");

			// Assert
			expect(blockers).toEqual([]);
		});
	});

	describe("canStart", () => {
		it("checks if deps satisfied", () => {
			// Arrange
			const tasks: Task[] = [
				{ id: "A", deps: [] },
				{ id: "B", deps: ["A"] },
				{ id: "C", deps: ["A", "B"] },
			];
			checker.check(tasks); // Build internal graph

			// Act & Assert
			expect(checker.canStart("A", [])).toBe(true); // No deps
			expect(checker.canStart("B", [])).toBe(false); // A not completed
			expect(checker.canStart("B", ["A"])).toBe(true); // A completed
			expect(checker.canStart("C", ["A"])).toBe(false); // B not completed
			expect(checker.canStart("C", ["A", "B"])).toBe(true); // All completed
		});
	});
});
