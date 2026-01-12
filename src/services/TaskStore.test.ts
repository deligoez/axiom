import { mkdtempSync, rmSync } from "node:fs";
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
});
