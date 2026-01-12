/**
 * Integration tests for real Claude CLI calls.
 *
 * These tests actually spawn Claude CLI and make API calls.
 * They are SLOW and require:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 * - Network access
 *
 * Run with: npm run test:integration
 * NOT included in default test run.
 */

import { execSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { CLIAgentSpawner } from "../services/AgentSpawner.js";

describe("Integration: Claude CLI", () => {
	beforeAll(() => {
		// Verify Claude CLI is available
		try {
			execSync("which claude", { stdio: "pipe" });
		} catch {
			throw new Error(
				"Claude CLI not found. Install it first: https://claude.ai/cli",
			);
		}

		// Verify API key is configured
		try {
			const version = execSync("claude --version", {
				stdio: "pipe",
				encoding: "utf-8",
			});
			console.log(`Claude CLI version: ${version.trim()}`);
		} catch (error) {
			throw new Error(
				`Claude CLI not configured properly: ${error instanceof Error ? error.message : error}`,
			);
		}
	});

	describe("AgentSpawner", () => {
		it("spawns Claude CLI and receives response", async () => {
			// Arrange
			const spawner = new CLIAgentSpawner();
			const prompt =
				'Respond with exactly: "INTEGRATION_TEST_SUCCESS". Nothing else.';

			// Act
			const agent = await spawner.spawn({
				prompt,
				cwd: process.cwd(),
			});

			// Collect stdout
			let output = "";
			agent.stdout.on("data", (chunk: Buffer) => {
				output += chunk.toString();
			});

			// Wait for exit
			const exitCode = await agent.exitCode;

			// Assert
			expect(exitCode).toBe(0);
			expect(output).toContain("INTEGRATION_TEST_SUCCESS");
		}, 30000); // 30 second timeout

		it("handles simple coding task", async () => {
			// Arrange
			const spawner = new CLIAgentSpawner();
			const prompt =
				'Write a TypeScript function called "add" that adds two numbers. Only output the function, no explanation.';

			// Act
			const agent = await spawner.spawn({
				prompt,
				cwd: process.cwd(),
			});

			let output = "";
			agent.stdout.on("data", (chunk: Buffer) => {
				output += chunk.toString();
			});

			const exitCode = await agent.exitCode;

			// Assert
			expect(exitCode).toBe(0);
			expect(output).toMatch(/function\s+add/);
			expect(output).toMatch(/number/);
		}, 30000);
	});

	describe("Signal parsing with real output", () => {
		it("Claude can output structured signals", async () => {
			// Arrange
			const spawner = new CLIAgentSpawner();
			const prompt = `Output this exact text on a single line:
[CHORUS:TASK_COMPLETE:{"success":true,"summary":"test completed"}]

Do not add any other text before or after.`;

			// Act
			const agent = await spawner.spawn({
				prompt,
				cwd: process.cwd(),
			});

			let output = "";
			agent.stdout.on("data", (chunk: Buffer) => {
				output += chunk.toString();
			});

			await agent.exitCode;

			// Assert - verify signal format is preserved
			expect(output).toContain("[CHORUS:TASK_COMPLETE:");
			expect(output).toContain("success");
		}, 30000);
	});

	describe("Error handling", () => {
		it("handles invalid cwd gracefully", async () => {
			// Arrange
			const spawner = new CLIAgentSpawner();

			// Act & Assert
			await expect(
				spawner.spawn({
					prompt: "test",
					cwd: "/nonexistent/directory/that/should/not/exist",
				}),
			).rejects.toThrow();
		});
	});
});
