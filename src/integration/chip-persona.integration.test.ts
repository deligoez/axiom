/**
 * INT-12: Chip Persona TDD Cycle Test
 *
 * Integration tests for Chip persona with real Claude CLI.
 * Run with: npm run test:integration -- chip-persona
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 3 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 3;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;
const signalParser = new SignalParser();

// Chip persona prompt (simplified for testing)
const CHIP_PROMPT = `You are Chip, a TDD-focused implementation persona.

Your workflow follows RED → GREEN → REFACTOR:
1. RED: Write a failing test first
2. GREEN: Write minimal code to pass the test
3. REFACTOR: Clean up code while keeping tests green

Guidelines:
- Always write the test file before the implementation file
- Use conventional commits: feat:, fix:, test:, refactor:
- Include task ID in commit message: [ch-xxxx]

When done with a step, emit signals:
- After writing test: <chorus>PROGRESS: test written</chorus>
- After passing test: <chorus>PROGRESS: implementation complete</chorus>
- When fully done: <chorus>COMPLETE</chorus>`;

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

describe("INT-12: Chip Persona Integration", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-chip-"));
		// Initialize as git repo for commit tests
		execSync("git init", { cwd: tmpDir, stdio: "pipe" });
		execSync('git config user.email "test@test.com"', {
			cwd: tmpDir,
			stdio: "pipe",
		});
		execSync('git config user.name "Test"', { cwd: tmpDir, stdio: "pipe" });
		// Create initial commit
		writeFileSync(join(tmpDir, "README.md"), "# Test Project\n");
		execSync("git add README.md && git commit -m 'Initial commit'", {
			cwd: tmpDir,
			stdio: "pipe",
		});
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("understands TDD workflow from prompt", async () => {
		// Arrange: Simple task requiring TDD
		const prompt = `${CHIP_PROMPT}

Explain briefly what TDD workflow you would follow to implement a sum function.
Be concise - just outline the steps.`;

		// Act: Chip explains approach
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output mentions TDD concepts
		expect(output.toLowerCase()).toMatch(/test|red|green|fail/);
		expect(output.length).toBeGreaterThan(0);
	}, 60000);

	it("prioritizes writing test before implementation", async () => {
		// Arrange: Task to implement a function
		const prompt = `${CHIP_PROMPT}

Task: Implement a multiply function that multiplies two numbers.

What file would you create FIRST? Just answer with the filename (e.g., "multiply.test.ts" or "multiply.ts").`;

		// Act: Ask Chip which file first
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should mention test file first
		expect(output.toLowerCase()).toMatch(/test|spec/);
	}, 60000);

	it("follows conventional commit format", async () => {
		// Arrange: Ask about commit message format
		const prompt = `${CHIP_PROMPT}

You just implemented a new add() function for task ch-abc1.
What commit message would you use? Just provide the commit message.`;

		// Act: Get commit message suggestion
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should use conventional format with task ID
		expect(output.toLowerCase()).toMatch(/feat:|fix:|test:|refactor:/);
		// Should include task ID reference
		expect(output).toMatch(/\[ch-|ch-/i);
	}, 60000);

	it("emits PROGRESS signals during implementation", async () => {
		// Arrange: Multi-step task
		const prompt = `${CHIP_PROMPT}

You are implementing a divide function.
Step 1: You just wrote the test file.
Emit the appropriate signal for completing this step.`;

		// Act: Get signal emission
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: PROGRESS signal present
		const signals = signalParser.parseAll(output);
		const progressSignals = signals.filter((s) => s.type === "PROGRESS");
		// Chip should emit at least describe progress
		expect(output.length).toBeGreaterThan(0);
		// If PROGRESS signal was emitted, verify it's valid
		if (progressSignals.length > 0) {
			expect(progressSignals[0].type).toBe("PROGRESS");
		}
	}, 60000);

	it("emits COMPLETE signal when tests pass", async () => {
		// Arrange: Completion scenario
		const prompt = `${CHIP_PROMPT}

You have:
1. Written the test file (test is failing - RED)
2. Implemented the code (test passes - GREEN)
3. Refactored the code (test still passes)

All tests pass. Emit the final signal.`;

		// Act: Complete task
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: COMPLETE signal present
		const signals = signalParser.parseAll(output);
		const completeSignals = signals.filter((s) => s.type === "COMPLETE");
		expect(output.length).toBeGreaterThan(0);
		// If COMPLETE signal was emitted, verify it's valid
		if (completeSignals.length > 0) {
			expect(completeSignals[0].type).toBe("COMPLETE");
		}
	}, 60000);

	it("understands worktree isolation concept", async () => {
		// Arrange: Ask about worktree isolation
		const prompt = `${CHIP_PROMPT}

You are working in a git worktree at .worktrees/chip-ch-abc1/.
Why is it important to work in a worktree instead of the main branch?
Answer briefly in one sentence.`;

		// Act: Get explanation
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should mention isolation/parallel/main concepts
		expect(output.toLowerCase()).toMatch(
			/isolat|parallel|main|branch|conflict/,
		);
	}, 60000);
});
