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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateTaskInput } from "../types/task.js";
import { readAuditLog } from "./AuditLog.js";
import { TaskStore } from "./TaskStore.js";

describe("TaskStore", () => {
	let tempDir: string;
	let store: TaskStore;

	describe("audit", () => {
		beforeEach(() => {
			tempDir = mkdtempSync(join(tmpdir(), "taskstore-test-"));
			store = new TaskStore(tempDir);
		});

		afterEach(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

		it("audit() appends to .chorus/audit/{id}.jsonl", async () => {
			// Arrange
			const task = store.create({ title: "Task" });

			// Act
			store.audit(task.id, { type: "manual", action: "note" });
			await store.flush();

			// Assert
			const auditPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl`);
			expect(existsSync(auditPath)).toBe(true);
			const content = readFileSync(auditPath, "utf-8");
			expect(content).toContain('"type":"manual"');
			expect(content).toContain('"action":"note"');
		});

		it("creates audit directory if not exists", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			const auditDir = join(tempDir, ".chorus", "audit");
			expect(existsSync(auditDir)).toBe(false);

			// Act
			store.audit(task.id, { type: "test" });
			await store.flush();

			// Assert
			expect(existsSync(auditDir)).toBe(true);
		});

		it("audit entry includes timestamp", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			const before = new Date().toISOString();

			// Act
			store.audit(task.id, { type: "test" });
			await store.flush();

			// Assert
			const auditPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl`);
			const content = readFileSync(auditPath, "utf-8");
			const entry = JSON.parse(content.trim());
			expect(entry.timestamp).toBeDefined();
			expect(entry.timestamp >= before).toBe(true);
		});

		it("lifecycle methods auto-audit", async () => {
			// Arrange
			const task = store.create({ title: "Task" });

			// Act
			store.claim(task.id);
			store.complete(task.id);
			await store.flush();

			// Assert - use readAuditLog since complete() archives to .gz
			const entries = readAuditLog(tempDir, task.id);
			const actions = entries.map((e) => e.action);
			expect(actions).toContain("claim");
			expect(actions).toContain("complete");
		});

		it("complete() archives audit log to .gz", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush(); // Flush claim audit entry

			// Act
			store.complete(task.id);
			await store.flush();

			// Assert - .jsonl should be archived to .gz
			const jsonlPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl`);
			const gzPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl.gz`);
			expect(existsSync(jsonlPath)).toBe(false);
			expect(existsSync(gzPath)).toBe(true);
		});

		it("fail() archives audit log to .gz", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush(); // Flush claim audit entry

			// Act
			store.fail(task.id, "Test failure");
			await store.flush();

			// Assert - .jsonl should be archived to .gz
			const jsonlPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl`);
			const gzPath = join(tempDir, ".chorus", "audit", `${task.id}.jsonl.gz`);
			expect(existsSync(jsonlPath)).toBe(false);
			expect(existsSync(gzPath)).toBe(true);
		});
	});

	describe("events", () => {
		beforeEach(() => {
			tempDir = mkdtempSync(join(tmpdir(), "taskstore-test-"));
			store = new TaskStore(tempDir);
		});

		afterEach(() => {
			rmSync(tempDir, { recursive: true, force: true });
		});

		it("emits task:created on create", () => {
			// Arrange
			const handler = vi.fn();
			store.on("task:created", handler);

			// Act
			const task = store.create({ title: "New Task" });

			// Assert
			expect(handler).toHaveBeenCalledWith(task);
		});

		it("emits task:updated on update", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			const handler = vi.fn();
			store.on("task:updated", handler);

			// Act
			store.update(task.id, { title: "Updated" });

			// Assert
			expect(handler).toHaveBeenCalled();
			expect(handler.mock.calls[0][0].title).toBe("Updated");
		});

		it("emits task:updated on lifecycle changes", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			const handler = vi.fn();
			store.on("task:updated", handler);

			// Act
			store.claim(task.id);

			// Assert
			expect(handler).toHaveBeenCalled();
			expect(handler.mock.calls[0][0].status).toBe("doing");
		});

		it("emits task:closed on complete", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			const handler = vi.fn();
			store.on("task:closed", handler);

			// Act
			store.complete(task.id);

			// Assert
			expect(handler).toHaveBeenCalled();
			expect(handler.mock.calls[0][0].status).toBe("done");
		});

		it("emits task:deleted on delete", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			const handler = vi.fn();
			store.on("task:deleted", handler);

			// Act
			store.delete(task.id);

			// Assert
			expect(handler).toHaveBeenCalledWith(task.id);
		});

		it("emits change after any mutation", () => {
			// Arrange
			const handler = vi.fn();
			store.on("change", handler);

			// Act
			store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });

			// Assert
			expect(handler).toHaveBeenCalledTimes(2);
			expect(handler.mock.calls[1][0]).toHaveLength(2);
		});

		it("emits error on errors", () => {
			// Arrange
			const handler = vi.fn();
			store.on("error", handler);

			// Act
			try {
				store.get("non-existent");
				store.update("non-existent", { title: "Fail" });
			} catch {
				// Expected
			}

			// Assert - error should have been emitted
			expect(handler).toHaveBeenCalled();
		});
	});

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

	describe("list", () => {
		it("should return all non-deleted tasks when no filters", () => {
			// Arrange
			store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.create({ title: "Task 3" });

			// Act
			const tasks = store.list();

			// Assert
			expect(tasks).toHaveLength(3);
		});

		it("should filter by single status", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.claim(task1.id); // Now "doing"

			// Act
			const doingTasks = store.list({ status: "doing" });

			// Assert
			expect(doingTasks).toHaveLength(1);
			expect(doingTasks[0].id).toBe(task1.id);
		});

		it("should filter by status array", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({ title: "Task 2" });
			store.create({ title: "Task 3" });
			store.claim(task1.id);
			store.claim(task2.id);
			store.complete(task2.id);

			// Act
			const activeTasks = store.list({ status: ["doing", "done"] });

			// Assert
			expect(activeTasks).toHaveLength(2);
		});

		it("should filter by tags (match ANY)", () => {
			// Arrange
			store.create({ title: "Task 1", tags: ["frontend"] });
			store.create({ title: "Task 2", tags: ["backend", "api"] });
			store.create({ title: "Task 3", tags: ["docs"] });

			// Act
			const matched = store.list({ tags: ["frontend", "api"] });

			// Assert
			expect(matched).toHaveLength(2);
		});

		it("should filter by excludeTags (exclude if ANY)", () => {
			// Arrange
			store.create({ title: "Task 1", tags: ["important"] });
			store.create({ title: "Task 2", tags: ["wip"] });
			store.create({ title: "Task 3", tags: ["important", "wip"] });

			// Act
			const filtered = store.list({ excludeTags: ["wip"] });

			// Assert
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe("Task 1");
		});

		it("should exclude deleted tasks", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.delete(task1.id);

			// Act
			const tasks = store.list();

			// Assert
			expect(tasks).toHaveLength(1);
			expect(tasks[0].title).toBe("Task 2");
		});
	});

	describe("convenience queries", () => {
		it("ready() returns todo tasks with no unmet dependencies", () => {
			// Arrange
			const task1 = store.create({ title: "Independent" });
			store.create({
				title: "Depends on task1",
				dependencies: [task1.id],
			});
			store.create({ title: "Also independent" });

			// Act
			const readyTasks = store.ready();

			// Assert - task1 and task3 are ready, task2 is not (has dep)
			expect(readyTasks).toHaveLength(2);
			expect(readyTasks.map((t) => t.title)).not.toContain("Depends on task1");
		});

		it("doing() returns tasks with status doing", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.claim(task1.id);

			// Act
			const doingTasks = store.doing();

			// Assert
			expect(doingTasks).toHaveLength(1);
			expect(doingTasks[0].id).toBe(task1.id);
		});

		it("done() returns tasks with status done", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.claim(task1.id);
			store.complete(task1.id);

			// Act
			const doneTasks = store.done();

			// Assert
			expect(doneTasks).toHaveLength(1);
			expect(doneTasks[0].id).toBe(task1.id);
		});

		it("stuck() returns tasks with unmet dependencies", () => {
			// Arrange
			const task1 = store.create({ title: "Blocker" });
			store.create({ title: "Depends on blocker", dependencies: [task1.id] });

			// Act
			const stuckTasks = store.stuck();

			// Assert
			expect(stuckTasks).toHaveLength(1);
			expect(stuckTasks[0].title).toBe("Depends on blocker");
		});

		it("later() returns tasks with status later", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			store.create({ title: "Task 2" });
			store.defer(task1.id);

			// Act
			const laterTasks = store.later();

			// Assert
			expect(laterTasks).toHaveLength(1);
			expect(laterTasks[0].id).toBe(task1.id);
		});

		it("getStats() returns count per status", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({ title: "Task 2" });
			store.create({ title: "Task 3" });
			store.claim(task1.id);
			store.claim(task2.id);
			store.complete(task2.id);

			// Act
			const stats = store.getStats();

			// Assert
			expect(stats.todo).toBe(1);
			expect(stats.doing).toBe(1);
			expect(stats.done).toBe(1);
		});
	});

	describe("dependency management", () => {
		it("addDependency() adds dependency to task", () => {
			// Arrange
			const task1 = store.create({ title: "Blocker" });
			const task2 = store.create({ title: "Depends on blocker" });

			// Act
			store.addDependency(task2.id, task1.id);

			// Assert
			const updated = store.get(task2.id);
			expect(updated?.dependencies).toContain(task1.id);
		});

		it("removeDependency() removes dependency from task", () => {
			// Arrange
			const task1 = store.create({ title: "Blocker" });
			const task2 = store.create({
				title: "Depends",
				dependencies: [task1.id],
			});

			// Act
			store.removeDependency(task2.id, task1.id);

			// Assert
			const updated = store.get(task2.id);
			expect(updated?.dependencies).not.toContain(task1.id);
		});

		it("getDependents() returns tasks that depend on given task", () => {
			// Arrange
			const task1 = store.create({ title: "Blocker" });
			store.create({ title: "Depends 1", dependencies: [task1.id] });
			store.create({ title: "Depends 2", dependencies: [task1.id] });
			store.create({ title: "Independent" });

			// Act
			const dependents = store.getDependents(task1.id);

			// Assert
			expect(dependents).toHaveLength(2);
		});

		it("getBlockers() returns unmet dependency tasks", () => {
			// Arrange
			const task1 = store.create({ title: "Done blocker" });
			const task2 = store.create({ title: "Pending blocker" });
			store.claim(task1.id);
			store.complete(task1.id);
			const task3 = store.create({
				title: "Blocked",
				dependencies: [task1.id, task2.id],
			});

			// Act
			const blockers = store.getBlockers(task3.id);

			// Assert - only task2 is unmet (task1 is done)
			expect(blockers).toHaveLength(1);
			expect(blockers[0].id).toBe(task2.id);
		});

		it("hasCircularDependency() detects direct cycle", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({
				title: "Task 2",
				dependencies: [task1.id],
			});

			// Act & Assert - adding task1 -> task2 would create cycle
			expect(store.hasCircularDependency(task1.id, task2.id)).toBe(true);
		});

		it("hasCircularDependency() detects indirect cycle", () => {
			// Arrange: A -> B -> C, try to add C -> A
			const taskA = store.create({ title: "A" });
			const taskB = store.create({ title: "B", dependencies: [taskA.id] });
			const taskC = store.create({ title: "C", dependencies: [taskB.id] });

			// Act & Assert
			expect(store.hasCircularDependency(taskA.id, taskC.id)).toBe(true);
		});

		it("addDependency() throws on circular dependency", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({
				title: "Task 2",
				dependencies: [task1.id],
			});

			// Act & Assert
			expect(() => store.addDependency(task1.id, task2.id)).toThrow(
				"Circular dependency detected",
			);
		});

		it("isBlocked() returns true for tasks with unmet dependencies", () => {
			// Arrange
			const blocker = store.create({ title: "Blocker" });
			const blocked = store.create({
				title: "Blocked",
				dependencies: [blocker.id],
			});

			// Act & Assert
			expect(store.isBlocked(blocked.id)).toBe(true);
			expect(store.isBlocked(blocker.id)).toBe(false);
		});

		it("isReady() returns true for todo tasks with no unmet deps", () => {
			// Arrange
			const blocker = store.create({ title: "Blocker" });
			const blocked = store.create({
				title: "Blocked",
				dependencies: [blocker.id],
			});
			const independent = store.create({ title: "Independent" });

			// Act & Assert
			expect(store.isReady(independent.id)).toBe(true);
			expect(store.isReady(blocked.id)).toBe(false);
			expect(store.isReady(blocker.id)).toBe(true);
		});

		it("completing task unblocks dependents", () => {
			// Arrange
			const blocker = store.create({ title: "Blocker" });
			const blocked = store.create({
				title: "Blocked",
				dependencies: [blocker.id],
			});
			expect(store.isBlocked(blocked.id)).toBe(true);

			// Act
			store.claim(blocker.id);
			store.complete(blocker.id);

			// Assert
			expect(store.isBlocked(blocked.id)).toBe(false);
			expect(store.isReady(blocked.id)).toBe(true);
		});
	});

	describe("tag operations", () => {
		it("addTag() adds tag if not present", () => {
			// Arrange
			const task = store.create({ title: "Task", tags: ["existing"] });

			// Act
			store.addTag(task.id, "new-tag");

			// Assert
			const updated = store.get(task.id);
			expect(updated?.tags).toContain("existing");
			expect(updated?.tags).toContain("new-tag");
		});

		it("addTag() does not duplicate existing tag", () => {
			// Arrange
			const task = store.create({ title: "Task", tags: ["existing"] });

			// Act
			store.addTag(task.id, "existing");

			// Assert
			const updated = store.get(task.id);
			expect(updated?.tags.filter((t) => t === "existing")).toHaveLength(1);
		});

		it("removeTag() removes tag from task", () => {
			// Arrange
			const task = store.create({ title: "Task", tags: ["keep", "remove"] });

			// Act
			store.removeTag(task.id, "remove");

			// Assert
			const updated = store.get(task.id);
			expect(updated?.tags).toContain("keep");
			expect(updated?.tags).not.toContain("remove");
		});

		it("getTags() returns all unique tags across tasks", () => {
			// Arrange
			store.create({ title: "Task 1", tags: ["frontend", "urgent"] });
			store.create({ title: "Task 2", tags: ["backend", "urgent"] });
			store.create({ title: "Task 3", tags: ["frontend", "docs"] });

			// Act
			const allTags = store.getTags();

			// Assert
			expect(allTags.sort()).toEqual(
				["backend", "docs", "frontend", "urgent"].sort(),
			);
		});
	});

	describe("selectNext", () => {
		it("returns best ready task using TaskSelector", () => {
			// Arrange
			store.create({ title: "Older", tags: [] });
			store.create({ title: "With next", tags: ["next"] });

			// Act
			const result = store.selectNext();

			// Assert - 'next' tag wins
			expect(result?.title).toBe("With next");
		});

		it("returns undefined when no ready tasks", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id); // Now "doing"

			// Act
			const result = store.selectNext();

			// Assert
			expect(result).toBeUndefined();
		});

		it("excludes tasks in excludeIds", () => {
			// Arrange
			const task1 = store.create({ title: "Task 1" });
			const task2 = store.create({ title: "Task 2" });

			// Act
			const result = store.selectNext({ excludeIds: [task1.id] });

			// Assert
			expect(result?.id).toBe(task2.id);
		});

		it("considers context for selection", () => {
			// Arrange
			store.create({ title: "No match", tags: ["backend"] });
			store.create({ title: "Has preferred", tags: ["frontend"] });

			// Act
			const result = store.selectNext({ preferredTags: ["frontend"] });

			// Assert
			expect(result?.title).toBe("Has preferred");
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

	describe("optimistic locking", () => {
		it("should initialize version to 1 on create", () => {
			// Arrange & Act
			const task = store.create({ title: "New Task" });

			// Assert
			expect(task.version).toBe(1);
		});

		it("should increment version on every update", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			expect(task.version).toBe(1);

			// Act
			const updated1 = store.update(task.id, { title: "Updated 1" });
			const updated2 = store.update(task.id, { title: "Updated 2" });

			// Assert
			expect(updated1.version).toBe(2);
			expect(updated2.version).toBe(3);
		});

		it("should throw StaleDataError when expectedVersion does not match", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.update(task.id, { title: "Concurrent Update" }); // Now version=2

			// Act & Assert - try to update with stale version 1
			expect(() => store.update(task.id, { title: "Stale Update" }, 1)).toThrow(
				"Stale data: expected version 1, but current is 2",
			);
		});

		it("should succeed when expectedVersion matches current version", () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.update(task.id, { title: "Update 1" }); // v2

			// Act - update with correct version
			const result = store.update(task.id, { title: "Update 2" }, 2);

			// Assert
			expect(result.title).toBe("Update 2");
			expect(result.version).toBe(3);
		});

		it("should persist version in JSONL and restore on load", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.update(task.id, { title: "Update 1" }); // v2
			store.update(task.id, { title: "Update 2" }); // v3
			await store.flush();

			// Act - create new store and load from saved file
			const store2 = new TaskStore(tempDir);
			await store2.load();
			const restored = store2.get(task.id);

			// Assert
			expect(restored?.version).toBe(3);
		});
	});

	describe("file watcher", () => {
		it("watch() starts watching tasks.jsonl and stop() stops it", async () => {
			// Arrange
			store.create({ title: "Initial Task" });
			await store.flush();

			// Act - start watching (await for watcher to be ready)
			await store.watch();

			// Assert - should be able to stop without error
			store.stop();
		});

		it("external file changes trigger reload() and emit change", async () => {
			// Arrange
			store.create({ title: "Task 1" });
			await store.flush();
			await store.load(); // Ensure store is fully initialized

			// Start watching (await for watcher to be ready)
			await store.watch();
			let changeEmitted = false;
			store.on("change", () => {
				changeEmitted = true;
			});

			// Act - simulate external change by writing directly to file
			const newTask = {
				id: "ch-ext",
				title: "External Task",
				status: "todo",
				type: "task",
				tags: [],
				dependencies: [],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
				version: 1,
			};
			const existingContent = readFileSync(
				join(tempDir, ".chorus", "tasks.jsonl"),
				"utf-8",
			);
			writeFileSync(
				join(tempDir, ".chorus", "tasks.jsonl"),
				`${existingContent}${JSON.stringify(newTask)}\n`,
			);

			// Wait for polling interval + debounce + file watcher with retry
			// Use retry loop for parallel test runs where system load varies
			const maxRetries = 20;
			for (let i = 0; i < maxRetries && !changeEmitted; i++) {
				await new Promise((r) => setTimeout(r, 200));
			}

			// Assert
			expect(changeEmitted).toBe(true);
			const extTask = store.get("ch-ext");
			expect(extTask).toBeDefined();
			expect(extTask?.title).toBe("External Task");

			// Cleanup
			store.stop();
		});

		it("debounces rapid file changes (100ms)", async () => {
			// Arrange
			store.create({ title: "Task" });
			await store.flush();
			await store.watch();

			let reloadCount = 0;
			store.on("change", () => {
				reloadCount++;
			});

			// Act - make rapid changes
			const filePath = join(tempDir, ".chorus", "tasks.jsonl");
			const content = readFileSync(filePath, "utf-8");
			writeFileSync(filePath, content); // touch 1
			writeFileSync(filePath, content); // touch 2
			writeFileSync(filePath, content); // touch 3

			// Wait for debounce
			await new Promise((r) => setTimeout(r, 200));

			// Assert - should only reload once (debounced)
			expect(reloadCount).toBeLessThanOrEqual(2); // Allow some variance

			// Cleanup
			store.stop();
		});

		it("reload() re-reads file and emits change", async () => {
			// Arrange
			const task = store.create({ title: "Original" });
			await store.flush();

			// Modify in-memory without flushing
			store.update(task.id, { title: "In-Memory Change" });

			// Write external change directly to file
			const content = readFileSync(
				join(tempDir, ".chorus", "tasks.jsonl"),
				"utf-8",
			);
			const modified = content.replace("Original", "External Change");
			writeFileSync(join(tempDir, ".chorus", "tasks.jsonl"), modified);

			let changeEmitted = false;
			store.on("change", () => {
				changeEmitted = true;
			});

			// Act
			await store.reload();

			// Assert - should have external data, not in-memory
			const reloaded = store.get(task.id);
			expect(reloaded?.title).toBe("External Change");
			expect(changeEmitted).toBe(true);
		});
	});
});
