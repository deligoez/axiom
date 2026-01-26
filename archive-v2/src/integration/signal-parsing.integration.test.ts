/**
 * INT-06: Signal parsing from real Claude output
 *
 * Integration tests to verify our signal parser works with real Claude output.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
const signalParser = new SignalParser();

/**
 * Helper to run Claude CLI with a prompt and return stdout
 */
async function runClaude(prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			claudePath,
			["--print", "--dangerously-skip-permissions"],
			{
				cwd: tmpDir,
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

describe("INT-06: Signal parsing from real Claude output", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-signal-"));
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("parses COMPLETE signal from Claude output", async () => {
		// Arrange
		const prompt = `Output exactly this text at the end of your response (include the angle brackets): <chorus>COMPLETE</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert
		expect(signalParser.isComplete(output)).toBe(true);

		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("COMPLETE");
	}, 60000);

	it("parses BLOCKED signal with payload", async () => {
		// Arrange
		const prompt = `Output ONLY this exact text, nothing else before or after: <chorus>BLOCKED:Missing dependency</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert - check if output contains a BLOCKED signal
		expect(signalParser.isBlocked(output)).toBe(true);

		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("BLOCKED");
		// Payload may vary slightly, just check it exists
		expect(result.signal?.payload).toBeTruthy();
	}, 60000);

	it("parses PROGRESS signal with numeric value", async () => {
		// Arrange
		const prompt = `Output exactly this text at the end of your response: <chorus>PROGRESS:75</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert
		const progress = signalParser.getProgress(output);
		expect(progress).toBe(75);

		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("PROGRESS");
	}, 60000);

	it("extracts signal from mixed output (embedded in explanation)", async () => {
		// Arrange
		const prompt = `First, write a short explanation (2-3 sentences) about testing. Then, on a new line at the very end, output exactly: <chorus>COMPLETE</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert - should find signal even in mixed content
		expect(signalParser.isComplete(output)).toBe(true);

		// Verify there's other content besides the signal
		const signalRemoved = output.replace(/<chorus>COMPLETE<\/chorus>/g, "");
		expect(signalRemoved.trim().length).toBeGreaterThan(10);
	}, 60000);

	it("parses NEEDS_HELP signal with reason payload", async () => {
		// Arrange
		const prompt = `Output ONLY this exact text, nothing else: <chorus>NEEDS_HELP:Cannot access API endpoint</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert
		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("NEEDS_HELP");
		expect(result.signal?.payload).toBeTruthy();
	}, 60000);

	it("parses NEEDS_HUMAN signal with context payload", async () => {
		// Arrange
		const prompt = `Output ONLY this exact text, nothing else: <chorus>NEEDS_HUMAN:Decision required on architecture</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert
		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("NEEDS_HUMAN");
		expect(result.signal?.payload).toBeTruthy();
	}, 60000);

	it("parses RESOLVED signal from agent output", async () => {
		// Arrange
		const prompt = `Output ONLY this exact text, nothing else: <chorus>RESOLVED:Merge conflict fixed</chorus>`;

		// Act
		const output = await runClaude(prompt);

		// Assert
		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("RESOLVED");
		expect(result.signal?.payload).toBeTruthy();
	}, 60000);
});
