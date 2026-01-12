import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Dependencies", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-deps-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("dependencies persist across restarts", async () => {
		// Arrange - create tasks with dependencies
		const store1 = new TaskStore(tempDir);
		const parent = store1.create({ title: "Parent Task" });
		const child = store1.create({
			title: "Child Task",
			dependencies: [parent.id],
		});
		await store1.flush();

		// Act - create new store and load
		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Assert - dependencies should persist
		const loadedChild = store2.get(child.id);
		expect(loadedChild?.dependencies).toContain(parent.id);
	});

	it("completing blocker unblocks dependent", async () => {
		// Arrange - create parent and child tasks
		const store = new TaskStore(tempDir);
		const parent = store.create({ title: "Parent Task" });
		const child = store.create({
			title: "Child Task",
			dependencies: [parent.id],
		});

		// Verify child is not ready initially
		expect(store.ready().map((t) => t.id)).not.toContain(child.id);
		expect(store.stuck().map((t) => t.id)).toContain(child.id);

		// Act - complete the parent
		store.claim(parent.id);
		store.complete(parent.id);

		// Assert - child should now be ready
		expect(store.ready().map((t) => t.id)).toContain(child.id);
		expect(store.stuck().map((t) => t.id)).not.toContain(child.id);
	});

	it("circular dependency prevented", () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const task1 = store.create({ title: "Task 1" });
		const task2 = store.create({
			title: "Task 2",
			dependencies: [task1.id],
		});

		// Act & Assert - adding task1 -> task2 creates a cycle
		expect(() => store.addDependency(task1.id, task2.id)).toThrow(
			"Circular dependency detected",
		);
	});
});
