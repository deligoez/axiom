import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CreateTaskInput } from "../types/task.js";
import { TaskStore } from "./TaskStore.js";

describe("TaskStore", () => {
	let tempDir: string;
	let store: TaskStore;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "taskstore-test-"));
		store = new TaskStore(tempDir);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("constructor", () => {
		it("should initialize store with project directory", () => {
			// Arrange & Act
			const newStore = new TaskStore(tempDir);

			// Assert
			expect(newStore).toBeInstanceOf(TaskStore);
		});
	});

	describe("create", () => {
		it("should create task with sequential ID", () => {
			// Arrange
			const input: CreateTaskInput = { title: "Test Task" };

			// Act
			const task = store.create(input);

			// Assert
			expect(task.id).toBe("ch-1");
			expect(task.title).toBe("Test Task");
			expect(task.status).toBe("todo");
			expect(task.type).toBe("task");
			expect(task.tags).toEqual([]);
			expect(task.dependencies).toEqual([]);
			expect(task.reviewCount).toBe(0);
			expect(task.learningsCount).toBe(0);
			expect(task.hasLearnings).toBe(false);
		});

		it("should generate sequential IDs for multiple tasks", () => {
			// Arrange & Act
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({ title: "Task 2" });
			const task3 = store.create({ title: "Task 3" });

			// Assert
			expect(task1.id).toBe("ch-1");
			expect(task2.id).toBe("ch-2");
			expect(task3.id).toBe("ch-3");
		});

		it("should set createdAt and updatedAt timestamps", () => {
			// Arrange
			const before = new Date().toISOString();

			// Act
			const task = store.create({ title: "Test Task" });

			// Assert
			const after = new Date().toISOString();
			expect(task.createdAt >= before).toBe(true);
			expect(task.createdAt <= after).toBe(true);
			expect(task.updatedAt).toBe(task.createdAt);
		});
	});

	describe("get", () => {
		it("should return task by ID", () => {
			// Arrange
			const created = store.create({ title: "Test Task" });

			// Act
			const retrieved = store.get(created.id);

			// Assert
			expect(retrieved).toEqual(created);
		});

		it("should return undefined for non-existent ID", () => {
			// Arrange & Act
			const result = store.get("ch-999");

			// Assert
			expect(result).toBeUndefined();
		});
	});

	describe("update", () => {
		it("should update task fields", async () => {
			// Arrange
			const task = store.create({ title: "Original" });
			// Small delay to ensure different timestamp
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act
			const updated = store.update(task.id, { title: "Updated" });

			// Assert
			expect(updated.title).toBe("Updated");
			expect(updated.updatedAt >= task.updatedAt).toBe(true);
		});

		it("should throw if task not found", () => {
			// Arrange & Act & Assert
			expect(() => store.update("ch-999", { title: "New" })).toThrow(
				"Task not found: ch-999",
			);
		});
	});

	describe("delete", () => {
		it("should soft-delete task by setting status to tombstone-like state", () => {
			// Arrange
			const task = store.create({ title: "To Delete" });

			// Act
			store.delete(task.id);

			// Assert
			const deleted = store.get(task.id);
			expect(deleted).toBeUndefined(); // Deleted tasks are not returned by get
		});
	});

	describe("initNextId", () => {
		it("should continue sequence after reinitialization", () => {
			// Arrange - create some tasks
			store.create({ title: "Task 1" }); // ch-1
			store.create({ title: "Task 2" }); // ch-2
			store.create({ title: "Task 3" }); // ch-3

			// Act - reinitialize nextId (simulates what happens after loading from disk)
			// @ts-expect-error - accessing protected method for testing
			store.initNextId();

			// Create new task - should continue from ch-4
			const task = store.create({ title: "Task 4" });

			// Assert
			expect(task.id).toBe("ch-4");
		});
	});

	describe("persistence", () => {
		it("should create .chorus directory on flush if not exists", async () => {
			// Arrange
			store.create({ title: "Test Task" });
			const chorusDir = join(tempDir, ".chorus");

			// Act
			await store.flush();

			// Assert
			expect(existsSync(chorusDir)).toBe(true);
		});

		it("should write tasks to JSONL file on flush", async () => {
			// Arrange
			store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });

			// Act
			await store.flush();

			// Assert
			const jsonlPath = join(tempDir, ".chorus", "tasks.jsonl");
			expect(existsSync(jsonlPath)).toBe(true);

			const content = readFileSync(jsonlPath, "utf-8");
			const lines = content.trim().split("\n");
			expect(lines.length).toBe(2);

			// Verify snake_case format
			const task1 = JSON.parse(lines[0]);
			expect(task1.id).toBe("ch-1");
			expect(task1.created_at).toBeDefined();
			expect(task1.updated_at).toBeDefined();
		});

		it("should load tasks from JSONL file", async () => {
			// Arrange - create tasks and flush
			store.create({ title: "Task 1", tags: ["test"] });
			store.create({ title: "Task 2" });
			await store.flush();

			// Act - create new store and load
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Assert
			const task1 = newStore.get("ch-1");
			const task2 = newStore.get("ch-2");
			expect(task1?.title).toBe("Task 1");
			expect(task1?.tags).toEqual(["test"]);
			expect(task2?.title).toBe("Task 2");
		});

		it("should handle empty/missing file gracefully", async () => {
			// Arrange - no tasks, no file

			// Act
			await store.load();

			// Assert - should not throw, store should be empty
			expect(store.getAllIds()).toEqual([]);
		});

		it("should continue sequence after load", async () => {
			// Arrange - create tasks and flush
			store.create({ title: "Task 1" }); // ch-1
			store.create({ title: "Task 2" }); // ch-2
			await store.flush();

			// Act - create new store, load, and create new task
			const newStore = new TaskStore(tempDir);
			await newStore.load();
			const task3 = newStore.create({ title: "Task 3" });

			// Assert
			expect(task3.id).toBe("ch-3");
		});

		it("should parse snake_case to camelCase on load", async () => {
			// Arrange - write JSONL with snake_case manually
			const chorusDir = join(tempDir, ".chorus");
			mkdirSync(chorusDir, { recursive: true });

			const jsonlContent = JSON.stringify({
				id: "ch-1",
				title: "Test Task",
				status: "todo",
				type: "task",
				tags: [],
				dependencies: [],
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z",
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
			});
			writeFileSync(join(chorusDir, "tasks.jsonl"), jsonlContent);

			// Act
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Assert
			const task = newStore.get("ch-1");
			expect(task?.createdAt).toBe("2024-01-01T00:00:00.000Z");
			expect(task?.updatedAt).toBe("2024-01-01T00:00:00.000Z");
			expect(task?.reviewCount).toBe(0);
			expect(task?.learningsCount).toBe(0);
			expect(task?.hasLearnings).toBe(false);
		});
	});

	describe("lifecycle", () => {
		it("should claim task: todo → doing", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			expect(task.status).toBe("todo");

			// Act
			const claimed = store.claim(task.id);

			// Assert
			expect(claimed.status).toBe("doing");
			expect(claimed.execution?.startedAt).toBeDefined();
		});

		it("should throw when claiming non-todo task", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id); // Now 'doing'

			// Act & Assert
			expect(() => store.claim(task.id)).toThrow(
				"Cannot claim task ch-1: status is 'doing', expected 'todo'",
			);
		});

		it("should release task: doing → todo", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);

			// Act
			const released = store.release(task.id);

			// Assert
			expect(released.status).toBe("todo");
		});

		it("should throw when releasing non-doing task", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });

			// Act & Assert
			expect(() => store.release(task.id)).toThrow(
				"Cannot release task ch-1: status is 'todo', expected 'doing'",
			);
		});

		it("should complete task: doing → done", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);

			// Act
			const completed = store.complete(task.id, "All tests passed");

			// Assert
			expect(completed.status).toBe("done");
			expect(completed.execution?.completedAt).toBeDefined();
		});

		it("should fail task: doing → failed with lastError", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);

			// Act
			const failed = store.fail(task.id, "Tests failed");

			// Assert
			expect(failed.status).toBe("failed");
			expect(failed.execution?.lastError).toBe("Tests failed");
			expect(failed.execution?.failedAt).toBeDefined();
		});

		it("should defer task: any → later", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });

			// Act
			const deferred = store.defer(task.id);

			// Assert
			expect(deferred.status).toBe("later");
		});

		it("should reopen done task: done → todo", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);
			store.complete(task.id);

			// Act
			const reopened = store.reopen(task.id);

			// Assert
			expect(reopened.status).toBe("todo");
		});

		it("should reopen failed task: failed → todo", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);
			store.fail(task.id, "Error");

			// Act
			const reopened = store.reopen(task.id);

			// Assert
			expect(reopened.status).toBe("todo");
		});

		it("should throw when reopening non-done/failed task", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });

			// Act & Assert
			expect(() => store.reopen(task.id)).toThrow(
				"Cannot reopen task ch-1: status is 'todo', expected 'done' or 'failed'",
			);
		});

		it("should update execution.startedAt on claim", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			const before = new Date().toISOString();

			// Act
			const claimed = store.claim(task.id);

			// Assert
			const after = new Date().toISOString();
			expect(claimed.execution?.startedAt).toBeDefined();
			expect(claimed.execution!.startedAt! >= before).toBe(true);
			expect(claimed.execution!.startedAt! <= after).toBe(true);
		});

		it("should update execution.completedAt on complete", () => {
			// Arrange
			const task = store.create({ title: "Test Task" });
			store.claim(task.id);
			const before = new Date().toISOString();

			// Act
			const completed = store.complete(task.id);

			// Assert
			const after = new Date().toISOString();
			expect(completed.execution?.completedAt).toBeDefined();
			expect(completed.execution!.completedAt! >= before).toBe(true);
			expect(completed.execution!.completedAt! <= after).toBe(true);
		});
	});
});
