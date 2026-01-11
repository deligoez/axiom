import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StateService } from "../services/StateService.js";

describe("E2E: StateService", () => {
	let tempDir: string;

	beforeEach(() => {
		// Create a fresh temp directory for each test
		tempDir = join(
			tmpdir(),
			`chorus-state-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("save() writes state.json to .chorus/ directory", () => {
		// Arrange
		const service = new StateService(tempDir);
		service.init();

		// Act
		service.save();

		// Assert
		const statePath = join(tempDir, ".chorus", "state.json");
		expect(existsSync(statePath)).toBe(true);
	});

	it("load() restores state from disk correctly", () => {
		// Arrange
		const service1 = new StateService(tempDir);
		const state = service1.init();
		state.mode = "autopilot";
		service1.addAgent({
			id: "agent-1",
			type: "claude",
			pid: 12345,
			taskId: "ch-test1",
			status: "running",
			worktree: "/path/to/worktree",
			branch: "agent/implement/ch-test1",
			iteration: 0,
			startedAt: Date.now(),
		});
		service1.save();

		// Act - create new service to simulate process restart
		const service2 = new StateService(tempDir);
		const loadedState = service2.load();

		// Assert
		expect(loadedState).not.toBeNull();
		expect(loadedState?.mode).toBe("autopilot");
		expect(loadedState?.agents["agent-1"]).toBeDefined();
		expect(loadedState?.agents["agent-1"].taskId).toBe("ch-test1");
	});

	it("load() returns null if no state file exists", () => {
		// Arrange
		const service = new StateService(tempDir);

		// Act
		const state = service.load();

		// Assert
		expect(state).toBeNull();
	});

	it("state survives process restart simulation", () => {
		// Arrange - simulate first process
		const service1 = new StateService(tempDir);
		service1.init();
		service1.addAgent({
			id: "agent-restart",
			type: "claude",
			pid: 54321,
			taskId: "ch-restart",
			status: "running",
			worktree: "/path/to/worktree",
			branch: "agent/implement/ch-restart",
			iteration: 3,
			startedAt: Date.now(),
		});
		const originalSessionId = service1.get().sessionId;
		service1.save();

		// Act - simulate process restart by creating entirely new service
		const service2 = new StateService(tempDir);
		const restoredState = service2.load();

		// Assert - state should be restored with same session ID
		expect(restoredState).not.toBeNull();
		expect(restoredState?.sessionId).toBe(originalSessionId);
		expect(restoredState?.agents["agent-restart"]).toBeDefined();
		expect(restoredState?.agents["agent-restart"].iteration).toBe(3);
	});

	it("handles corrupted state file gracefully", () => {
		// Arrange - create corrupted state file
		const chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });
		writeFileSync(join(chorusDir, "state.json"), "{ invalid json }", "utf-8");

		const service = new StateService(tempDir);

		// Act & Assert - should throw on invalid JSON
		expect(() => service.load()).toThrow();
	});

	it("handles invalid state structure gracefully", () => {
		// Arrange - create state file with missing required fields
		const chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });
		writeFileSync(
			join(chorusDir, "state.json"),
			JSON.stringify({ version: "1.0" }), // Missing sessionId, agents, stats
			"utf-8",
		);

		const service = new StateService(tempDir);

		// Act & Assert - should throw on invalid structure
		expect(() => service.load()).toThrow("Invalid state structure");
	});
});
