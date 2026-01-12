import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAuditLog } from "./AuditLog.js";
import { recoverOrphanedTasks } from "./CrashRecovery.js";
import { TaskStore } from "./TaskStore.js";

describe("CrashRecovery", () => {
	let tempDir: string;
	let store: TaskStore;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "crash-recovery-test-"));
		store = new TaskStore(tempDir);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("recoverOrphanedTasks", () => {
		it("finds doing tasks and resets to todo", async () => {
			// Arrange - create orphaned tasks (doing status without active agent)
			const task1 = store.create({ title: "Orphaned Task 1" });
			const task2 = store.create({ title: "Orphaned Task 2" });
			store.claim(task1.id);
			store.claim(task2.id);
			await store.flush();
			// Now both are in 'doing' status - simulate crash by creating new store
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Act
			const result = await recoverOrphanedTasks(newStore);

			// Assert
			expect(result.recoveredCount).toBe(2);
			expect(result.recoveredIds).toContain(task1.id);
			expect(result.recoveredIds).toContain(task2.id);
			expect(newStore.get(task1.id)?.status).toBe("todo");
			expect(newStore.get(task2.id)?.status).toBe("todo");
		});

		it("returns empty result when no orphaned tasks", async () => {
			// Arrange
			store.create({ title: "Todo Task" });
			await store.flush();
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Act
			const result = await recoverOrphanedTasks(newStore);

			// Assert
			expect(result.recoveredCount).toBe(0);
			expect(result.recoveredIds).toEqual([]);
		});

		it("increments retryCount in execution", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Act
			await recoverOrphanedTasks(newStore);

			// Assert
			const recovered = newStore.get(task.id);
			expect(recovered?.execution?.retryCount).toBe(1);
		});

		it("logs crash_recovery event to audit", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();
			const newStore = new TaskStore(tempDir);
			await newStore.load();

			// Act
			await recoverOrphanedTasks(newStore);
			await newStore.flush();

			// Assert
			const entries = readAuditLog(tempDir, task.id);
			const recoveryEntry = entries.find((e) => e.type === "crash_recovery");
			expect(recoveryEntry).toBeDefined();
			expect(recoveryEntry?.action).toBe("reset_to_todo");
		});

		it("accumulates retryCount across multiple crashes", async () => {
			// Arrange - first crash
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();

			let currentStore = new TaskStore(tempDir);
			await currentStore.load();
			await recoverOrphanedTasks(currentStore);

			// Simulate another claim and crash
			currentStore.claim(task.id);
			await currentStore.flush();

			currentStore = new TaskStore(tempDir);
			await currentStore.load();

			// Act - second crash
			await recoverOrphanedTasks(currentStore);

			// Assert
			const recovered = currentStore.get(task.id);
			expect(recovered?.execution?.retryCount).toBe(2);
		});
	});
});
