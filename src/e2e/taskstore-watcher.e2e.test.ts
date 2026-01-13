import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore File Watcher", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-watcher-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("external file edit triggers reload and updates in-memory state", async () => {
		// Arrange - create store with initial task
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Initial Task" });
		await store.flush();

		// Start watching
		await store.watch();

		let changeEmitted = false;
		store.on("change", () => {
			changeEmitted = true;
		});

		// Act - simulate external edit by writing directly to file
		const filePath = join(tempDir, ".chorus", "tasks.jsonl");
		const updatedTask = {
			id: task.id,
			title: "Externally Updated Task",
			status: "todo",
			type: "task",
			tags: [],
			dependencies: [],
			created_at: task.createdAt,
			updated_at: new Date().toISOString(),
			review_count: 0,
			learnings_count: 0,
			has_learnings: false,
			version: 1,
		};
		writeFileSync(filePath, `${JSON.stringify(updatedTask)}\n`);

		// Wait for watcher + debounce
		// Use longer timeout for parallel test runs where system load varies
		await new Promise((r) => setTimeout(r, 1000));

		// Assert - in-memory state should reflect external change
		const reloaded = store.get(task.id);
		expect(changeEmitted).toBe(true);
		expect(reloaded?.title).toBe("Externally Updated Task");

		// Cleanup
		store.stop();
	});

	it("new tasks from external edit are available via get()", async () => {
		// Arrange - create store with one task
		const store = new TaskStore(tempDir);
		store.create({ title: "Original Task" });
		await store.flush();
		await store.load(); // Ensure store is fully initialized

		// Start watching
		await store.watch();

		let changeEmitted = false;
		let tasksAfterChange: ReturnType<typeof store.list> = [];
		store.on("change", (tasks) => {
			changeEmitted = true;
			tasksAfterChange = tasks;
		});

		// Act - add new task externally
		const filePath = join(tempDir, ".chorus", "tasks.jsonl");
		const newTask = {
			id: "ch-external",
			title: "Externally Added Task",
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
		// Append to existing file (read current content first)
		const { readFileSync } = await import("node:fs");
		const currentContent = readFileSync(filePath, "utf-8");
		writeFileSync(filePath, `${currentContent}${JSON.stringify(newTask)}\n`);

		// Wait for watcher + debounce with retry
		// Use longer timeout and initial delay for parallel test runs
		await new Promise((r) => setTimeout(r, 500)); // Initial delay for watcher to settle
		const maxRetries = 30;
		for (let i = 0; i < maxRetries && !changeEmitted; i++) {
			await new Promise((r) => setTimeout(r, 200));
		}

		// Assert - new task should be accessible
		expect(changeEmitted).toBe(true);
		const externalTask = store.get("ch-external");
		expect(externalTask).toBeDefined();
		expect(externalTask?.title).toBe("Externally Added Task");
		expect(tasksAfterChange.length).toBe(2);

		// Cleanup
		store.stop();
	});
});
