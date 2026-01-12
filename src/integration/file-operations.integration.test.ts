/**
 * INT-02: Claude file operations (write, append, read)
 *
 * Integration tests for deterministic file operations via Claude CLI.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";

/**
 * Helper to run Claude CLI with a prompt and return stdout
 */
async function runClaude(prompt: string, cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			claudePath,
			["--print", "--dangerously-skip-permissions"],
			{
				cwd,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		// Send prompt via stdin (required for --print mode in subprocess)
		child.stdin?.write(prompt);
		child.stdin?.end();

		let stdout = "";
		let stderr = "";

		child.stdout?.on("data", (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Claude exited with code ${code}: ${stderr}`));
			}
		});
	});
}

describe("INT-02: Claude file operations", () => {
	beforeAll(() => {
		// Find full path to claude CLI
		try {
			claudePath = execSync("which claude", {
				stdio: "pipe",
				encoding: "utf-8",
			}).trim();
		} catch {
			throw new Error(
				"Claude CLI not found. Install it first: https://claude.ai/cli",
			);
		}
	});

	beforeEach(() => {
		// Create isolated temp directory for each test
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-int-"));
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("creates a file with specific content", async () => {
		// Arrange
		const filename = "test.txt";
		const expectedContent = "HELLO_WORLD";
		const prompt = `Create a file named "${filename}" in the current directory with exactly this content (no extra whitespace or newlines): ${expectedContent}`;

		// Act
		await runClaude(prompt, tmpDir);

		// Assert
		const filePath = join(tmpDir, filename);
		expect(existsSync(filePath)).toBe(true);
		const content = readFileSync(filePath, "utf-8");
		expect(content.trim()).toBe(expectedContent);
	}, 60000);

	it("appends content to existing file", async () => {
		// Arrange
		const filename = "existing.txt";
		const initialContent = "LINE1";
		const appendContent = "LINE2";
		const filePath = join(tmpDir, filename);
		writeFileSync(filePath, `${initialContent}\n`);

		const prompt = `Append exactly "${appendContent}" as a new line to the file "${filename}" in the current directory.`;

		// Act
		await runClaude(prompt, tmpDir);

		// Assert
		const content = readFileSync(filePath, "utf-8");
		expect(content).toContain(initialContent);
		expect(content).toContain(appendContent);
	}, 60000);

	it("reads file and outputs content", async () => {
		// Arrange
		const filename = "read-test.txt";
		const fileContent = "UNIQUE_READ_CONTENT_12345";
		const filePath = join(tmpDir, filename);
		writeFileSync(filePath, fileContent);

		const prompt = `Read the file "${filename}" in the current directory and output its exact content.`;

		// Act
		const output = await runClaude(prompt, tmpDir);

		// Assert - Claude's output should contain the file content
		expect(output).toContain(fileContent);
	}, 60000);
});
