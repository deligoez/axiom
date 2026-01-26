import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "../machines/chorus.machine.js";
import {
	getSnapshotPath,
	loadSnapshot,
	persistSnapshot,
} from "./persistence.js";

describe("Persistence Layer", () => {
	const testDir = "/tmp/chorus-test-persistence";
	const testSnapshotPath = path.join(testDir, "state.xstate.json");

	beforeEach(() => {
		fs.mkdirSync(testDir, { recursive: true });
		if (fs.existsSync(testSnapshotPath)) {
			fs.unlinkSync(testSnapshotPath);
		}
	});

	afterEach(() => {
		if (fs.existsSync(testSnapshotPath)) {
			fs.unlinkSync(testSnapshotPath);
		}
	});

	it("persistSnapshot creates file", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();

		// Act
		persistSnapshot(actor, testSnapshotPath);

		// Assert
		expect(fs.existsSync(testSnapshotPath)).toBe(true);
		actor.stop();
	});

	it("loadSnapshot returns valid snapshot", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();
		actor.send({ type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } });
		persistSnapshot(actor, testSnapshotPath);
		actor.stop();

		// Act
		const snapshot = loadSnapshot(testSnapshotPath);

		// Assert
		expect(snapshot).toBeDefined();
		expect(snapshot).not.toBeNull();
	});

	it("atomic write uses temp file", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" } },
		});
		actor.start();

		// Act
		persistSnapshot(actor, testSnapshotPath);

		// Assert - file exists and is valid JSON
		const content = fs.readFileSync(testSnapshotPath, "utf-8");
		expect(() => JSON.parse(content)).not.toThrow();
		actor.stop();
	});

	it("snapshot includes context data", () => {
		// Arrange
		const actor = createActor(chorusMachine, {
			input: { config: { projectRoot: "/test" }, maxAgents: 5 },
		});
		actor.start();
		actor.send({ type: "SET_MODE", mode: "autopilot" });
		persistSnapshot(actor, testSnapshotPath);
		actor.stop();

		// Act
		const snapshot = loadSnapshot(testSnapshotPath) as {
			context?: { mode?: string; maxAgents?: number };
		} | null;

		// Assert
		expect(snapshot?.context?.mode).toBe("autopilot");
		expect(snapshot?.context?.maxAgents).toBe(5);
	});

	it("snapshot can restore machine state", () => {
		// Arrange - create and advance machine
		const input = { config: { projectRoot: "/test" } };
		const actor1 = createActor(chorusMachine, { input });
		actor1.start();
		actor1.send({ type: "CONFIG_COMPLETE", config: { projectRoot: "/test" } });
		actor1.send({ type: "PLAN_APPROVED" });
		const originalValue = actor1.getSnapshot().value;
		persistSnapshot(actor1, testSnapshotPath);
		actor1.stop();

		// Act - restore from snapshot
		const snapshot = loadSnapshot(testSnapshotPath);
		const actor2 = createActor(chorusMachine, {
			input,
			snapshot: snapshot as never,
		});
		actor2.start();
		const restoredValue = actor2.getSnapshot().value;
		actor2.stop();

		// Assert
		expect(restoredValue).toEqual(originalValue);
	});

	it("getSnapshotPath returns correct path", () => {
		// Act
		const snapshotPath = getSnapshotPath("/project/root");

		// Assert
		expect(snapshotPath).toBe("/project/root/.chorus/state.xstate.json");
	});

	it("loadSnapshot returns null for missing file", () => {
		// Act
		const snapshot = loadSnapshot("/nonexistent/path/state.json");

		// Assert
		expect(snapshot).toBeNull();
	});

	it("loadSnapshot returns null for invalid JSON", () => {
		// Arrange
		fs.writeFileSync(testSnapshotPath, "invalid json {{{", "utf-8");

		// Act
		const snapshot = loadSnapshot(testSnapshotPath);

		// Assert
		expect(snapshot).toBeNull();
	});
});
