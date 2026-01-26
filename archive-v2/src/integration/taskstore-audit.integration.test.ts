/**
 * INT-19: TaskStore Audit System Test
 *
 * Integration tests for TaskStore audit logging and archival system.
 * Run with: npm run test:integration
 *
 * NOTE: This test does NOT use Claude CLI - tests pure file I/O.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAuditLog } from "../services/AuditLog.js";
import { TaskStore } from "../services/TaskStore.js";

let tmpDir = "";

describe("INT-19: TaskStore Audit System", () => {
	beforeEach(() => {
		// Create isolated temp directory for each test
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-audit-"));
		// Create .chorus directory
		mkdirSync(join(tmpDir, ".chorus"), { recursive: true });
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("writes audit entry on claim", async () => {
		// Arrange: Create task
		const store = new TaskStore(tmpDir);
		const task = store.create({ title: "Test Task" });
		await store.flush();

		// Act: store.claim(taskId)
		store.claim(task.id);
		await store.flush();

		// Assert: .chorus/audit/{taskId}.jsonl exists with claim entry
		const auditPath = join(tmpDir, ".chorus", "audit", `${task.id}.jsonl`);
		expect(existsSync(auditPath)).toBe(true);

		const entries = readAuditLog(tmpDir, task.id);
		expect(entries.length).toBeGreaterThanOrEqual(1);
		const claimEntry = entries.find((e) => e.action === "claim");
		expect(claimEntry).toBeDefined();
		expect(claimEntry?.type).toBe("lifecycle");
		expect(claimEntry?.timestamp).toBeDefined();
	});

	it("accumulates multiple audit entries", async () => {
		// Arrange: Create and claim task
		const store = new TaskStore(tmpDir);
		const task = store.create({ title: "Test Task" });
		await store.flush();

		// Act: claim → release → claim → complete
		store.claim(task.id);
		await store.flush();

		store.release(task.id);
		await store.flush();

		store.claim(task.id);
		await store.flush();

		store.complete(task.id);
		await store.flush();

		// Assert: Contains 4 timestamped entries
		const entries = readAuditLog(tmpDir, task.id);
		expect(entries.length).toBe(4);

		// Verify entry types
		const actions = entries.map((e) => e.action);
		expect(actions).toContain("claim");
		expect(actions).toContain("release");
		expect(actions).toContain("complete");

		// All entries have timestamps
		for (const entry of entries) {
			expect(entry.timestamp).toBeDefined();
			expect(typeof entry.timestamp).toBe("string");
		}
	});

	it("archives to .gz on task completion", async () => {
		// Arrange: Task with audit entries
		const store = new TaskStore(tmpDir);
		const task = store.create({ title: "Test Task" });
		await store.flush();

		store.claim(task.id);
		await store.flush();

		const jsonlPath = join(tmpDir, ".chorus", "audit", `${task.id}.jsonl`);
		expect(existsSync(jsonlPath)).toBe(true);

		// Act: store.complete(taskId)
		store.complete(task.id);
		await store.flush();

		// Assert: .jsonl.gz created, .jsonl deleted
		const gzPath = join(tmpDir, ".chorus", "audit", `${task.id}.jsonl.gz`);
		expect(existsSync(gzPath)).toBe(true);
		expect(existsSync(jsonlPath)).toBe(false);

		// Verify content is readable from .gz
		const entries = readAuditLog(tmpDir, task.id);
		expect(entries.length).toBe(2); // claim + complete
	});

	it("audit buffer flushes with tasks", async () => {
		// Arrange: Create and claim task without explicit audit flush
		const store = new TaskStore(tmpDir);
		const task = store.create({ title: "Test Task" });

		// Act: Claim and flush (audit writes during flush)
		store.claim(task.id);
		await store.flush();

		// Assert: Audit file exists (buffer was flushed during flush())
		const auditPath = join(tmpDir, ".chorus", "audit", `${task.id}.jsonl`);
		expect(existsSync(auditPath)).toBe(true);

		const entries = readAuditLog(tmpDir, task.id);
		expect(entries.length).toBe(1);
		expect(entries[0].action).toBe("claim");
	});

	it("fail() records error reason in audit", async () => {
		// Arrange: Claimed task
		const store = new TaskStore(tmpDir);
		const task = store.create({ title: "Test Task" });
		await store.flush();

		store.claim(task.id);
		await store.flush();

		// Act: store.fail(taskId, "error message")
		const errorMessage = "Test error: something went wrong";
		store.fail(task.id, errorMessage);
		await store.flush();

		// Assert: Audit entry contains reason field
		const entries = readAuditLog(tmpDir, task.id);
		const failEntry = entries.find((e) => e.action === "fail");
		expect(failEntry).toBeDefined();
		expect(failEntry?.reason).toBe(errorMessage);
	});
});
