import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAuditLog } from "./AuditLog.js";
import { getRecoveryContext, recoverOrphanedTasks } from "./CrashRecovery.js";
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

	describe("getRecoveryContext", () => {
		it("returns undefined if no previous attempts (retryCount = 0)", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			await store.flush();

			// Act
			const context = getRecoveryContext(task.id, store, tempDir);

			// Assert
			expect(context).toBeUndefined();
		});

		it("returns RecoveryContext when retryCount > 0", async () => {
			// Arrange - simulate a crash/recovery
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();

			const newStore = new TaskStore(tempDir);
			await newStore.load();
			await recoverOrphanedTasks(newStore);
			await newStore.flush();

			// Act
			const context = getRecoveryContext(task.id, newStore, tempDir);

			// Assert
			expect(context).toBeDefined();
			expect(context?.retryCount).toBe(1);
			expect(context?.message).toContain("retry");
		});

		it("reads audit log for context", async () => {
			// Arrange - simulate crash with audit entries
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			store.audit(task.id, { type: "progress", percentage: 50 });
			await store.flush();

			const newStore = new TaskStore(tempDir);
			await newStore.load();
			await recoverOrphanedTasks(newStore);
			await newStore.flush();

			// Act
			const context = getRecoveryContext(task.id, newStore, tempDir);

			// Assert - should have audit entries in context
			expect(context?.auditEntries).toBeDefined();
			expect(context?.auditEntries?.length).toBeGreaterThan(0);
		});

		it("checks worktree for uncommitted changes", async () => {
			// Arrange - create worktree directory with mock changes
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();

			// Create worktree directory
			const worktreeDir = join(tempDir, ".worktrees", `claude-${task.id}`);
			mkdirSync(worktreeDir, { recursive: true });
			writeFileSync(join(worktreeDir, "changed.txt"), "modified content");

			const newStore = new TaskStore(tempDir);
			await newStore.load();
			await recoverOrphanedTasks(newStore);
			await newStore.flush();

			// Act
			const context = getRecoveryContext(task.id, newStore, tempDir);

			// Assert
			expect(context?.hasWorktreeChanges).toBe(true);
		});

		it("returns instruction message for agent", async () => {
			// Arrange
			const task = store.create({ title: "Task" });
			store.claim(task.id);
			await store.flush();

			const newStore = new TaskStore(tempDir);
			await newStore.load();
			await recoverOrphanedTasks(newStore);
			await newStore.flush();

			// Act
			const context = getRecoveryContext(task.id, newStore, tempDir);

			// Assert
			expect(context?.message).toBeDefined();
			expect(context?.message).toContain("1");
			expect(context?.message.length).toBeGreaterThan(0);
		});
	});
});
