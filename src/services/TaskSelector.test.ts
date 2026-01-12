import { describe, expect, it } from "vitest";
import type { Task, TaskSelectionContext } from "../types/task.js";
import { TaskSelector } from "./TaskSelector.js";

/**
 * Helper to create a test task with minimal fields.
 */
function createTask(overrides: Partial<Task> & { id: string }): Task {
	return {
		title: `Task ${overrides.id}`,
		description: undefined,
		status: "todo",
		type: "task",
		tags: [],
		dependencies: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		reviewCount: 0,
		learningsCount: 0,
		hasLearnings: false,
		...overrides,
	};
}

describe("TaskSelector", () => {
	describe("selectNextTask", () => {
		it("returns undefined for empty task list", () => {
			// Arrange
			const selector = new TaskSelector();

			// Act
			const result = selector.selectNextTask([]);

			// Assert
			expect(result).toBeUndefined();
		});

		it("returns undefined when no ready tasks", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({ id: "ch-1", status: "doing" }),
				createTask({ id: "ch-2", status: "done" }),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert
			expect(result).toBeUndefined();
		});

		it("user hint bonus: +200 for 'next' tag", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({ id: "ch-1", createdAt: "2024-01-01" }), // Older
				createTask({ id: "ch-2", tags: ["next"], createdAt: "2024-01-02" }),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert
			expect(result?.id).toBe("ch-2");
		});

		it("dependency unblocking bonus: +100 per stuck dependent", () => {
			// Arrange
			const selector = new TaskSelector();
			// ch-1 has two tasks depending on it
			const tasks = [
				createTask({ id: "ch-1", createdAt: "2024-01-02" }),
				createTask({ id: "ch-2", createdAt: "2024-01-01" }), // Older, would win FIFO
				createTask({
					id: "ch-3",
					status: "todo",
					dependencies: ["ch-1"],
				}),
				createTask({
					id: "ch-4",
					status: "todo",
					dependencies: ["ch-1"],
				}),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert - ch-1 should win due to unblocking 2 tasks (+200)
			expect(result?.id).toBe("ch-1");
		});

		it("series continuation bonus: +25 per shared tag with last task", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({
					id: "ch-1",
					tags: ["frontend"],
					createdAt: "2024-01-02",
				}),
				createTask({
					id: "ch-2",
					tags: ["backend"],
					createdAt: "2024-01-01",
				}), // Older
			];
			const context: TaskSelectionContext = {
				lastCompletedTaskId: "ch-prev",
				preferredTags: [],
			};
			// Simulate last task had "frontend" tag
			const lastTask = createTask({ id: "ch-prev", tags: ["frontend"] });
			const allTasks = [...tasks, { ...lastTask, status: "done" as const }];

			// Act
			const result = selector.selectNextTask(allTasks, context);

			// Assert - ch-1 should win due to shared tag
			expect(result?.id).toBe("ch-1");
		});

		it("atomicity bonus: +50 for tasks with no dependencies", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({
					id: "ch-1",
					dependencies: ["ch-done"],
					createdAt: "2024-01-01",
				}),
				createTask({ id: "ch-2", dependencies: [], createdAt: "2024-01-02" }),
				createTask({ id: "ch-done", status: "done" }),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert - ch-2 wins with atomicity bonus
			expect(result?.id).toBe("ch-2");
		});

		it("preferred tags bonus: +10 per matching tag", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({ id: "ch-1", tags: [], createdAt: "2024-01-01" }),
				createTask({
					id: "ch-2",
					tags: ["urgent", "frontend"],
					createdAt: "2024-01-02",
				}),
			];
			const context: TaskSelectionContext = {
				preferredTags: ["urgent", "frontend", "backend"],
			};

			// Act
			const result = selector.selectNextTask(tasks, context);

			// Assert - ch-2 wins with +20 from preferred tags
			expect(result?.id).toBe("ch-2");
		});

		it("FIFO fallback: oldest task wins ties", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({ id: "ch-1", createdAt: "2024-01-03" }),
				createTask({ id: "ch-2", createdAt: "2024-01-01" }), // Oldest
				createTask({ id: "ch-3", createdAt: "2024-01-02" }),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert
			expect(result?.id).toBe("ch-2");
		});

		it("excludes tasks in excludeIds", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({ id: "ch-1", createdAt: "2024-01-01" }), // Oldest
				createTask({ id: "ch-2", createdAt: "2024-01-02" }),
			];
			const context: TaskSelectionContext = {
				excludeIds: ["ch-1"],
			};

			// Act
			const result = selector.selectNextTask(tasks, context);

			// Assert
			expect(result?.id).toBe("ch-2");
		});

		it("milestone focus bonus: +30 per same-milestone task completed", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				createTask({
					id: "ch-1",
					tags: ["m1-infrastructure"],
					createdAt: "2024-01-02",
				}),
				createTask({
					id: "ch-2",
					tags: ["m2-agent"],
					createdAt: "2024-01-01",
				}), // Older
				// Completed tasks in same milestone
				createTask({
					id: "ch-3",
					tags: ["m1-infrastructure"],
					status: "done",
				}),
				createTask({
					id: "ch-4",
					tags: ["m1-infrastructure"],
					status: "done",
				}),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert - ch-1 should win due to milestone focus (+60)
			expect(result?.id).toBe("ch-1");
		});

		it("combines multiple bonuses correctly", () => {
			// Arrange
			const selector = new TaskSelector();
			const tasks = [
				// ch-1: next tag (+200), no deps (+50), unblocks 1 (+100) = 350
				createTask({
					id: "ch-1",
					tags: ["next"],
					createdAt: "2024-01-02",
				}),
				// ch-2: unblocks 4 (+400), no deps (+50) = 450
				createTask({
					id: "ch-2",
					createdAt: "2024-01-01",
				}),
				// Dependents on ch-2
				createTask({ id: "ch-d1", dependencies: ["ch-2"] }),
				createTask({ id: "ch-d2", dependencies: ["ch-2"] }),
				createTask({ id: "ch-d3", dependencies: ["ch-2"] }),
				createTask({ id: "ch-d4", dependencies: ["ch-2"] }),
				// Dependent on ch-1
				createTask({ id: "ch-d5", dependencies: ["ch-1"] }),
			];

			// Act
			const result = selector.selectNextTask(tasks);

			// Assert - ch-2 wins with higher combined score
			expect(result?.id).toBe("ch-2");
		});
	});
});
