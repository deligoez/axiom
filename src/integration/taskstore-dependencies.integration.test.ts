/**
 * INT-18: TaskStore Dependency Chain Test
 *
 * Integration tests for TaskStore dependency management with real file persistence.
 * Run with: npm run test:integration
 *
 * NOTE: This test does NOT use Claude CLI - tests pure file I/O and dependency logic.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

let tmpDir = "";

describe("INT-18: TaskStore Dependency Chain", () => {
	beforeEach(() => {
		// Create isolated temp directory for each test
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-deps-"));
		// Create .chorus directory
		mkdirSync(join(tmpDir, ".chorus"), { recursive: true });
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("detects circular dependencies across flush/load", async () => {
		// Arrange: Create A→B→C (C depends on B, B depends on A)
		const store1 = new TaskStore(tmpDir);
		const taskA = store1.create({ title: "Task A" });
		const taskB = store1.create({ title: "Task B" });
		const taskC = store1.create({ title: "Task C" });

		store1.addDependency(taskB.id, taskA.id); // B depends on A
		store1.addDependency(taskC.id, taskB.id); // C depends on B
		await store1.flush();

		// Act: Reload in new store and try to add C→A (would create cycle)
		const store2 = new TaskStore(tmpDir);
		await store2.load();

		// Assert: hasCircularDependency() returns true for C→A
		expect(store2.hasCircularDependency(taskA.id, taskC.id)).toBe(true);

		// Also verify the error is thrown when trying to add the dependency
		expect(() => {
			store2.addDependency(taskA.id, taskC.id);
		}).toThrow(/Circular dependency detected/);
	});

	it("completing task unblocks dependents", async () => {
		// Arrange: A→B (B depends on A, so B is blocked)
		const store = new TaskStore(tmpDir);
		const taskA = store.create({ title: "Task A" });
		const taskB = store.create({ title: "Task B" });

		store.addDependency(taskB.id, taskA.id); // B depends on A

		// Initially B is blocked
		expect(store.isBlocked(taskB.id)).toBe(true);
		expect(store.ready()).toHaveLength(1);
		expect(store.ready()[0].id).toBe(taskA.id);

		// Act: Claim and complete A
		store.claim(taskA.id);
		store.complete(taskA.id);
		await store.flush();

		// Assert: B now in ready() list
		expect(store.isBlocked(taskB.id)).toBe(false);
		expect(store.ready()).toHaveLength(1);
		expect(store.ready()[0].id).toBe(taskB.id);
	});

	it("dependency state persists through reload", async () => {
		// Arrange: Complex chain A→B→C→D, flush
		const store1 = new TaskStore(tmpDir);
		const taskA = store1.create({ title: "Task A" });
		const taskB = store1.create({ title: "Task B" });
		const taskC = store1.create({ title: "Task C" });
		const taskD = store1.create({ title: "Task D" });

		store1.addDependency(taskB.id, taskA.id); // B depends on A
		store1.addDependency(taskC.id, taskB.id); // C depends on B
		store1.addDependency(taskD.id, taskC.id); // D depends on C
		await store1.flush();

		// Act: New TaskStore loads from file
		const store2 = new TaskStore(tmpDir);
		await store2.load();

		// Assert: All dependencies intact
		const loadedB = store2.get(taskB.id);
		const loadedC = store2.get(taskC.id);
		const loadedD = store2.get(taskD.id);

		expect(loadedB?.dependencies).toContain(taskA.id);
		expect(loadedC?.dependencies).toContain(taskB.id);
		expect(loadedD?.dependencies).toContain(taskC.id);

		// Verify blocking relationships
		expect(store2.isBlocked(taskB.id)).toBe(true);
		expect(store2.isBlocked(taskC.id)).toBe(true);
		expect(store2.isBlocked(taskD.id)).toBe(true);
		expect(store2.isBlocked(taskA.id)).toBe(false);
	});

	it("ready() excludes all blocked tasks", async () => {
		// Arrange: 10 tasks, 5 blocked by dependencies
		const store = new TaskStore(tmpDir);
		const tasks = [];
		for (let i = 0; i < 10; i++) {
			tasks.push(store.create({ title: `Task ${i}` }));
		}

		// Block tasks 5-9 by making them depend on tasks 0-4
		store.addDependency(tasks[5].id, tasks[0].id);
		store.addDependency(tasks[6].id, tasks[1].id);
		store.addDependency(tasks[7].id, tasks[2].id);
		store.addDependency(tasks[8].id, tasks[3].id);
		store.addDependency(tasks[9].id, tasks[4].id);

		await store.flush();

		// Act: store.ready()
		const readyTasks = store.ready();

		// Assert: Returns exactly 5 unblocked tasks (0-4)
		expect(readyTasks).toHaveLength(5);
		const readyIds = readyTasks.map((t) => t.id);
		expect(readyIds).toContain(tasks[0].id);
		expect(readyIds).toContain(tasks[1].id);
		expect(readyIds).toContain(tasks[2].id);
		expect(readyIds).toContain(tasks[3].id);
		expect(readyIds).toContain(tasks[4].id);
		expect(readyIds).not.toContain(tasks[5].id);
	});

	it("getBlockers() returns direct blocking tasks", async () => {
		// Arrange: A→B→C (C depends on B, B depends on A)
		const store = new TaskStore(tmpDir);
		const taskA = store.create({ title: "Task A" });
		const taskB = store.create({ title: "Task B" });
		const taskC = store.create({ title: "Task C" });

		store.addDependency(taskB.id, taskA.id); // B depends on A
		store.addDependency(taskC.id, taskB.id); // C depends on B
		await store.flush();

		// Act: getBlockers(C)
		const blockersC = store.getBlockers(taskC.id);
		const blockersB = store.getBlockers(taskB.id);
		const blockersA = store.getBlockers(taskA.id);

		// Assert: Returns direct blockers (not transitive)
		// C's blocker is B (direct dependency that's not done)
		expect(blockersC).toHaveLength(1);
		expect(blockersC[0].id).toBe(taskB.id);

		// B's blocker is A
		expect(blockersB).toHaveLength(1);
		expect(blockersB[0].id).toBe(taskA.id);

		// A has no blockers
		expect(blockersA).toHaveLength(0);
	});

	it("handles deleted task in dependency chain", async () => {
		// Arrange: A→B (B depends on A)
		const store = new TaskStore(tmpDir);
		const taskA = store.create({ title: "Task A" });
		const taskB = store.create({ title: "Task B" });

		store.addDependency(taskB.id, taskA.id); // B depends on A
		await store.flush();

		// Initially B is blocked by A
		expect(store.isBlocked(taskB.id)).toBe(true);

		// Act: Delete A
		store.delete(taskA.id);
		await store.flush();

		// Assert: B unblocked (deleted task doesn't block)
		// Note: getBlockers filters out undefined (deleted) tasks
		const blockers = store.getBlockers(taskB.id);
		expect(blockers).toHaveLength(0);
		expect(store.isBlocked(taskB.id)).toBe(false);
	});
});
