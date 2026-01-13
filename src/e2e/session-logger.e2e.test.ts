import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionLogger } from "../services/SessionLogger.js";

describe("E2E: SessionLogger Integration", () => {
	let tempDir: string;
	let sessionLogger: SessionLogger;

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-session-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });

		sessionLogger = new SessionLogger(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("creates session-log.jsonl if missing", async () => {
		// Arrange
		const logPath = join(tempDir, ".chorus", "session-log.jsonl");
		expect(existsSync(logPath)).toBe(false);

		// Act
		sessionLogger.log({
			mode: "test",
			eventType: "start",
			details: { message: "Test event" },
		});

		// Assert - wait for async write
		await vi.waitFor(() => {
			expect(existsSync(logPath)).toBe(true);
		});
	});

	it("appends events correctly as one JSON per line", async () => {
		// Arrange
		const logPath = join(tempDir, ".chorus", "session-log.jsonl");

		// Act
		sessionLogger.log({
			mode: "init",
			eventType: "session_start",
			details: { version: "1.0" },
		});
		sessionLogger.log({
			mode: "planning",
			eventType: "task_created",
			details: { taskId: "ch-001" },
		});

		// Assert - wait for async writes to complete
		await vi.waitFor(() => {
			const content = readFileSync(logPath, "utf-8");
			const lines = content.trim().split("\n");
			expect(lines).toHaveLength(2);

			// Verify each line is valid JSON
			const event1 = JSON.parse(lines[0]);
			const event2 = JSON.parse(lines[1]);

			expect(event1.mode).toBe("init");
			expect(event1.eventType).toBe("session_start");
			expect(event2.mode).toBe("planning");
			expect(event2.eventType).toBe("task_created");
		});
	});

	it("events have correct timestamp format", async () => {
		// Arrange & Act
		sessionLogger.log({
			mode: "test",
			eventType: "timestamp_test",
			details: {},
		});

		// Assert - wait for async write
		await vi.waitFor(() => {
			const events = sessionLogger.getRecentEvents(1);
			expect(events).toHaveLength(1);
			expect(events[0].timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
			);
		});
	});

	it("multiple events append in order", async () => {
		// Arrange & Act
		for (let i = 0; i < 5; i++) {
			sessionLogger.log({
				mode: "test",
				eventType: `event_${i}`,
				details: { index: i },
			});
		}

		// Assert - wait for all async writes
		await vi.waitFor(() => {
			const events = sessionLogger.getRecentEvents(10);
			expect(events).toHaveLength(5);
			expect(events[0].eventType).toBe("event_0");
			expect(events[4].eventType).toBe("event_4");
		});
	});

	it("filters events by mode", async () => {
		// Arrange
		sessionLogger.log({ mode: "init", eventType: "start", details: {} });
		sessionLogger.log({
			mode: "planning",
			eventType: "create_task",
			details: {},
		});
		sessionLogger.log({
			mode: "planning",
			eventType: "update_task",
			details: {},
		});
		sessionLogger.log({
			mode: "implementation",
			eventType: "run_agent",
			details: {},
		});

		// Assert - wait for async writes then filter
		await vi.waitFor(() => {
			const planningEvents = sessionLogger.getEventsByMode("planning");
			expect(planningEvents).toHaveLength(2);
			expect(planningEvents[0].eventType).toBe("create_task");
			expect(planningEvents[1].eventType).toBe("update_task");
		});
	});

	it("filters events by type", async () => {
		// Arrange
		sessionLogger.log({
			mode: "planning",
			eventType: "task_created",
			details: { id: "1" },
		});
		sessionLogger.log({
			mode: "planning",
			eventType: "task_updated",
			details: { id: "1" },
		});
		sessionLogger.log({
			mode: "planning",
			eventType: "task_created",
			details: { id: "2" },
		});

		// Assert - wait for async writes then filter
		await vi.waitFor(() => {
			const createdEvents = sessionLogger.getEventsByType("task_created");
			expect(createdEvents).toHaveLength(2);
			expect(createdEvents[0].details.id).toBe("1");
			expect(createdEvents[1].details.id).toBe("2");
		});
	});
});
