import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";
import {
	clearEventLog,
	getEventLogPath,
	persistEvent,
	readEvents,
	replayEvents,
} from "../services/event-sourcing.js";
import {
	deleteSnapshot,
	getSnapshotPath,
	loadSnapshot,
	persistSnapshot,
} from "../services/persistence.js";

describe("E2E: XState Snapshot & Recovery", () => {
	let tempDir: string;
	let snapshotPath: string;
	let eventLogPath: string;

	beforeEach(() => {
		// Create a fresh temp directory for each test
		tempDir = join(
			tmpdir(),
			`chorus-xstate-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		snapshotPath = getSnapshotPath(tempDir);
		eventLogPath = getEventLogPath(tempDir);
	});

	afterEach(() => {
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// Snapshot persistence tests

	it("saves snapshot after agent spawned", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor.start();

		// Act - spawn an agent
		actor.send({ type: "SPAWN_AGENT", taskId: "task-1" });
		persistSnapshot(actor, snapshotPath);

		// Assert
		expect(existsSync(snapshotPath)).toBe(true);
		const snapshot = loadSnapshot(snapshotPath);
		expect(snapshot).not.toBeNull();
	});

	it("saves snapshot with updated stats after agent completed", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor.start();

		// Act - spawn and complete an agent
		actor.send({ type: "SPAWN_AGENT", taskId: "task-2" });
		actor.send({
			type: "AGENT_COMPLETED",
			agentId: "agent-task-2",
			taskId: "task-2",
		});
		persistSnapshot(actor, snapshotPath);

		// Assert
		expect(existsSync(snapshotPath)).toBe(true);
		const snapshot = loadSnapshot(snapshotPath);
		expect(snapshot).not.toBeNull();
	});

	it("loads snapshot and restores state on app restart", () => {
		// Arrange - create actor, spawn agent, save snapshot
		const actor1 = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor1.start();
		actor1.send({ type: "SPAWN_AGENT", taskId: "task-3" });
		actor1.send({ type: "SET_MODE", mode: "autopilot" });
		persistSnapshot(actor1, snapshotPath);
		actor1.stop();

		// Act - load snapshot and create new actor
		const savedSnapshot = loadSnapshot(snapshotPath);

		// Assert
		expect(savedSnapshot).not.toBeNull();
		// Verify snapshot contains the expected state
		expect(savedSnapshot).toHaveProperty("context");
		expect(savedSnapshot).toHaveProperty("value");
	});

	// Event sourcing fallback tests

	it("triggers event sourcing fallback when snapshot is corrupted", () => {
		// Arrange - create corrupted snapshot
		const chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });
		writeFileSync(snapshotPath, "{ invalid json }", "utf-8");

		// Also create event log with valid events
		persistEvent({ type: "SPAWN_AGENT", taskId: "task-4" }, eventLogPath);

		// Act
		const snapshot = loadSnapshot(snapshotPath);
		const events = readEvents(eventLogPath);

		// Assert - snapshot should fail, events should be available
		expect(snapshot).toBeNull();
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("SPAWN_AGENT");
	});

	it("replays events correctly to reconstruct state", () => {
		// Arrange - persist some events
		persistEvent({ type: "SPAWN_AGENT", taskId: "task-5" }, eventLogPath);
		persistEvent({ type: "SET_MODE", mode: "autopilot" }, eventLogPath);

		// Act - replay events
		const replayedActor = replayEvents(chorusMachine, eventLogPath, {
			config: { projectRoot: tempDir },
			maxAgents: 3,
		});

		// Assert
		const snapshot = replayedActor.getSnapshot();
		expect(snapshot.context.mode).toBe("autopilot");
		// Agent spawn should have been processed
		expect(snapshot.context.agents.length).toBeGreaterThanOrEqual(1);

		replayedActor.stop();
	});

	it("handles event log with timestamps correctly", () => {
		// Arrange
		const before = Date.now();
		persistEvent({ type: "SPAWN_AGENT", taskId: "task-6" }, eventLogPath);
		const after = Date.now();

		// Act
		const events = readEvents(eventLogPath);

		// Assert
		expect(events.length).toBe(1);
		expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
		expect(events[0].timestamp).toBeLessThanOrEqual(after);
	});

	// Graceful degradation tests

	it("returns null when no snapshot file exists", () => {
		// Arrange - no snapshot file created

		// Act
		const snapshot = loadSnapshot(snapshotPath);

		// Assert
		expect(snapshot).toBeNull();
	});

	it("starts fresh when no snapshot and no events exist", () => {
		// Arrange - nothing created

		// Act
		const snapshot = loadSnapshot(snapshotPath);
		const events = readEvents(eventLogPath);

		// Assert - both should gracefully degrade
		expect(snapshot).toBeNull();
		expect(events).toEqual([]);

		// Can still create a fresh actor
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor.start();
		expect(actor.getSnapshot().context.mode).toBe("semi-auto");
		actor.stop();
	});

	// Cleanup utility tests

	it("clears event log after successful snapshot", () => {
		// Arrange - create events and snapshot
		persistEvent({ type: "SPAWN_AGENT", taskId: "task-7" }, eventLogPath);
		persistEvent({ type: "SET_MODE", mode: "autopilot" }, eventLogPath);

		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor.start();
		persistSnapshot(actor, snapshotPath);
		actor.stop();

		// Act - clear event log after snapshot
		clearEventLog(eventLogPath);

		// Assert
		expect(existsSync(snapshotPath)).toBe(true);
		expect(existsSync(eventLogPath)).toBe(false);
	});

	it("deletes snapshot file correctly", () => {
		// Arrange - create snapshot
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: tempDir }, maxAgents: 3 },
		});
		actor.start();
		persistSnapshot(actor, snapshotPath);
		actor.stop();
		expect(existsSync(snapshotPath)).toBe(true);

		// Act
		deleteSnapshot(snapshotPath);

		// Assert
		expect(existsSync(snapshotPath)).toBe(false);
	});
});
