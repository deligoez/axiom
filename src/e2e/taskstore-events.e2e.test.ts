import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Events", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-events-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("events fire correctly for lifecycle changes", () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const createdHandler = vi.fn();
		const updatedHandler = vi.fn();
		const closedHandler = vi.fn();

		store.on("task:created", createdHandler);
		store.on("task:updated", updatedHandler);
		store.on("task:closed", closedHandler);

		// Act - create task
		const task = store.create({ title: "Test Task" });
		expect(createdHandler).toHaveBeenCalledWith(task);

		// Act - claim (status change triggers update)
		store.claim(task.id);
		expect(updatedHandler).toHaveBeenCalled();

		// Act - complete
		store.complete(task.id);
		expect(closedHandler).toHaveBeenCalled();
	});

	it("change event includes updated task list", () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const changeHandler = vi.fn();
		store.on("change", changeHandler);

		// Act - create first task
		const task1 = store.create({ title: "Task 1" });

		// Assert - change event called with array containing task1
		expect(changeHandler).toHaveBeenCalled();
		const firstCallArgs = changeHandler.mock.calls[0][0];
		expect(firstCallArgs).toHaveLength(1);
		expect(firstCallArgs[0].id).toBe(task1.id);

		// Act - create second task
		const task2 = store.create({ title: "Task 2" });

		// Assert - change event called with array containing both tasks
		const secondCallArgs = changeHandler.mock.calls[1][0];
		expect(secondCallArgs).toHaveLength(2);
		expect(secondCallArgs.map((t: { id: string }) => t.id)).toContain(task1.id);
		expect(secondCallArgs.map((t: { id: string }) => t.id)).toContain(task2.id);
	});
});
