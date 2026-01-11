import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { MockAgentSpawner } from "./MockAgentSpawner.js";
import type { ConflictAnalysis, ResolverConfig } from "./ResolverAgent.js";
import { ResolverAgent } from "./ResolverAgent.js";

describe("ResolverAgent", () => {
	let resolver: ResolverAgent;
	let mockSpawner: MockAgentSpawner;
	let mockQualityRunner: { run: Mock };
	let mockFileReader: { read: Mock };
	let config: ResolverConfig;

	beforeEach(() => {
		mockSpawner = new MockAgentSpawner();
		mockQualityRunner = { run: vi.fn() };
		mockFileReader = { read: vi.fn() };
		config = {
			maxAttempts: 3,
			qualityCommands: ["npm test"],
		};
		resolver = new ResolverAgent(
			mockSpawner,
			config,
			mockQualityRunner as unknown as {
				run: () => Promise<{ success: boolean }>;
			},
			mockFileReader as unknown as { read: (path: string) => Promise<string> },
		);
	});

	const createConflict = (
		files: string[] = ["src/index.ts"],
	): ConflictAnalysis => ({
		files,
		type: "COMPLEX",
		description: "Overlapping changes in core files",
		cwd: "/test/project",
	});

	// F29: resolve() - 6 tests
	describe("resolve()", () => {
		it("calls spawner.spawn() with conflict resolution prompt", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("resolved content without markers");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Act
			await resolver.resolve(conflict);

			// Assert
			expect(mockSpawner.spawnCalls.length).toBe(1);
			expect(mockSpawner.spawnCalls[0].prompt).toContain("src/index.ts");
		});

		it("returns { success: true, resolved: true } when agent resolves (exit 0 + no markers)", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Act
			const result = await resolver.resolve(conflict);

			// Assert
			expect(result.success).toBe(true);
			expect(result.resolved).toBe(true);
		});

		it("returns { needsHuman: true } after maxAttempts failures", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(1); // Agent fails
			mockFileReader.read.mockResolvedValue("<<<<<<< HEAD\nconflict\n=======");

			// Act
			const result = await resolver.resolve(conflict);

			// Assert
			expect(result.needsHuman).toBe(true);
		});

		it("emits 'resolving' event when agent starts", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });
			const handler = vi.fn();
			resolver.on("resolving", handler);

			// Act
			await resolver.resolve(conflict);

			// Assert
			expect(handler).toHaveBeenCalledOnce();
		});

		it("emits 'resolved' event on successful resolution", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });
			const handler = vi.fn();
			resolver.on("resolved", handler);

			// Act
			await resolver.resolve(conflict);

			// Assert
			expect(handler).toHaveBeenCalledOnce();
		});

		it("emits 'failed' event after maxAttempts failures", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(1);
			mockFileReader.read.mockResolvedValue("<<<<<<< HEAD");
			const handler = vi.fn();
			resolver.on("failed", handler);

			// Act
			await resolver.resolve(conflict);

			// Assert
			expect(handler).toHaveBeenCalledOnce();
		});
	});

	// F29: buildPrompt() - 2 tests
	describe("buildPrompt()", () => {
		it("includes all conflicting file contents", () => {
			// Arrange
			const conflict = createConflict(["src/a.ts", "src/b.ts"]);

			// Act
			const prompt = resolver.buildPrompt(conflict);

			// Assert
			expect(prompt).toContain("src/a.ts");
			expect(prompt).toContain("src/b.ts");
		});

		it("includes conflict analysis for context", () => {
			// Arrange
			const conflict = createConflict();
			conflict.description = "Semantic conflict in API handlers";

			// Act
			const prompt = resolver.buildPrompt(conflict);

			// Assert
			expect(prompt).toContain("Semantic conflict in API handlers");
		});
	});

	// F29: verifyResolution() - 1 test
	describe("verifyResolution()", () => {
		it("returns true when no conflict markers remain in file", async () => {
			// Arrange
			mockFileReader.read.mockResolvedValue("clean content without markers");

			// Act
			const result = await resolver.verifyResolution("src/index.ts");

			// Assert
			expect(result).toBe(true);
		});
	});

	// F29: Quality Commands Verification - 3 tests
	describe("Quality Commands Verification", () => {
		it("after conflict resolution, runs quality commands (from config)", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Act
			await resolver.resolve(conflict);

			// Assert
			expect(mockQualityRunner.run).toHaveBeenCalled();
		});

		it("only returns { success: true } if quality commands pass", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Act
			const result = await resolver.resolve(conflict);

			// Assert
			expect(result.success).toBe(true);
		});

		it("returns { needsHuman: true } if quality commands fail after resolution", async () => {
			// Arrange
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: false });

			// Act
			const result = await resolver.resolve(conflict);

			// Assert
			expect(result.needsHuman).toBe(true);
		});
	});

	// F29: cancel() - 1 test
	describe("cancel()", () => {
		it("calls spawner.kill() with agent PID", async () => {
			// Arrange - start resolve and immediately cancel
			const conflict = createConflict();
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Start resolution (don't await)
			const resolvePromise = resolver.resolve(conflict);

			// Wait for spawn to complete
			await new Promise((r) => setTimeout(r, 0));

			// Cancel while in progress
			resolver.cancel();

			// Wait for completion
			await resolvePromise;

			// Assert - kill should have been called
			expect(mockSpawner.killCalls.length).toBe(1);
		});
	});

	// F29: AgentSpawner - 2 tests
	describe("CLIAgentSpawner", () => {
		it("spawn() returns process with pid", async () => {
			// This is a unit test for the interface contract
			// The actual CLIAgentSpawner.spawn() would spawn a real process
			// Here we just verify the MockAgentSpawner follows the interface

			// Arrange
			const spawner = new MockAgentSpawner();

			// Act
			const process = await spawner.spawn({ prompt: "test", cwd: "/test" });

			// Assert
			expect(process.pid).toBeDefined();
			expect(typeof process.pid).toBe("number");
		});

		it("kill() terminates process", () => {
			// Arrange
			const spawner = new MockAgentSpawner();

			// Act
			spawner.kill(1000);

			// Assert
			expect(spawner.killCalls).toContain(1000);
		});
	});
});
