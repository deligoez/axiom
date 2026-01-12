import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "./TaskStore.js";
import { TaskStoreAdapter } from "./TaskStoreAdapter.js";

describe("TaskStoreAdapter", () => {
	let tempDir: string;
	let store: TaskStore;
	let adapter: TaskStoreAdapter;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-adapter-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		store = new TaskStore(tempDir);
		adapter = new TaskStoreAdapter(store);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("claimTask() calls store.claim()", async () => {
		// Arrange
		const task = store.create({ title: "Test Task" });

		// Act
		await adapter.claimTask(task.id, "agent-1");

		// Assert
		expect(store.get(task.id)?.status).toBe("doing");
	});

	it("getReadyTasks() calls store.ready()", async () => {
		// Arrange
		store.create({ title: "Task 1" });
		store.create({ title: "Task 2" });

		// Act
		const readyTasks = await adapter.getReadyTasks();

		// Assert
		expect(readyTasks).toHaveLength(2);
	});

	it("closeTask() calls store.complete()", async () => {
		// Arrange
		const task = store.create({ title: "Test Task" });
		store.claim(task.id);

		// Act
		await adapter.closeTask(task.id);

		// Assert
		expect(store.get(task.id)?.status).toBe("done");
	});

	it("maps Task to Bead type correctly", async () => {
		// Arrange
		const task = store.create({
			title: "Feature Task",
			description: "Description here",
			tags: ["m1-milestone"],
			dependencies: [],
		});

		// Act
		const bead = await adapter.getTask(task.id);

		// Assert
		expect(bead).toBeDefined();
		expect(bead?.id).toBe(task.id);
		expect(bead?.title).toBe("Feature Task");
		expect(bead?.description).toBe("Description here");
		expect(bead?.labels).toContain("m1-milestone");
	});

	it("maps Bead to Task type for create", async () => {
		// Arrange & Act
		const id = await adapter.createTask("New Bead Task", {
			priority: 1,
			labels: ["test-label"],
		});

		// Assert
		const task = store.get(id);
		expect(task).toBeDefined();
		expect(task?.title).toBe("New Bead Task");
		expect(task?.tags).toContain("test-label");
	});
});
