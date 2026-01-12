import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Queries", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-queries-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("filters work correctly with persisted data", async () => {
		// Arrange - create store with various tasks
		const store1 = new TaskStore(tempDir);
		const task1 = store1.create({ title: "Feature", type: "feature" });
		const task2 = store1.create({ title: "Bug", type: "bug" });
		const task3 = store1.create({ title: "Task", type: "task" });
		store1.claim(task2.id); // Mark task2 as doing
		await store1.flush();

		// Act - create new store and load
		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Assert - filter by type
		const features = store2.list({ type: "feature" });
		expect(features).toHaveLength(1);
		expect(features[0].id).toBe(task1.id);

		// Assert - filter by status
		const doingTasks = store2.list({ status: "doing" });
		expect(doingTasks).toHaveLength(1);
		expect(doingTasks[0].id).toBe(task2.id);

		// Assert - filter todo tasks
		const todoTasks = store2.list({ status: "todo" });
		expect(todoTasks).toHaveLength(2);
		expect(todoTasks.map((t) => t.id)).toContain(task1.id);
		expect(todoTasks.map((t) => t.id)).toContain(task3.id);
	});

	it("ready() excludes tasks with unmet dependencies", async () => {
		// Arrange - create store with dependencies
		const store = new TaskStore(tempDir);
		const parentTask = store.create({ title: "Parent Task" });
		const childTask = store.create({
			title: "Child Task",
			dependencies: [parentTask.id],
		});
		const independentTask = store.create({ title: "Independent Task" });
		await store.flush();

		// Act
		const readyTasks = store.ready();

		// Assert - child task should be excluded (dependency not done)
		expect(readyTasks.map((t) => t.id)).toContain(parentTask.id);
		expect(readyTasks.map((t) => t.id)).toContain(independentTask.id);
		expect(readyTasks.map((t) => t.id)).not.toContain(childTask.id);
	});

	it("getStats() returns accurate counts", async () => {
		// Arrange - create store with various task states
		const store = new TaskStore(tempDir);
		store.create({ title: "Todo 1" });
		store.create({ title: "Todo 2" });
		const doingTask = store.create({ title: "Doing" });
		const doneTask = store.create({ title: "Done" });
		const failedTask = store.create({ title: "Failed" });

		store.claim(doingTask.id);
		store.claim(doneTask.id);
		store.complete(doneTask.id);
		store.claim(failedTask.id);
		store.fail(failedTask.id);
		await store.flush();

		// Act - reload and get stats
		const store2 = new TaskStore(tempDir);
		await store2.load();
		const stats = store2.getStats();

		// Assert - stats returns Record<TaskStatus, number>
		expect(stats.todo).toBe(2);
		expect(stats.doing).toBe(1);
		expect(stats.done).toBe(1);
		expect(stats.failed).toBe(1);
	});
});
