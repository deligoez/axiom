import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentManager } from "./AgentManager.js";

describe("AgentManager", () => {
	let manager: AgentManager;

	beforeEach(() => {
		manager = new AgentManager();
	});

	afterEach(async () => {
		await manager.killAll();
	});

	it("starts with no agents", () => {
		expect(manager.list()).toEqual([]);
	});

	it("spawns an agent", async () => {
		const agent = await manager.spawn({
			name: "test-agent",
			command: "echo",
			args: ["hello"],
		});

		expect(agent.name).toBe("test-agent");
		expect(agent.status).toBe("running");
		expect(manager.list()).toHaveLength(1);
	});

	it("gets agent by id", async () => {
		const agent = await manager.spawn({
			name: "find-me",
			command: "echo",
			args: ["test"],
		});

		const found = manager.get(agent.id);
		expect(found?.name).toBe("find-me");
	});

	it("returns undefined for unknown id", () => {
		expect(manager.get("unknown")).toBeUndefined();
	});

	it("kills an agent", async () => {
		const agent = await manager.spawn({
			name: "kill-me",
			command: "sleep",
			args: ["10"],
		});

		await manager.kill(agent.id);

		const found = manager.get(agent.id);
		expect(found?.status).toBe("stopped");
	});

	it("kills all agents", async () => {
		await manager.spawn({ name: "a1", command: "sleep", args: ["10"] });
		await manager.spawn({ name: "a2", command: "sleep", args: ["10"] });

		await manager.killAll();

		const agents = manager.list();
		expect(agents.every((a) => a.status === "stopped")).toBe(true);
	});

	it("emits output events", async () => {
		const outputs: string[] = [];
		manager.on("output", (_id, line) => {
			outputs.push(line);
		});

		await manager.spawn({
			name: "output-test",
			command: "echo",
			args: ["hello world"],
		});

		// Wait for output using vi.waitFor (retries until condition met or timeout)
		await vi.waitFor(
			() => {
				expect(outputs).toContain("hello world");
			},
			{ timeout: 2000 },
		);
	});

	it("emits exit event when process exits naturally", async () => {
		const exitEvents: { id: string; code: number | null }[] = [];
		manager.on("exit", (id, code) => {
			exitEvents.push({ id, code });
		});

		const agent = await manager.spawn({
			name: "exit-test",
			command: "echo",
			args: ["done"],
		});

		// Wait for process to exit using vi.waitFor
		await vi.waitFor(
			() => {
				expect(exitEvents).toHaveLength(1);
				expect(exitEvents[0].id).toBe(agent.id);
				expect(exitEvents[0].code).toBe(0);
			},
			{ timeout: 2000 },
		);
	});

	it("sets exitCode after process exits", async () => {
		const agent = await manager.spawn({
			name: "exitcode-test",
			command: "echo",
			args: ["test"],
		});

		// Wait for process to exit using vi.waitFor
		await vi.waitFor(
			() => {
				const found = manager.get(agent.id);
				expect(found?.exitCode).toBe(0);
				expect(found?.status).toBe("stopped");
			},
			{ timeout: 2000 },
		);
	});

	it("emits error event for invalid command", async () => {
		const errors: { id: string; error: Error }[] = [];
		manager.on("error", (id, error) => {
			errors.push({ id, error });
		});

		const agent = await manager.spawn({
			name: "error-test",
			command: "nonexistent-command-that-does-not-exist",
		});

		// Wait for error using vi.waitFor
		await vi.waitFor(
			() => {
				expect(errors.length).toBeGreaterThanOrEqual(1);
				expect(errors[0].id).toBe(agent.id);
			},
			{ timeout: 2000 },
		);
	});

	it("captures stderr output", async () => {
		const outputs: string[] = [];
		manager.on("output", (_id, line) => {
			outputs.push(line);
		});

		await manager.spawn({
			name: "stderr-test",
			command: "sh",
			args: ["-c", 'echo "error message" >&2'],
		});

		// Wait for output using vi.waitFor
		await vi.waitFor(
			() => {
				expect(outputs).toContain("error message");
			},
			{ timeout: 2000 },
		);
	});

	it("handles killing non-existent agent gracefully", async () => {
		// Should not throw
		await expect(manager.kill("non-existent-id")).resolves.toBeUndefined();
	});

	it("stores agent pid after spawn", async () => {
		const agent = await manager.spawn({
			name: "pid-test",
			command: "sleep",
			args: ["10"],
		});

		expect(agent.pid).toBeDefined();
		expect(typeof agent.pid).toBe("number");
	});

	it("handles concurrent spawn calls without race conditions", async () => {
		// Spawn multiple agents concurrently
		const spawnPromises = [
			manager.spawn({ name: "concurrent-1", command: "echo", args: ["1"] }),
			manager.spawn({ name: "concurrent-2", command: "echo", args: ["2"] }),
			manager.spawn({ name: "concurrent-3", command: "echo", args: ["3"] }),
		];

		const agents = await Promise.all(spawnPromises);

		// All agents should have unique IDs
		const ids = agents.map((a) => a.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(3);

		// All agents should be in the manager's list
		expect(manager.list()).toHaveLength(3);

		// Each agent should be retrievable by its ID
		for (const agent of agents) {
			expect(manager.get(agent.id)).toBe(agent);
		}
	});

	it("handles concurrent spawn and kill without errors", async () => {
		// Spawn an agent
		const agent = await manager.spawn({
			name: "spawn-kill-race",
			command: "sleep",
			args: ["10"],
		});

		// Spawn another and kill the first concurrently
		const [newAgent] = await Promise.all([
			manager.spawn({
				name: "spawn-during-kill",
				command: "sleep",
				args: ["10"],
			}),
			manager.kill(agent.id),
		]);

		// First agent should be stopped
		expect(manager.get(agent.id)?.status).toBe("stopped");

		// New agent should be running
		expect(manager.get(newAgent.id)?.status).toBe("running");

		// Both should be in the list
		expect(manager.list()).toHaveLength(2);
	});
});
