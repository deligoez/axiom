import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionLogger } from "./SessionLogger.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	appendFileSync: vi.fn(),
	mkdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockAppendFileSync = vi.mocked(fs.appendFileSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);

describe("SessionLogger", () => {
	let logger: SessionLogger;

	beforeEach(() => {
		vi.clearAllMocks();
		logger = new SessionLogger("/test/project");
	});

	describe("log", () => {
		it("appends JSON line to session-log.jsonl", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({
				mode: "semi-auto",
				eventType: "task_started",
				details: { taskId: "ch-123" },
			});

			// Assert
			expect(mockAppendFileSync).toHaveBeenCalledWith(
				"/test/project/.chorus/session-log.jsonl",
				expect.stringMatching(
					/"mode":"semi-auto".*"eventType":"task_started".*"taskId":"ch-123"/,
				),
			);
		});

		it("includes timestamp, mode, eventType, details fields", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({
				mode: "autopilot",
				eventType: "task_completed",
				details: { taskId: "ch-456" },
			});

			// Assert
			const writtenContent = mockAppendFileSync.mock.calls[0][1] as string;
			const entry = JSON.parse(writtenContent.trim());
			expect(entry).toHaveProperty("timestamp");
			expect(entry).toHaveProperty("mode", "autopilot");
			expect(entry).toHaveProperty("eventType", "task_completed");
			expect(entry).toHaveProperty("details");
			expect(entry.details.taskId).toBe("ch-456");
		});

		it("creates directory if it does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			logger.log({
				mode: "semi-auto",
				eventType: "started",
				details: {},
			});

			// Assert
			expect(mockMkdirSync).toHaveBeenCalledWith("/test/project/.chorus", {
				recursive: true,
			});
		});

		it("uses append-only mode for safe concurrent writes", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({ mode: "semi-auto", eventType: "test", details: {} });

			// Assert - appendFileSync is atomic for small writes
			expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
		});
	});

	describe("getRecentEvents", () => {
		it("returns last N events as array", () => {
			// Arrange
			const lines = [
				JSON.stringify({
					timestamp: "t1",
					mode: "semi-auto",
					eventType: "e1",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t2",
					mode: "semi-auto",
					eventType: "e2",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t3",
					mode: "semi-auto",
					eventType: "e3",
					details: {},
				}),
			].join("\n");
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(lines);

			// Act
			const events = logger.getRecentEvents(2);

			// Assert
			expect(events).toHaveLength(2);
			expect(events[0].eventType).toBe("e2");
			expect(events[1].eventType).toBe("e3");
		});

		it("returns empty array if file does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const events = logger.getRecentEvents(5);

			// Assert
			expect(events).toEqual([]);
		});
	});

	describe("getEventsByMode", () => {
		it("returns filtered events by mode", () => {
			// Arrange
			const lines = [
				JSON.stringify({
					timestamp: "t1",
					mode: "semi-auto",
					eventType: "e1",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t2",
					mode: "autopilot",
					eventType: "e2",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t3",
					mode: "semi-auto",
					eventType: "e3",
					details: {},
				}),
			].join("\n");
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(lines);

			// Act
			const events = logger.getEventsByMode("semi-auto");

			// Assert
			expect(events).toHaveLength(2);
			expect(events.every((e) => e.mode === "semi-auto")).toBe(true);
		});

		it("returns empty array if file does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const events = logger.getEventsByMode("semi-auto");

			// Assert
			expect(events).toEqual([]);
		});
	});

	describe("getEventsByType", () => {
		it("returns filtered events by type", () => {
			// Arrange
			const lines = [
				JSON.stringify({
					timestamp: "t1",
					mode: "semi-auto",
					eventType: "task_started",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t2",
					mode: "semi-auto",
					eventType: "task_completed",
					details: {},
				}),
				JSON.stringify({
					timestamp: "t3",
					mode: "semi-auto",
					eventType: "task_started",
					details: {},
				}),
			].join("\n");
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(lines);

			// Act
			const events = logger.getEventsByType("task_started");

			// Assert
			expect(events).toHaveLength(2);
			expect(events.every((e) => e.eventType === "task_started")).toBe(true);
		});
	});

	describe("corrupted data handling", () => {
		it("gracefully skips corrupted/invalid JSON lines during read", () => {
			// Arrange
			const lines = [
				JSON.stringify({
					timestamp: "t1",
					mode: "semi-auto",
					eventType: "e1",
					details: {},
				}),
				"{ invalid json }",
				JSON.stringify({
					timestamp: "t2",
					mode: "semi-auto",
					eventType: "e2",
					details: {},
				}),
				"",
			].join("\n");
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(lines);

			// Act
			const events = logger.getRecentEvents(10);

			// Assert - should only have 2 valid events
			expect(events).toHaveLength(2);
			expect(events[0].eventType).toBe("e1");
			expect(events[1].eventType).toBe("e2");
		});
	});
});
