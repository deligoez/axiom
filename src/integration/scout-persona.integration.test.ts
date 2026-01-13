/**
 * INT-15: Scout Persona Task Selection Test
 *
 * Integration tests for Scout persona - tests heuristic task selection with real TaskStore.
 * Run with: npm run test:integration
 *
 * NOTE: This test does NOT use Claude CLI - Scout is heuristic-powered.
 * Tests file I/O and algorithm correctness.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

let tmpDir = "";

describe("INT-15: Scout Persona Integration", () => {
	beforeEach(() => {
		// Create isolated temp directory for each test
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-scout-"));
		// Create .chorus directory
		mkdirSync(join(tmpDir, ".chorus"), { recursive: true });
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("prioritizes 'next' tagged tasks with +200 bonus", async () => {
		// Arrange: TaskStore with 1 next-tagged task and 2 regular tasks
		const store = new TaskStore(tmpDir);
		store.create({ title: "Regular Task 1" });
		const task2 = store.create({ title: "Tagged Task", tags: ["next"] });
		store.create({ title: "Regular Task 2" });
		await store.flush();

		// Act: Select next task
		const selected = store.selectNext();

		// Assert: Returns next-tagged task (200 point bonus)
		expect(selected?.id).toBe(task2.id);
		expect(selected?.tags).toContain("next");
	});

	it("excludes blocked tasks from selection", async () => {
		// Arrange: Task A blocked by incomplete Task B
		const store = new TaskStore(tmpDir);
		const taskB = store.create({ title: "Task B - Blocker" });
		const taskA = store.create({
			title: "Task A - Blocked",
			dependencies: [taskB.id],
		});
		await store.flush();

		// Act: Select next task
		const selected = store.selectNext();

		// Assert: Does not return A until B complete, returns B (the unblocked one)
		expect(selected?.id).toBe(taskB.id);
		expect(store.ready().map((t) => t.id)).not.toContain(taskA.id);
	});

	it("respects excludeIds parameter", async () => {
		// Arrange: 3 ready tasks
		const store = new TaskStore(tmpDir);
		const task1 = store.create({ title: "Task 1" });
		const task2 = store.create({ title: "Task 2" });
		const task3 = store.create({ title: "Task 3" });
		await store.flush();

		// Act: Select with excludeIds
		const selected = store.selectNext({
			excludeIds: [task1.id, task2.id],
		});

		// Assert: Returns task3
		expect(selected?.id).toBe(task3.id);
	});

	it("maintains selection stability across flush/reload", async () => {
		// Arrange: Create tasks, select, flush, reload
		const store1 = new TaskStore(tmpDir);
		store1.create({ title: "Task A", tags: ["next"] }); // Should win with +200
		store1.create({ title: "Task B" });
		store1.create({ title: "Task C" });
		await store1.flush();

		const firstSelection = store1.selectNext();

		// Act: New TaskStore loads from file and selects
		const store2 = new TaskStore(tmpDir);
		await store2.load();
		const secondSelection = store2.selectNext();

		// Assert: Same task selected (deterministic)
		expect(secondSelection?.id).toBe(firstSelection?.id);
		expect(secondSelection?.title).toBe("Task A");
	});

	it("selects task that unblocks most dependents", async () => {
		// Arrange: Task A unblocks 3 tasks, Task B unblocks 1, both ready
		const store = new TaskStore(tmpDir);
		const taskA = store.create({ title: "Task A - Unblocks Many" });
		const taskB = store.create({ title: "Task B - Unblocks Few" });

		// 3 tasks depend on A
		store.create({ title: "Dep A1", dependencies: [taskA.id] });
		store.create({ title: "Dep A2", dependencies: [taskA.id] });
		store.create({ title: "Dep A3", dependencies: [taskA.id] });

		// 1 task depends on B
		store.create({ title: "Dep B1", dependencies: [taskB.id] });

		await store.flush();

		// Act: Select next task
		const selected = store.selectNext();

		// Assert: Returns A (300 unblocking bonus > 100)
		// Both have atomicity bonus (+50), A has +300 unblocking, B has +100
		expect(selected?.id).toBe(taskA.id);
	});

	it("handles 100+ tasks efficiently", async () => {
		// Arrange: TaskStore with 100 tasks, various tags
		const store = new TaskStore(tmpDir);
		for (let i = 0; i < 100; i++) {
			const tags = i === 50 ? ["next"] : i < 10 ? ["m1-infrastructure"] : [];
			store.create({ title: `Task ${i}`, tags });
		}
		await store.flush();

		// Act: Select with timing
		const start = Date.now();
		const selected = store.selectNext();
		const duration = Date.now() - start;

		// Assert: Selection < 100ms and returns next-tagged task
		expect(duration).toBeLessThan(100);
		expect(selected?.title).toBe("Task 50"); // The one with "next" tag
	});
});
