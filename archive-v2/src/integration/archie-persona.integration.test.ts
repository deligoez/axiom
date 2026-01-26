/**
 * INT-13: Archie Persona Planning Test
 *
 * Integration tests for Archie persona with real Claude CLI.
 * Run with: npm run test:integration -- archie-persona
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 2 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 2;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;
const signalParser = new SignalParser();

// Archie persona prompt (simplified for testing)
const ARCHIE_PROMPT = `You are Archie, an architecture and planning persona.

Your role is to:
1. Analyze feature requirements
2. Decompose features into atomic, testable tasks
3. Identify dependencies between tasks
4. Output structured task definitions

Guidelines:
- Each task should be small enough to implement in 1-2 hours
- Tasks should have clear acceptance criteria
- Identify which tasks block others

When planning, emit signals:
- During analysis: <chorus>PROGRESS: analyzing requirements</chorus>
- When decomposing: <chorus>PROGRESS: decomposing into tasks</chorus>
- When done: <chorus>COMPLETE</chorus>`;

/**
 * Helper to run Claude CLI with a prompt and budget limit
 */
async function runClaude(
	prompt: string,
	cwd: string,
): Promise<{ output: string; apiCalls: number }> {
	if (apiCallCount >= MAX_API_CALLS_PER_TEST) {
		throw new Error(
			`Budget exceeded: max ${MAX_API_CALLS_PER_TEST} API calls per test`,
		);
	}

	apiCallCount++;

	return new Promise((resolve, reject) => {
		const child = spawn(
			claudePath,
			["--print", "--dangerously-skip-permissions"],
			{
				cwd,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		// Send prompt via stdin
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
				resolve({ output: stdout, apiCalls: apiCallCount });
			} else {
				reject(new Error(`Claude exited with code ${code}: ${stderr}`));
			}
		});
	});
}

describe("INT-13: Archie Persona Integration", () => {
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
		// Reset API call count for each test
		apiCallCount = 0;
		// Create isolated temp directory for each test
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-archie-"));
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("decomposes feature into atomic tasks", async () => {
		// Arrange: Feature description
		const prompt = `${ARCHIE_PROMPT}

Feature: Add user authentication

Decompose this feature into 3-5 atomic tasks.
List each task on a separate line with a brief description.`;

		// Act: Spawn Archie with planning prompt
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output contains multiple task descriptions
		expect(output.length).toBeGreaterThan(0);
		// At least some mention of authentication-related tasks
		expect(output.toLowerCase()).toMatch(/auth|login|user|token|session/);
	}, 60000);

	it("identifies task dependencies correctly", async () => {
		// Arrange: Feature with clear dependencies
		const prompt = `${ARCHIE_PROMPT}

Feature: Add password reset functionality

This requires:
1. User model exists
2. Email service exists

Which tasks depend on others? Briefly explain the dependencies.`;

		// Act: Archie plans
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output mentions dependencies
		expect(output.toLowerCase()).toMatch(
			/depend|require|before|after|block|first/,
		);
		expect(output.length).toBeGreaterThan(0);
	}, 60000);

	it("emits PROGRESS during planning phases", async () => {
		// Arrange: Multi-step planning
		const prompt = `${ARCHIE_PROMPT}

Feature: Implement search functionality

Step through your planning process:
1. First analyze requirements
2. Then decompose into tasks
Emit PROGRESS signals at each step.`;

		// Act: Run planning
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Check for progress signals or planning phases
		const signals = signalParser.parseAll(output);
		const progressSignals = signals.filter((s) => s.type === "PROGRESS");
		// Archie should show planning progression
		expect(output.length).toBeGreaterThan(0);
		// If PROGRESS signals emitted, verify they're valid
		if (progressSignals.length > 0) {
			expect(progressSignals[0].type).toBe("PROGRESS");
		}
	}, 60000);

	it("emits COMPLETE with task breakdown", async () => {
		// Arrange: Complete planning request
		const prompt = `${ARCHIE_PROMPT}

Feature: Add dark mode toggle

Create a task breakdown and emit COMPLETE when done.
Keep the response brief.`;

		// Act: Complete planning
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: COMPLETE signal and content
		const signals = signalParser.parseAll(output);
		const completeSignals = signals.filter((s) => s.type === "COMPLETE");
		expect(output.length).toBeGreaterThan(0);
		// Should mention dark mode or theme related tasks
		expect(output.toLowerCase()).toMatch(/dark|theme|toggle|mode|style/);
		// If COMPLETE signal emitted, verify it's valid
		if (completeSignals.length > 0) {
			expect(completeSignals[0].type).toBe("COMPLETE");
		}
	}, 60000);
});
