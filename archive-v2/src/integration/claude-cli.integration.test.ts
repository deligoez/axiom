/**
 * INT-01: Basic Claude CLI spawn and response
 *
 * Integration tests that actually spawn Claude CLI.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";

// Find full path to claude CLI
let claudePath = "claude";

describe("INT-01: Basic Claude CLI spawn and response", () => {
	beforeAll(() => {
		// Find full path to claude CLI
		try {
			claudePath = execSync("which claude", {
				stdio: "pipe",
				encoding: "utf-8",
			}).trim();
			console.log(`Claude CLI path: ${claudePath}`);
		} catch {
			throw new Error(
				"Claude CLI not found. Install it first: https://claude.ai/cli",
			);
		}

		// Verify CLI works
		try {
			const version = execSync(`${claudePath} --version`, {
				stdio: "pipe",
				encoding: "utf-8",
			});
			console.log(`Claude CLI version: ${version.trim()}`);
		} catch (error) {
			throw new Error(
				`Claude CLI not configured: ${error instanceof Error ? error.message : error}`,
			);
		}
	});

	it("spawns Claude and receives exit code 0", async () => {
		// Arrange & Act
		const exitCode = await new Promise<number>((resolve, reject) => {
			const child = spawn(claudePath, ["--print"], {
				cwd: process.cwd(),
				stdio: ["pipe", "pipe", "pipe"],
			});

			// Send prompt via stdin (required for --print mode in subprocess)
			child.stdin?.write('Say "OK"');
			child.stdin?.end();

			child.on("error", reject);
			child.on("exit", (code) => resolve(code ?? 1));
		});

		// Assert
		expect(exitCode).toBe(0);
	}, 60000);

	it("receives output from Claude", async () => {
		// Arrange
		const expectedText = "HELLO_INTEGRATION_TEST";

		// Act
		const output = await new Promise<string>((resolve, reject) => {
			const child = spawn(claudePath, ["--print"], {
				cwd: process.cwd(),
				stdio: ["pipe", "pipe", "pipe"],
			});

			// Send prompt via stdin (required for --print mode in subprocess)
			child.stdin?.write(`Output exactly: ${expectedText}`);
			child.stdin?.end();

			let stdout = "";
			child.stdout?.on("data", (chunk) => {
				stdout += chunk.toString();
			});

			child.on("error", reject);
			child.on("exit", () => resolve(stdout));
		});

		// Assert - Claude should include the expected text somewhere in output
		expect(output).toContain(expectedText);
	}, 60000);

	it("handles invalid cwd with error", async () => {
		// Arrange & Act & Assert
		await expect(
			new Promise<void>((resolve, reject) => {
				const child = spawn(claudePath, ["--print", "test"], {
					cwd: "/nonexistent/path/12345/that/does/not/exist",
					stdio: ["pipe", "pipe", "pipe"],
				});

				child.on("error", reject);
				child.on("exit", (code) => {
					if (code === 0) resolve();
					else reject(new Error(`Exit code: ${code}`));
				});
			}),
		).rejects.toThrow();
	}, 10000);
});
