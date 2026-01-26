import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";
import {
	clearEventLog,
	getEventLogPath,
	persistEvent,
	replayEvents,
	truncateEventLog,
} from "./event-sourcing.js";

describe("Event Sourcing", () => {
	const testDir = "/tmp/chorus-test-events";
	const testLogPath = path.join(testDir, "events.jsonl");

	beforeEach(() => {
		fs.mkdirSync(testDir, { recursive: true });
		clearEventLog(testLogPath);
	});

	afterEach(() => {
		if (fs.existsSync(testLogPath)) {
			fs.unlinkSync(testLogPath);
		}
	});

	it("persistEvent appends to JSONL file", () => {
		// Arrange
		const event = { type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } };

		// Act
		persistEvent(event, testLogPath);
		persistEvent({ type: "PLAN_APPROVED" }, testLogPath);

		// Assert
		const content = fs.readFileSync(testLogPath, "utf-8");
		const lines = content.trim().split("\n");
		expect(lines).toHaveLength(2);
	});

	it("events have timestamp field", () => {
		// Arrange
		const event = { type: "PAUSE" };

		// Act
		persistEvent(event, testLogPath);

		// Assert
		const content = fs.readFileSync(testLogPath, "utf-8");
		const parsed = JSON.parse(content.trim());
		expect(parsed.timestamp).toBeDefined();
		expect(typeof parsed.timestamp).toBe("number");
	});

	it("replayEvents creates machine from events", () => {
		// Arrange
		persistEvent(
			{ type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } },
			testLogPath,
		);
		persistEvent({ type: "PLAN_APPROVED" }, testLogPath);

		// Act
		const actor = replayEvents(chorusMachine, testLogPath, {
			config: { projectRoot: "/initial" },
		});

		// Assert
		expect(actor).toBeDefined();
		actor.stop();
	});

	it("replayed machine reaches same state as original", () => {
		// Arrange - create original and send events
		const input = { config: { projectRoot: "/test" } };
		const original = createActor(chorusMachine, { input });
		original.start();
		original.send({
			type: "CONFIG_COMPLETE",
			config: { projectRoot: "/test" },
		});
		original.send({ type: "PLAN_APPROVED" });
		const originalState = original.getSnapshot().value;
		original.stop();

		// Persist same events
		persistEvent(
			{ type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } },
			testLogPath,
		);
		persistEvent({ type: "PLAN_APPROVED" }, testLogPath);

		// Act - replay
		const replayed = replayEvents(chorusMachine, testLogPath, input);
		const replayedState = replayed.getSnapshot().value;
		replayed.stop();

		// Assert
		expect(replayedState).toEqual(originalState);
	});

	it("log truncation after snapshot preserves recovery", () => {
		// Arrange
		persistEvent(
			{ type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } },
			testLogPath,
		);
		persistEvent({ type: "PLAN_APPROVED" }, testLogPath);
		persistEvent({ type: "REVIEW_PASSED" }, testLogPath);

		// Act - truncate (simulating after snapshot)
		truncateEventLog(testLogPath);

		// Assert - file should be empty or not exist
		const exists = fs.existsSync(testLogPath);
		if (exists) {
			const content = fs.readFileSync(testLogPath, "utf-8");
			expect(content.trim()).toBe("");
		}
	});

	it("getEventLogPath returns correct path", () => {
		// Act
		const logPath = getEventLogPath("/project/root");

		// Assert
		expect(logPath).toBe("/project/root/.chorus/events.jsonl");
	});
});
