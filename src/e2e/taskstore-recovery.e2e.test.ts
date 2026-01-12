import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAuditLog } from "../services/AuditLog.js";
import {
	getRecoveryContext,
	recoverOrphanedTasks,
} from "../services/CrashRecovery.js";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Recovery", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-recovery-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("orphaned doing task is reset to todo on startup", async () => {
		// Arrange - create store and claim a task
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Orphaned Task" });
		store1.claim(task.id);
		await store1.flush();

		// Simulate crash by creating new store
		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Act - recover orphaned tasks
		await recoverOrphanedTasks(store2);

		// Assert
		expect(store2.get(task.id)?.status).toBe("todo");
	});

	it("multiple orphaned tasks are all recovered", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task1 = store1.create({ title: "Orphaned 1" });
		const task2 = store1.create({ title: "Orphaned 2" });
		const task3 = store1.create({ title: "Orphaned 3" });
		store1.claim(task1.id);
		store1.claim(task2.id);
		store1.claim(task3.id);
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Act
		const result = await recoverOrphanedTasks(store2);

		// Assert
		expect(result.recoveredCount).toBe(3);
		expect(store2.get(task1.id)?.status).toBe("todo");
		expect(store2.get(task2.id)?.status).toBe("todo");
		expect(store2.get(task3.id)?.status).toBe("todo");
	});

	it("retryCount is incremented correctly", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Act
		await recoverOrphanedTasks(store2);

		// Assert
		expect(store2.get(task.id)?.execution?.retryCount).toBe(1);
	});

	it("crash_recovery event is logged to audit", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();

		// Act
		await recoverOrphanedTasks(store2);
		await store2.flush();

		// Assert
		const entries = readAuditLog(tempDir, task.id);
		const recoveryEntry = entries.find((e) => e.type === "crash_recovery");
		expect(recoveryEntry).toBeDefined();
		expect(recoveryEntry?.action).toBe("reset_to_todo");
	});

	it("recovery context includes audit log content", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		store1.audit(task.id, { type: "progress", percentage: 50 });
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();
		await recoverOrphanedTasks(store2);
		await store2.flush();

		// Act
		const context = getRecoveryContext(task.id, store2, tempDir);

		// Assert
		expect(context?.auditEntries).toBeDefined();
		expect(context?.auditEntries?.length).toBeGreaterThan(0);
		// Should contain the progress entry
		const progressEntry = context?.auditEntries?.find(
			(e) => e.type === "progress",
		);
		expect(progressEntry).toBeDefined();
	});

	it("recovery context detects worktree with uncommitted changes", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		await store1.flush();

		// Create worktree directory with files
		const worktreeDir = join(tempDir, ".worktrees", `claude-${task.id}`);
		mkdirSync(worktreeDir, { recursive: true });
		writeFileSync(join(worktreeDir, "modified.txt"), "uncommitted changes");

		const store2 = new TaskStore(tempDir);
		await store2.load();
		await recoverOrphanedTasks(store2);
		await store2.flush();

		// Act
		const context = getRecoveryContext(task.id, store2, tempDir);

		// Assert
		expect(context?.hasWorktreeChanges).toBe(true);
	});

	it("recovery context has correct instruction message", async () => {
		// Arrange
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();
		await recoverOrphanedTasks(store2);
		await store2.flush();

		// Act
		const context = getRecoveryContext(task.id, store2, tempDir);

		// Assert
		expect(context?.message).toContain("retry #1");
		expect(context?.message).toContain("crashed or failed");
	});

	it("task without previous attempts returns no recovery context", async () => {
		// Arrange - fresh task with no crashes
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Fresh Task" });
		await store.flush();

		// Act
		const context = getRecoveryContext(task.id, store, tempDir);

		// Assert
		expect(context).toBeUndefined();
	});

	it("second crash increments retryCount to 2", async () => {
		// Arrange - first crash
		const store1 = new TaskStore(tempDir);
		const task = store1.create({ title: "Task" });
		store1.claim(task.id);
		await store1.flush();

		const store2 = new TaskStore(tempDir);
		await store2.load();
		await recoverOrphanedTasks(store2);

		// Claim again and simulate second crash
		store2.claim(task.id);
		await store2.flush();

		const store3 = new TaskStore(tempDir);
		await store3.load();

		// Act - second recovery
		await recoverOrphanedTasks(store3);

		// Assert
		expect(store3.get(task.id)?.execution?.retryCount).toBe(2);
	});
});
