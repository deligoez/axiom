import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentLogger, type LogLevel } from "./AgentLogger.js";

describe("AgentLogger", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "agent-logger-test-"));
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("log()", () => {
		it("adds timestamped entry", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			const now = new Date("2026-01-13T10:00:00Z");
			vi.setSystemTime(now);

			// Act
			logger.log({
				persona: "chip",
				instanceId: "chip-001",
				level: "info",
				message: "Started task",
			});

			// Assert
			const entries = logger.getRecent(1);
			expect(entries).toHaveLength(1);
			expect(entries[0].timestamp).toBe(now.toISOString());
		});

		it("entries include persona, instanceId, level, message", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);

			// Act
			logger.log({
				persona: "sage",
				instanceId: "sage",
				level: "warn",
				message: "Low confidence",
			});

			// Assert
			const entries = logger.getRecent(1);
			expect(entries[0]).toMatchObject({
				persona: "sage",
				instanceId: "sage",
				level: "warn",
				message: "Low confidence",
			});
		});
	});

	describe("getRecent()", () => {
		it("returns last n entries", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			for (let i = 0; i < 10; i++) {
				logger.log({
					persona: "chip",
					instanceId: "chip-001",
					level: "info",
					message: `Message ${i}`,
				});
			}

			// Act
			const entries = logger.getRecent(3);

			// Assert
			expect(entries).toHaveLength(3);
			expect(entries[0].message).toBe("Message 7");
			expect(entries[1].message).toBe("Message 8");
			expect(entries[2].message).toBe("Message 9");
		});
	});

	describe("filterByPersona()", () => {
		it("filters entries by persona name", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			logger.log({
				persona: "chip",
				instanceId: "chip-001",
				level: "info",
				message: "Chip 1",
			});
			logger.log({
				persona: "sage",
				instanceId: "sage",
				level: "info",
				message: "Sage 1",
			});
			logger.log({
				persona: "chip",
				instanceId: "chip-002",
				level: "info",
				message: "Chip 2",
			});
			logger.log({
				persona: "patch",
				instanceId: "patch-001",
				level: "info",
				message: "Patch 1",
			});

			// Act
			const chipEntries = logger.filterByPersona("chip");

			// Assert
			expect(chipEntries).toHaveLength(2);
			expect(chipEntries.every((e) => e.persona === "chip")).toBe(true);
		});
	});

	describe("flush()", () => {
		it("persists to .chorus/logs/agents.jsonl", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			logger.log({
				persona: "chip",
				instanceId: "chip-001",
				level: "info",
				message: "Test",
			});

			// Act
			logger.flush();

			// Assert
			const logPath = join(tempDir, ".chorus", "logs", "agents.jsonl");
			expect(existsSync(logPath)).toBe(true);
			const content = readFileSync(logPath, "utf-8");
			expect(content.trim()).not.toBe("");
			const lines = content.trim().split("\n");
			expect(lines).toHaveLength(1);
			const entry = JSON.parse(lines[0]);
			expect(entry.message).toBe("Test");
		});
	});

	describe("auto-flush", () => {
		it("auto-flushes on threshold (100 entries)", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			const logPath = join(tempDir, ".chorus", "logs", "agents.jsonl");

			// Act - add 99 entries, should not flush yet
			for (let i = 0; i < 99; i++) {
				logger.log({
					persona: "chip",
					instanceId: "chip-001",
					level: "info",
					message: `Msg ${i}`,
				});
			}
			expect(existsSync(logPath)).toBe(false);

			// Add 100th entry, should trigger auto-flush
			logger.log({
				persona: "chip",
				instanceId: "chip-001",
				level: "info",
				message: "Msg 99",
			});

			// Assert
			expect(existsSync(logPath)).toBe(true);
			const content = readFileSync(logPath, "utf-8");
			const lines = content.trim().split("\n");
			expect(lines.length).toBeGreaterThanOrEqual(100);
		});
	});

	describe("log levels", () => {
		it("supports debug, info, warn, error levels", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			const levels: LogLevel[] = ["debug", "info", "warn", "error"];

			// Act
			for (const level of levels) {
				logger.log({
					persona: "sage",
					instanceId: "sage",
					level,
					message: `${level} message`,
				});
			}

			// Assert
			const entries = logger.getRecent(4);
			expect(entries.map((e) => e.level)).toEqual(levels);
		});
	});

	describe("flush() persistence format", () => {
		it("writes valid JSONL format with one entry per line", () => {
			// Arrange
			const logger = new AgentLogger(tempDir);
			logger.log({
				persona: "chip",
				instanceId: "chip-001",
				level: "info",
				message: "First",
			});
			logger.log({
				persona: "sage",
				instanceId: "sage",
				level: "warn",
				message: "Second",
			});

			// Act
			logger.flush();

			// Assert
			const logPath = join(tempDir, ".chorus", "logs", "agents.jsonl");
			const content = readFileSync(logPath, "utf-8");
			const lines = content.trim().split("\n");
			expect(lines).toHaveLength(2);
			// Each line should be valid JSON
			const entry1 = JSON.parse(lines[0]);
			const entry2 = JSON.parse(lines[1]);
			expect(entry1.message).toBe("First");
			expect(entry2.message).toBe("Second");
		});
	});
});
