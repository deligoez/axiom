import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionLogger } from "./SessionLogger.js";

// Mock fs for sync operations (existsSync, readFileSync)
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

// Mock fs/promises for async operations (appendFile, mkdir)
vi.mock("node:fs/promises", () => ({
	appendFile: vi.fn().mockResolvedValue(undefined),
	mkdir: vi.fn().mockResolvedValue(undefined),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockAppendFile = vi.mocked(fsPromises.appendFile);
const mockMkdir = vi.mocked(fsPromises.mkdir);

describe("SessionLogger", () => {
	let logger: SessionLogger;

	beforeEach(() => {
		vi.clearAllMocks();
		logger = new SessionLogger("/test/project");
	});

	describe("log", () => {
		it("appends JSON line to session-log.jsonl", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({
				mode: "semi-auto",
				eventType: "task_started",
				details: { taskId: "ch-123" },
			});

			// Wait for async write to complete
			await vi.waitFor(() => {
				expect(mockAppendFile).toHaveBeenCalled();
			});

			// Assert
			expect(mockAppendFile).toHaveBeenCalledWith(
				"/test/project/.chorus/session-log.jsonl",
				expect.stringMatching(
					/"mode":"semi-auto".*"eventType":"task_started".*"taskId":"ch-123"/,
				),
			);
		});

		it("includes timestamp, mode, eventType, details fields", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({
				mode: "autopilot",
				eventType: "task_completed",
				details: { taskId: "ch-456" },
			});

			// Wait for async write to complete
			await vi.waitFor(() => {
				expect(mockAppendFile).toHaveBeenCalled();
			});

			// Assert
			const writtenContent = mockAppendFile.mock.calls[0][1] as string;
			const entry = JSON.parse(writtenContent.trim());
			expect(entry).toHaveProperty("timestamp");
			expect(entry).toHaveProperty("mode", "autopilot");
			expect(entry).toHaveProperty("eventType", "task_completed");
			expect(entry).toHaveProperty("details");
			expect(entry.details.taskId).toBe("ch-456");
		});

		it("creates directory if it does not exist", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			logger.log({
				mode: "semi-auto",
				eventType: "started",
				details: {},
			});

			// Wait for async operations to complete
			await vi.waitFor(() => {
				expect(mockMkdir).toHaveBeenCalled();
			});

			// Assert
			expect(mockMkdir).toHaveBeenCalledWith("/test/project/.chorus", {
				recursive: true,
			});
		});

		it("uses async append for non-blocking writes", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			logger.log({ mode: "semi-auto", eventType: "test", details: {} });

			// Wait for async write to complete
			await vi.waitFor(() => {
				expect(mockAppendFile).toHaveBeenCalled();
			});

			// Assert - appendFile (async) is used for non-blocking writes
			expect(mockAppendFile).toHaveBeenCalledTimes(1);
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
