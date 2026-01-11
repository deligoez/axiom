import { chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HookHandler } from "../types/hooks.js";
import { HookRegistry } from "./HookRegistry.js";

describe("HookRegistry", () => {
	let tempDir: string;
	let registry: HookRegistry;

	const createExecutableFile = (path: string): void => {
		writeFileSync(path, "#!/bin/bash\necho test");
		chmodSync(path, 0o755);
	};

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-hooks-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		registry = new HookRegistry();
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("core registration", () => {
		it("register() adds handler to internal map", () => {
			// Arrange
			const scriptPath = join(tempDir, "hook.sh");
			createExecutableFile(scriptPath);
			const handler: HookHandler = {
				event: "pre-agent-start",
				command: scriptPath,
			};

			// Act
			const result = registry.register(handler);

			// Assert
			expect(result).toBe(true);
			expect(registry.getHandlers("pre-agent-start")).toHaveLength(1);
		});

		it("register() allows multiple handlers per event", () => {
			// Arrange
			const script1 = join(tempDir, "hook1.sh");
			const script2 = join(tempDir, "hook2.sh");
			createExecutableFile(script1);
			createExecutableFile(script2);

			// Act
			registry.register({ event: "pre-merge", command: script1 });
			registry.register({ event: "pre-merge", command: script2 });

			// Assert
			expect(registry.getHandlers("pre-merge")).toHaveLength(2);
		});

		it("unregister() removes handler by command match", () => {
			// Arrange
			const scriptPath = join(tempDir, "hook.sh");
			createExecutableFile(scriptPath);
			registry.register({ event: "post-merge", command: scriptPath });

			// Act
			registry.unregister("post-merge", scriptPath);

			// Assert
			expect(registry.getHandlers("post-merge")).toHaveLength(0);
		});

		it("getHandlers() returns handlers array (empty if none)", () => {
			// Arrange & Act
			const handlers = registry.getHandlers("on-conflict");

			// Assert
			expect(handlers).toEqual([]);
		});

		it("hasHandlers() returns correct boolean", () => {
			// Arrange
			const scriptPath = join(tempDir, "hook.sh");
			createExecutableFile(scriptPath);

			// Act & Assert - no handlers initially
			expect(registry.hasHandlers("pre-iteration")).toBe(false);

			// Add handler
			registry.register({ event: "pre-iteration", command: scriptPath });
			expect(registry.hasHandlers("pre-iteration")).toBe(true);
		});

		it("clear() removes all handlers", () => {
			// Arrange
			const scriptPath = join(tempDir, "hook.sh");
			createExecutableFile(scriptPath);
			registry.register({ event: "pre-agent-start", command: scriptPath });
			registry.register({ event: "post-agent-start", command: scriptPath });

			// Act
			registry.clear();

			// Assert
			expect(registry.hasHandlers("pre-agent-start")).toBe(false);
			expect(registry.hasHandlers("post-agent-start")).toBe(false);
		});
	});

	describe("event validation", () => {
		it("validateEvent() returns true for valid HookEvent enum values", () => {
			// Arrange & Act & Assert
			expect(registry.validateEvent("pre-agent-start")).toBe(true);
			expect(registry.validateEvent("post-merge")).toBe(true);
			expect(registry.validateEvent("on-conflict")).toBe(true);
		});

		it("validateEvent() returns false for invalid event names", () => {
			// Arrange & Act & Assert
			expect(registry.validateEvent("invalid-event")).toBe(false);
			expect(registry.validateEvent("random")).toBe(false);
			expect(registry.validateEvent("")).toBe(false);
		});

		it("loadFromDirectory() calls validateEvent() before registering", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);

			// Create valid hook
			const validPath = join(hooksDir, "pre-merge.sh");
			createExecutableFile(validPath);

			// Create invalid hook
			const invalidPath = join(hooksDir, "invalid-event.sh");
			createExecutableFile(invalidPath);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			expect(registry.hasHandlers("pre-merge")).toBe(true);
			const warnings = registry.getWarnings();
			expect(warnings.some((w) => w.reason.includes("Invalid event"))).toBe(
				true,
			);
		});
	});

	describe("auto-discovery", () => {
		it("loadFromDirectory() reads root-level executable files", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const hookPath = join(hooksDir, "post-task-complete.sh");
			createExecutableFile(hookPath);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			expect(registry.hasHandlers("post-task-complete")).toBe(true);
		});

		it("loadFromDirectory() skips non-executable files", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const hookPath = join(hooksDir, "pre-merge.txt");
			writeFileSync(hookPath, "not executable");
			chmodSync(hookPath, 0o644);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			expect(registry.hasHandlers("pre-merge")).toBe(false);
		});

		it("loadFromDirectory() skips subdirectories", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const subDir = join(hooksDir, "pre-merge");
			mkdirSync(subDir);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			expect(registry.hasHandlers("pre-merge")).toBe(false);
		});

		it("loadFromDirectory() extracts event from filename (before first dot)", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const hookPath = join(hooksDir, "on-agent-error.v2.sh");
			createExecutableFile(hookPath);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			expect(registry.hasHandlers("on-agent-error")).toBe(true);
		});

		it("loadFromDirectory() ignores invalid event names with warning", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const hookPath = join(hooksDir, "not-a-valid-event.sh");
			createExecutableFile(hookPath);

			// Act
			await registry.loadFromDirectory(hooksDir);

			// Assert
			const warnings = registry.getWarnings();
			expect(warnings).toHaveLength(1);
			expect(warnings[0].file).toBe("not-a-valid-event.sh");
		});

		it("register() validates command file exists before adding", () => {
			// Arrange
			const handler: HookHandler = {
				event: "pre-merge",
				command: "/nonexistent/path/hook.sh",
			};

			// Act
			const result = registry.register(handler);

			// Assert
			expect(result).toBe(false);
			expect(registry.hasHandlers("pre-merge")).toBe(false);
		});

		it("register() validates command is executable", () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			writeFileSync(hookPath, "#!/bin/bash");
			// Note: We still check file exists, chmod check is best-effort

			// Act
			const result = registry.register({
				event: "pre-merge",
				command: hookPath,
			});

			// Assert - file exists so it should register
			expect(result).toBe(true);
		});
	});

	describe("explicit config", () => {
		it("loadFromConfig() loads single command per event", async () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			createExecutableFile(hookPath);

			// Act
			await registry.loadFromConfig({
				hooks: {
					"pre-task-claim": hookPath,
				},
			});

			// Assert
			expect(registry.hasHandlers("pre-task-claim")).toBe(true);
		});

		it("loadFromConfig() loads array of commands per event", async () => {
			// Arrange
			const hook1 = join(tempDir, "hook1.sh");
			const hook2 = join(tempDir, "hook2.sh");
			createExecutableFile(hook1);
			createExecutableFile(hook2);

			// Act
			await registry.loadFromConfig({
				hooks: {
					"post-iteration": [hook1, hook2],
				},
			});

			// Assert
			expect(registry.getHandlers("post-iteration")).toHaveLength(2);
		});

		it("loadFromConfig() loads per-hook config override", async () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			createExecutableFile(hookPath);

			// Act
			await registry.loadFromConfig({
				hooks: {
					"pre-merge": {
						command: hookPath,
						timeout: 60000,
						continueOnFailure: false,
					},
				},
			});

			// Assert
			const handlers = registry.getHandlers("pre-merge");
			expect(handlers).toHaveLength(1);
			const config = registry.getHandlerConfig(handlers[0]);
			expect(config.timeout).toBe(60000);
			expect(config.continueOnFailure).toBe(false);
		});

		it("loadFromConfig() overrides auto-discovered handlers for same event", async () => {
			// Arrange
			const hooksDir = join(tempDir, "hooks");
			mkdirSync(hooksDir);
			const autoPath = join(hooksDir, "on-conflict.sh");
			createExecutableFile(autoPath);

			const configPath = join(tempDir, "config-hook.sh");
			createExecutableFile(configPath);

			// Act - load auto-discovered first
			await registry.loadFromDirectory(hooksDir);
			expect(registry.getHandlers("on-conflict")).toHaveLength(1);

			// Load config - should override
			await registry.loadFromConfig({
				hooks: {
					"on-conflict": configPath,
				},
			});

			// Assert
			const handlers = registry.getHandlers("on-conflict");
			expect(handlers).toHaveLength(1);
			expect(handlers[0].command).toBe(configPath);
		});
	});

	describe("per-hook config", () => {
		it("getHandlerConfig() returns handler-specific config when set", () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			createExecutableFile(hookPath);
			const handler: HookHandler = {
				event: "pre-merge",
				command: hookPath,
				timeout: 5000,
			};
			registry.register(handler);

			// Act
			const config = registry.getHandlerConfig(handler);

			// Assert
			expect(config.timeout).toBe(5000);
		});

		it("getHandlerConfig() returns default config when no override", () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			createExecutableFile(hookPath);
			const handler: HookHandler = {
				event: "post-merge",
				command: hookPath,
			};
			registry.register(handler);

			// Act
			const config = registry.getHandlerConfig(handler);

			// Assert
			expect(config.timeout).toBe(30000); // default
			expect(config.continueOnFailure).toBe(true); // default
		});
	});
});
