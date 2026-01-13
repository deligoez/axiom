import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { AgentLogger, LogInput } from "./AgentLogger.js";
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
			mockQualityRunner as {
				run: () => Promise<{ success: boolean }>;
			},
			mockFileReader as { read: (path: string) => Promise<string> },
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

	// MH03: Resolution Steps File Loading Tests (3 tests)
	describe("Resolution Steps File Loading", () => {
		let tempDir: string;

		beforeEach(() => {
			tempDir = join(
				tmpdir(),
				`resolver-agent-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			);
			mkdirSync(tempDir, { recursive: true });
		});

		afterEach(() => {
			try {
				rmSync(tempDir, { recursive: true, force: true });
			} catch {
				// Ignore cleanup errors
			}
		});

		it("loads resolution steps from .chorus/agents/patch/rules.md when present", () => {
			// Arrange
			const rulesDir = join(tempDir, ".chorus", "agents", "patch");
			mkdirSync(rulesDir, { recursive: true });
			const rulesContent = `# Conflict Resolution Steps

1. Read both versions carefully
2. Identify semantic intent
3. Create merged solution
4. Verify compilation
`;
			writeFileSync(join(rulesDir, "rules.md"), rulesContent);

			const configWithDir: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: ["npm test"],
				projectDir: tempDir,
			};
			const fileResolver = new ResolverAgent(
				mockSpawner,
				configWithDir,
				mockQualityRunner as {
					run: () => Promise<{ success: boolean }>;
				},
				mockFileReader as {
					read: (path: string) => Promise<string>;
				},
			);
			const conflict = createConflict();

			// Act
			const prompt = fileResolver.buildPrompt(conflict);

			// Assert
			expect(prompt).toContain("Read both versions carefully");
			expect(prompt).toContain("Identify semantic intent");
			expect(prompt).toContain("Create merged solution");
			expect(prompt).toContain("Verify compilation");
		});

		it("uses default steps when rules.md file missing", () => {
			// Arrange - no rules file
			const configWithDir: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: ["npm test"],
				projectDir: tempDir,
			};
			const fileResolver = new ResolverAgent(
				mockSpawner,
				configWithDir,
				mockQualityRunner as {
					run: () => Promise<{ success: boolean }>;
				},
				mockFileReader as {
					read: (path: string) => Promise<string>;
				},
			);
			const conflict = createConflict();

			// Act
			const prompt = fileResolver.buildPrompt(conflict);

			// Assert - should use default steps
			expect(prompt).toContain("Examine each conflicting file");
			expect(prompt).toContain("Remove all conflict markers");
			expect(prompt).toContain("Ensure the code compiles and tests pass");
		});

		it("uses default steps when projectDir not configured", () => {
			// Arrange - no projectDir in config
			const conflict = createConflict();

			// Act
			const prompt = resolver.buildPrompt(conflict);

			// Assert - should use default steps
			expect(prompt).toContain("Examine each conflicting file");
			expect(prompt).toContain("Understand both versions");
			expect(prompt).toContain("Merge the changes semantically");
		});
	});

	// Patch persona logging tests (AP14)
	describe("Patch persona logging", () => {
		const createMockAgentLogger = (): {
			logger: AgentLogger;
			logs: LogInput[];
		} => {
			const logs: LogInput[] = [];
			const logger = {
				log: vi.fn((input: LogInput) => logs.push(input)),
			} as unknown as AgentLogger;
			return { logger, logs };
		};

		it("logs with persona: 'patch' and instanceId: 'patch'", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const patchConfig: ResolverConfig = {
				maxAttempts: 1,
				qualityCommands: [],
				agentLogger: logger,
			};
			const patchResolver = new ResolverAgent(
				mockSpawner,
				patchConfig,
				mockQualityRunner as { run: () => Promise<{ success: boolean }> },
				mockFileReader as { read: (path: string) => Promise<string> },
			);
			mockSpawner.setExitCode(1); // Force failure for quick test

			// Act
			await patchResolver.resolve(createConflict());

			// Assert - all logs have patch persona and instance
			expect(logs.length).toBeGreaterThan(0);
			for (const log of logs) {
				expect(log.persona).toBe("patch");
				expect(log.instanceId).toBe("patch");
			}
		});

		it("logs '[patch] Analyzing merge conflict...' on start", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const patchConfig: ResolverConfig = {
				maxAttempts: 1,
				qualityCommands: [],
				agentLogger: logger,
			};
			const patchResolver = new ResolverAgent(
				mockSpawner,
				patchConfig,
				mockQualityRunner as { run: () => Promise<{ success: boolean }> },
				mockFileReader as { read: (path: string) => Promise<string> },
			);
			mockSpawner.setExitCode(1); // Force failure

			// Act
			await patchResolver.resolve(createConflict());

			// Assert - analysis log present
			const analysisLog = logs.find((l) =>
				l.message.includes("Analyzing merge conflict"),
			);
			expect(analysisLog).toBeDefined();
			expect(analysisLog?.message).toContain(
				"[patch] Analyzing merge conflict",
			);
		});

		it("logs '[patch] Conflict resolved' on success", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const patchConfig: ResolverConfig = {
				maxAttempts: 3,
				qualityCommands: [],
				agentLogger: logger,
			};
			const patchResolver = new ResolverAgent(
				mockSpawner,
				patchConfig,
				mockQualityRunner as { run: () => Promise<{ success: boolean }> },
				mockFileReader as { read: (path: string) => Promise<string> },
			);
			mockSpawner.setExitCode(0);
			mockFileReader.read.mockResolvedValue("clean content");
			mockQualityRunner.run.mockResolvedValue({ success: true });

			// Act
			await patchResolver.resolve(createConflict());

			// Assert - resolved log present
			const resolvedLog = logs.find((l) =>
				l.message.includes("Conflict resolved"),
			);
			expect(resolvedLog).toBeDefined();
			expect(resolvedLog?.message).toContain("[patch] Conflict resolved");
		});

		it("logs '[patch] Escalating to human' on failure", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const patchConfig: ResolverConfig = {
				maxAttempts: 1,
				qualityCommands: [],
				agentLogger: logger,
			};
			const patchResolver = new ResolverAgent(
				mockSpawner,
				patchConfig,
				mockQualityRunner as { run: () => Promise<{ success: boolean }> },
				mockFileReader as { read: (path: string) => Promise<string> },
			);
			mockSpawner.setExitCode(1); // Force failure

			// Act
			await patchResolver.resolve(createConflict());

			// Assert - escalation log present
			const escalateLog = logs.find((l) =>
				l.message.includes("Escalating to human"),
			);
			expect(escalateLog).toBeDefined();
			expect(escalateLog?.message).toContain("[patch] Escalating to human");
		});
	});
});
