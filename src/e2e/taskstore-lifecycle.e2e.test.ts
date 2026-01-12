import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Lifecycle", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-lifecycle-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("lifecycle state persists across TaskStore restarts", async () => {
		// Arrange - create store, task, and claim it
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Persistent Task" });
		store1.claim(task.id);
		await store1.flush();

		// Act - create new store to simulate restart
		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Assert - task state should persist
		const loaded = store2.get(task.id);
		expect(loaded).toBeDefined();
		expect(loaded?.status).toBe("doing");
	});

	it("claim → complete → reopen cycle works", async () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Cycle Task" });

		// Act - claim
		store.claim(task.id);
		expect(store.get(task.id)?.status).toBe("doing");

		// Act - complete
		store.complete(task.id);
		expect(store.get(task.id)?.status).toBe("done");

		// Act - reopen
		store.reopen(task.id);

		// Assert - task should be back to todo
		expect(store.get(task.id)?.status).toBe("todo");
	});

	it("claim → fail → reopen cycle works", async () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Fail Cycle Task" });

		// Act - claim
		store.claim(task.id);
		expect(store.get(task.id)?.status).toBe("doing");

		// Act - fail
		store.fail(task.id, "Test failure reason");
		expect(store.get(task.id)?.status).toBe("failed");

		// Act - reopen
		store.reopen(task.id);

		// Assert - task should be back to todo
		expect(store.get(task.id)?.status).toBe("todo");
	});

	it("invalid transitions return proper errors", () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Invalid Transition Task" });

		// Act & Assert - cannot complete unclaimed task
		expect(() => store.complete(task.id)).toThrow(
			"status is 'todo', expected 'doing'",
		);

		// Act & Assert - cannot fail unclaimed task
		expect(() => store.fail(task.id)).toThrow(
			"status is 'todo', expected 'doing'",
		);

		// Act & Assert - cannot reopen task that's not done/failed
		expect(() => store.reopen(task.id)).toThrow(
			"status is 'todo', expected 'done' or 'failed'",
		);

		// Act & Assert - cannot claim doing task
		store.claim(task.id);
		expect(() => store.claim(task.id)).toThrow(
			"status is 'doing', expected 'todo'",
		);
	});
});
