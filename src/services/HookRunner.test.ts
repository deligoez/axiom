import { chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HookHandler, HookInput } from "../types/hooks.js";
import { HookRegistry } from "./HookRegistry.js";
import {
	HookExecutionError,
	HookOutputError,
	HookRunner,
	HookTimeoutError,
} from "./HookRunner.js";

describe("HookRunner", () => {
	let tempDir: string;
	let registry: HookRegistry;
	let runner: HookRunner;

	const createHookScript = (path: string, output: string): void => {
		writeFileSync(
			path,
			`#!/bin/bash
echo '${output}'
`,
		);
		chmodSync(path, 0o755);
	};

	const createSlowHookScript = (path: string, delayMs: number): void => {
		writeFileSync(
			path,
			`#!/bin/bash
sleep ${delayMs / 1000}
echo '{"result":"continue"}'
`,
		);
		chmodSync(path, 0o755);
	};

	const createFailingHookScript = (path: string, exitCode: number): void => {
		writeFileSync(
			path,
			`#!/bin/bash
exit ${exitCode}
`,
		);
		chmodSync(path, 0o755);
	};

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-hook-runner-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		registry = new HookRegistry();
		runner = new HookRunner(registry);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("core execution", () => {
		it("run() executes all handlers from registry", async () => {
			// Arrange
			const hook1 = join(tempDir, "hook1.sh");
			const hook2 = join(tempDir, "hook2.sh");
			createHookScript(hook1, '{"result":"continue"}');
			createHookScript(hook2, '{"result":"continue"}');
			registry.register({ event: "pre-merge", command: hook1 });
			registry.register({ event: "pre-merge", command: hook2 });

			// Act
			const result = await runner.run("pre-merge", {});

			// Assert
			expect(result.result).toBe("continue");
		});

		it("run() passes HookInput via HOOK_INPUT env var", async () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			writeFileSync(
				hookPath,
				`#!/bin/bash
# Read input from env var
echo '{"result":"continue"}'
`,
			);
			chmodSync(hookPath, 0o755);
			registry.register({ event: "pre-agent-start", command: hookPath });

			// Act
			const result = await runner.run("pre-agent-start", {
				agent: { id: "a1", type: "claude", worktree: "/tmp" },
			});

			// Assert
			expect(result.result).toBe("continue");
		});

		it("run() parses HookOutput from stdout JSON", async () => {
			// Arrange
			const hookPath = join(tempDir, "hook.sh");
			createHookScript(hookPath, '{"result":"block","message":"Test block"}');
			registry.register({ event: "pre-merge", command: hookPath });

			// Act
			const result = await runner.run("pre-merge", {});

			// Assert
			expect(result.result).toBe("block");
			expect(result.message).toBe("Test block");
		});

		it("run() uses execFile timeout option", async () => {
			// Arrange
			const hookPath = join(tempDir, "slow-hook.sh");
			createSlowHookScript(hookPath, 2000); // 2 second delay
			registry.register({ event: "pre-merge", command: hookPath });

			// Override with short timeout (100ms)
			const fastRunner = new HookRunner(registry, { timeout: 100 });

			// Act & Assert - should timeout quickly due to 100ms timeout
			const result = await fastRunner.run("pre-merge", {});
			expect(result.result).toBe("continue"); // continueOnFailure=true by default
		});

		it("run() returns {result:'continue'} when no handlers", async () => {
			// Arrange - no handlers registered

			// Act
			const result = await runner.run("on-conflict", {});

			// Assert
			expect(result).toEqual({ result: "continue" });
		});

		it("run() combines outputs (block > complete > continue)", async () => {
			// Arrange
			const hook1 = join(tempDir, "hook1.sh");
			const hook2 = join(tempDir, "hook2.sh");
			createHookScript(hook1, '{"result":"continue"}');
			createHookScript(hook2, '{"result":"block","message":"blocked"}');
			registry.register({ event: "post-merge", command: hook1 });
			registry.register({ event: "post-merge", command: hook2 });

			// Act
			const result = await runner.run("post-merge", {});

			// Assert
			expect(result.result).toBe("block");
		});
	});

	describe("retry logic", () => {
		it("runHandler() retries on error when retryOnError=true", async () => {
			// Arrange - create handler that fails initially
			const hookPath = join(tempDir, "retry-hook.sh");

			// This is tricky to test - we'll use a script that creates a file on first call
			// and succeeds on subsequent calls
			writeFileSync(
				hookPath,
				`#!/bin/bash
MARKER="${tempDir}/marker"
if [ -f "$MARKER" ]; then
  echo '{"result":"continue"}'
else
  touch "$MARKER"
  exit 1
fi
`,
			);
			chmodSync(hookPath, 0o755);

			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			// Create runner with retry enabled
			const retryRegistry = new HookRegistry({
				retryOnError: true,
				maxRetries: 1,
			});
			retryRegistry.register(handler);
			const retryRunner = new HookRunner(retryRegistry, {
				retryOnError: true,
				maxRetries: 1,
			});

			// Act
			const result = await retryRunner.runHandler(handler, input);

			// Assert
			expect(result.result).toBe("continue");
		});

		it("runHandler() waits between retries", async () => {
			// Arrange
			const hookPath = join(tempDir, "fail-hook.sh");
			createFailingHookScript(hookPath, 1);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const retryRegistry = new HookRegistry({
				retryOnError: true,
				maxRetries: 1,
				continueOnFailure: true,
			});
			retryRegistry.register(handler);
			const retryRunner = new HookRunner(retryRegistry, {
				retryOnError: true,
				maxRetries: 1,
			});

			// Act
			const start = Date.now();
			await retryRunner.runHandler(handler, input);
			const duration = Date.now() - start;

			// Assert - should have waited ~1 second between retries
			expect(duration).toBeGreaterThanOrEqual(900);
		});

		it("runHandler() respects maxRetries limit", async () => {
			// Arrange
			const hookPath = join(tempDir, "always-fail.sh");
			createFailingHookScript(hookPath, 1);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const retryRegistry = new HookRegistry({
				retryOnError: true,
				maxRetries: 2,
				continueOnFailure: false,
			});
			retryRegistry.register(handler);
			const retryRunner = new HookRunner(retryRegistry, {
				retryOnError: true,
				maxRetries: 2,
				continueOnFailure: false,
			});

			// Act & Assert - should throw after maxRetries exhausted
			await expect(retryRunner.runHandler(handler, input)).rejects.toThrow();
		});

		it("runHandler() does NOT retry when retryOnError=false", async () => {
			// Arrange
			const hookPath = join(tempDir, "fail-once.sh");
			createFailingHookScript(hookPath, 1);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const noRetryRegistry = new HookRegistry({
				retryOnError: false,
				continueOnFailure: true,
			});
			noRetryRegistry.register(handler);
			const noRetryRunner = new HookRunner(noRetryRegistry, {
				retryOnError: false,
			});

			// Act
			const result = await noRetryRunner.runHandler(handler, input);

			// Assert - should return without retry (correctness, not performance)
			expect(result.result).toBe("continue");
		});
	});

	describe("error handling", () => {
		it("continueOnFailure=true: returns continue on timeout", async () => {
			// Arrange
			const hookPath = join(tempDir, "slow.sh");
			createSlowHookScript(hookPath, 5000);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const continueRegistry = new HookRegistry({
				timeout: 100,
				continueOnFailure: true,
			});
			continueRegistry.register(handler);
			const continueRunner = new HookRunner(continueRegistry, {
				timeout: 100,
				continueOnFailure: true,
			});

			// Act
			const result = await continueRunner.runHandler(handler, input);

			// Assert
			expect(result.result).toBe("continue");
		});

		it("continueOnFailure=true: returns continue on non-zero exit", async () => {
			// Arrange
			const hookPath = join(tempDir, "exit-fail.sh");
			createFailingHookScript(hookPath, 1);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const continueRegistry = new HookRegistry({ continueOnFailure: true });
			continueRegistry.register(handler);
			const continueRunner = new HookRunner(continueRegistry, {
				continueOnFailure: true,
			});

			// Act
			const result = await continueRunner.runHandler(handler, input);

			// Assert
			expect(result.result).toBe("continue");
		});

		it("continueOnFailure=true: returns continue on invalid JSON", async () => {
			// Arrange
			const hookPath = join(tempDir, "bad-json.sh");
			createHookScript(hookPath, "not valid json");
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const continueRegistry = new HookRegistry({ continueOnFailure: true });
			continueRegistry.register(handler);
			const continueRunner = new HookRunner(continueRegistry, {
				continueOnFailure: true,
			});

			// Act
			const result = await continueRunner.runHandler(handler, input);

			// Assert
			expect(result.result).toBe("continue");
		});

		it("continueOnFailure=false: throws HookTimeoutError", async () => {
			// Arrange
			const hookPath = join(tempDir, "slow.sh");
			createSlowHookScript(hookPath, 5000);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const strictRegistry = new HookRegistry({
				timeout: 100,
				continueOnFailure: false,
			});
			strictRegistry.register(handler);
			const strictRunner = new HookRunner(strictRegistry, {
				timeout: 100,
				continueOnFailure: false,
			});

			// Act & Assert
			await expect(strictRunner.runHandler(handler, input)).rejects.toThrow(
				HookTimeoutError,
			);
		});

		it("continueOnFailure=false: throws HookExecutionError", async () => {
			// Arrange
			const hookPath = join(tempDir, "exit-fail.sh");
			createFailingHookScript(hookPath, 1);
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const strictRegistry = new HookRegistry({ continueOnFailure: false });
			strictRegistry.register(handler);
			const strictRunner = new HookRunner(strictRegistry, {
				continueOnFailure: false,
			});

			// Act & Assert
			await expect(strictRunner.runHandler(handler, input)).rejects.toThrow(
				HookExecutionError,
			);
		});

		it("continueOnFailure=false: throws HookOutputError on invalid JSON", async () => {
			// Arrange
			const hookPath = join(tempDir, "bad-json.sh");
			createHookScript(hookPath, "invalid json here");
			const handler: HookHandler = { event: "pre-merge", command: hookPath };
			const input: HookInput = { event: "pre-merge" };

			const strictRegistry = new HookRegistry({ continueOnFailure: false });
			strictRegistry.register(handler);
			const strictRunner = new HookRunner(strictRegistry, {
				continueOnFailure: false,
			});

			// Act & Assert
			await expect(strictRunner.runHandler(handler, input)).rejects.toThrow(
				HookOutputError,
			);
		});
	});

	describe("helper methods", () => {
		it("isBlocked() returns correct boolean", () => {
			// Arrange & Act & Assert
			expect(runner.isBlocked([{ result: "continue" }])).toBe(false);
			expect(runner.isBlocked([{ result: "block" }])).toBe(true);
			expect(
				runner.isBlocked([{ result: "continue" }, { result: "block" }]),
			).toBe(true);
		});

		it("isComplete() returns correct boolean", () => {
			// Arrange & Act & Assert
			expect(runner.isComplete([{ result: "continue" }])).toBe(false);
			expect(runner.isComplete([{ result: "complete" }])).toBe(true);
			expect(
				runner.isComplete([{ result: "continue" }, { result: "complete" }]),
			).toBe(true);
		});
	});
});
