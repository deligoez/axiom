import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AuditEntry, archiveAuditLog, readAuditLog } from "./AuditLog.js";

describe("AuditLog", () => {
	let tempDir: string;
	let auditDir: string;

	beforeEach(() => {
		// Create temp directory for tests
		tempDir = join(tmpdir(), `chorus-auditlog-test-${Date.now()}`);
		auditDir = join(tempDir, ".chorus", "audit");
		mkdirSync(auditDir, { recursive: true });
	});

	afterEach(() => {
		// Cleanup handled by OS for temp directories
	});

	describe("readAuditLog", () => {
		it("returns array of AuditEntry from JSONL file", () => {
			// Arrange
			const taskId = "ch-1";
			const entries: AuditEntry[] = [
				{
					timestamp: "2026-01-01T00:00:00.000Z",
					type: "lifecycle",
					action: "claim",
				},
				{
					timestamp: "2026-01-01T01:00:00.000Z",
					type: "lifecycle",
					action: "complete",
				},
			];
			const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
			writeFileSync(join(auditDir, `${taskId}.jsonl`), content);

			// Act
			const result = readAuditLog(tempDir, taskId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(entries[0]);
			expect(result[1]).toEqual(entries[1]);
		});

		it("returns empty array if file doesn't exist", () => {
			// Arrange
			const taskId = "ch-nonexistent";

			// Act
			const result = readAuditLog(tempDir, taskId);

			// Assert
			expect(result).toEqual([]);
		});

		it("parses JSONL correctly with various fields", () => {
			// Arrange
			const taskId = "ch-2";
			const entries: AuditEntry[] = [
				{
					timestamp: "2026-01-01T00:00:00.000Z",
					type: "lifecycle",
					action: "fail",
					reason: "Tests failed",
				},
				{
					timestamp: "2026-01-01T01:00:00.000Z",
					type: "custom",
					data: { foo: "bar" },
				},
			];
			const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
			writeFileSync(join(auditDir, `${taskId}.jsonl`), content);

			// Act
			const result = readAuditLog(tempDir, taskId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toHaveProperty("reason", "Tests failed");
			expect(result[1]).toHaveProperty("data");
		});

		it("reads compressed .jsonl.gz files", () => {
			// Arrange
			const taskId = "ch-3";
			const entries: AuditEntry[] = [
				{
					timestamp: "2026-01-01T00:00:00.000Z",
					type: "lifecycle",
					action: "claim",
				},
				{
					timestamp: "2026-01-01T02:00:00.000Z",
					type: "lifecycle",
					action: "complete",
				},
			];
			const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
			const compressed = gzipSync(content);
			writeFileSync(join(auditDir, `${taskId}.jsonl.gz`), compressed);

			// Act
			const result = readAuditLog(tempDir, taskId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(entries[0]);
			expect(result[1]).toEqual(entries[1]);
		});
	});

	describe("archiveAuditLog", () => {
		it("compresses log to .jsonl.gz", () => {
			// Arrange
			const taskId = "ch-archive1";
			const entries: AuditEntry[] = [
				{
					timestamp: "2026-01-01T00:00:00.000Z",
					type: "lifecycle",
					action: "claim",
				},
				{
					timestamp: "2026-01-01T01:00:00.000Z",
					type: "lifecycle",
					action: "complete",
				},
			];
			const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
			writeFileSync(join(auditDir, `${taskId}.jsonl`), content);

			// Act
			archiveAuditLog(tempDir, taskId);

			// Assert - .gz file exists and contains correct data
			const gzPath = join(auditDir, `${taskId}.jsonl.gz`);
			expect(existsSync(gzPath)).toBe(true);
			const compressed = require("node:fs").readFileSync(gzPath);
			const decompressed = gunzipSync(compressed).toString("utf-8");
			expect(decompressed).toBe(content);
		});

		it("deletes original .jsonl file after compression", () => {
			// Arrange
			const taskId = "ch-archive2";
			const content =
				'{"timestamp":"2026-01-01T00:00:00.000Z","type":"test"}\n';
			const jsonlPath = join(auditDir, `${taskId}.jsonl`);
			writeFileSync(jsonlPath, content);

			// Act
			archiveAuditLog(tempDir, taskId);

			// Assert
			expect(existsSync(jsonlPath)).toBe(false);
			expect(existsSync(join(auditDir, `${taskId}.jsonl.gz`))).toBe(true);
		});

		it("does nothing if log file doesn't exist", () => {
			// Arrange
			const taskId = "ch-nonexistent";

			// Act - should not throw
			archiveAuditLog(tempDir, taskId);

			// Assert - no files created
			expect(existsSync(join(auditDir, `${taskId}.jsonl`))).toBe(false);
			expect(existsSync(join(auditDir, `${taskId}.jsonl.gz`))).toBe(false);
		});

		it("uses gzip format for compression", () => {
			// Arrange
			const taskId = "ch-archive3";
			const content =
				'{"timestamp":"2026-01-01T00:00:00.000Z","type":"test"}\n';
			writeFileSync(join(auditDir, `${taskId}.jsonl`), content);

			// Act
			archiveAuditLog(tempDir, taskId);

			// Assert - file has gzip magic bytes (0x1f 0x8b)
			const compressed = require("node:fs").readFileSync(
				join(auditDir, `${taskId}.jsonl.gz`),
			);
			expect(compressed[0]).toBe(0x1f);
			expect(compressed[1]).toBe(0x8b);
		});
	});
});
