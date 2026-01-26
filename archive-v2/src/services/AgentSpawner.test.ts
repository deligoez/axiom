import type { ChildProcess } from "node:child_process";
import { EventEmitter, Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIAgentSpawner } from "./AgentSpawner.js";

// Mock child_process
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

import { spawn } from "node:child_process";

const mockSpawn = vi.mocked(spawn);

describe("CLIAgentSpawner", () => {
	let spawner: CLIAgentSpawner;

	const createMockChildProcess = (options: {
		pid?: number;
		stdout?: Readable | null;
	}): Partial<ChildProcess> & EventEmitter => {
		const emitter = new EventEmitter();
		return {
			...emitter,
			pid: options.pid,
			stdout:
				options.stdout === null
					? null
					: (options.stdout ?? new Readable({ read() {} })),
			stderr: new Readable({ read() {} }),
			stdin: null,
			stdio: [null, null, null, null, null],
			killed: false,
			connected: false,
			exitCode: null,
			signalCode: null,
			spawnargs: [],
			spawnfile: "",
			kill: vi.fn().mockReturnValue(true),
			send: vi.fn(),
			disconnect: vi.fn(),
			unref: vi.fn(),
			ref: vi.fn(),
			on: emitter.on.bind(emitter),
			once: emitter.once.bind(emitter),
			emit: emitter.emit.bind(emitter),
			addListener: emitter.addListener.bind(emitter),
			removeListener: emitter.removeListener.bind(emitter),
		} as unknown as Partial<ChildProcess> & EventEmitter;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		spawner = new CLIAgentSpawner();
	});

	describe("spawn()", () => {
		it("spawns claude process with prompt and cwd", async () => {
			// Arrange
			const mockProcess = createMockChildProcess({ pid: 12345 });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);

			// Act
			const result = await spawner.spawn({
				prompt: "Fix the bug in main.ts",
				cwd: "/project/dir",
			});

			// Assert
			expect(mockSpawn).toHaveBeenCalledWith(
				"claude",
				["--prompt", "Fix the bug in main.ts"],
				expect.objectContaining({
					cwd: "/project/dir",
					stdio: ["inherit", "pipe", "pipe"],
				}),
			);
			expect(result.pid).toBe(12345);
		});

		it("returns AgentProcess with stdout stream", async () => {
			// Arrange
			const stdout = new Readable({ read() {} });
			const mockProcess = createMockChildProcess({ pid: 999, stdout });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);

			// Act
			const result = await spawner.spawn({
				prompt: "Test prompt",
				cwd: "/test",
			});

			// Assert
			expect(result.stdout).toBe(stdout);
		});

		it("returns AgentProcess with exitCode promise", async () => {
			// Arrange
			const mockProcess = createMockChildProcess({ pid: 123 });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);

			// Act
			const result = await spawner.spawn({
				prompt: "Test",
				cwd: "/test",
			});

			// Simulate process exit
			mockProcess.emit("exit", 0);

			// Assert
			const exitCode = await result.exitCode;
			expect(exitCode).toBe(0);
		});

		it("throws error when pid is undefined", async () => {
			// Arrange
			const mockProcess = createMockChildProcess({ pid: undefined });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);

			// Act & Assert
			await expect(
				spawner.spawn({ prompt: "Test", cwd: "/test" }),
			).rejects.toThrow("Failed to spawn agent process");
		});

		it("throws error when stdout is null", async () => {
			// Arrange
			const mockProcess = createMockChildProcess({ pid: 123, stdout: null });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);

			// Act & Assert
			await expect(
				spawner.spawn({ prompt: "Test", cwd: "/test" }),
			).rejects.toThrow("Failed to spawn agent process");
		});
	});

	describe("kill()", () => {
		it("kills spawned process by pid", async () => {
			// Arrange
			const mockProcess = createMockChildProcess({ pid: 42 });
			mockSpawn.mockReturnValueOnce(mockProcess as ChildProcess);
			await spawner.spawn({ prompt: "Test", cwd: "/test" });

			// Act
			spawner.kill(42);

			// Assert
			expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
		});

		it("does nothing when killing non-existent pid", () => {
			// Arrange - no process spawned

			// Act & Assert - should not throw
			expect(() => spawner.kill(999)).not.toThrow();
		});
	});
});
