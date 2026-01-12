/**
 * INT-03: Real Agent Feedback Loop Integration Test
 *
 * Integration tests for feedback loop with real Claude agent.
 * Tests the multi-turn redo cycle when quality checks fail.
 * Run with: npm run test:integration -- --grep "Feedback Loop"
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Not included in `npm run test` or CI.
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 4;

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;
let worktreeService: WorktreeService;
const signalParser = new SignalParser();

// Track API calls and iterations
let apiCallCount = 0;

/**
 * Helper to run Claude CLI with a prompt in a specific directory
 * Enforces budget limit
 */
async function runClaudeInDir(
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

/**
 * Simulate quality check that fails on specific content
 */
function runQualityCheck(filePath: string, requiredContent: string): boolean {
	try {
		const content = readFileSync(filePath, "utf-8");
		return content.includes(requiredContent);
	} catch {
		return false;
	}
}

/**
 * Create feedback prompt for redo iteration
 */
function createFeedbackPrompt(
	originalPrompt: string,
	feedback: string,
	iteration: number,
): string {
	return `ITERATION ${iteration} - FEEDBACK FROM PREVIOUS ATTEMPT:
${feedback}

ORIGINAL TASK:
${originalPrompt}

Please address the feedback and complete the task. Output: <chorus>COMPLETE</chorus> when done.`;
}

describe("INT-03: Feedback Loop", () => {
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
		// Reset API call counter
		apiCallCount = 0;
		// Create isolated temp git repository with .chorus directory
		repo = createGitRepoWithChorus();
		worktreeService = new WorktreeService(repo.path);
	});

	afterEach(() => {
		// Cleanup
		repo.cleanup();
	});

	it("agent addresses feedback and succeeds on second iteration", async () => {
		// Arrange
		const taskId = "ch-fb01";
		const worktree = await worktreeService.create("claude", taskId);

		// Create file that needs specific content
		const filePath = join(worktree.path, "config.ts");
		writeFileSync(filePath, "export const config = {};\n");

		const originalPrompt = `Add a "version" field with value "1.0.0" to the config object in config.ts.`;
		const requiredContent = '"version"';

		// Iteration 1: Intentionally vague prompt that might not include quotes
		const vaguePrompt = `Add version = 1.0.0 to config.ts. Output: <chorus>COMPLETE</chorus>`;

		// Act - first iteration
		const { output: output1 } = await runClaudeInDir(
			vaguePrompt,
			worktree.path,
		);
		const iteration1Complete = signalParser.isComplete(output1);
		const iteration1QualityPassed = runQualityCheck(filePath, requiredContent);

		// Check if we need second iteration
		let finalQualityPassed = iteration1QualityPassed;
		let totalIterations = 1;

		if (iteration1Complete && !iteration1QualityPassed) {
			// Feedback needed
			const feedback = `Quality check failed: config.ts must contain a "version" field as a string property with quotes.`;
			const feedbackPrompt = createFeedbackPrompt(originalPrompt, feedback, 2);

			// Act - second iteration with feedback
			const { output: output2 } = await runClaudeInDir(
				feedbackPrompt,
				worktree.path,
			);
			totalIterations = 2;
			finalQualityPassed = runQualityCheck(filePath, requiredContent);

			expect(signalParser.isComplete(output2)).toBe(true);
		}

		// Assert - task eventually succeeds (may pass first time or after feedback)
		expect(finalQualityPassed).toBe(true);
		expect(totalIterations).toBeLessThanOrEqual(2);
	}, 180000);

	it("tracks iteration count through feedback cycle", async () => {
		// Arrange
		const taskId = "ch-fb02";
		const worktree = await worktreeService.create("claude", taskId);

		const filePath = join(worktree.path, "counter.ts");
		writeFileSync(filePath, "export let count = 0;\n");

		const iterations: { iteration: number; passed: boolean }[] = [];

		// Iteration 1
		const prompt1 = `Set count to 10 in counter.ts. Output: <chorus>COMPLETE</chorus>`;
		await runClaudeInDir(prompt1, worktree.path);
		const passed1 = runQualityCheck(filePath, "count = 10");
		iterations.push({ iteration: 1, passed: passed1 });

		if (!passed1) {
			// Iteration 2 with feedback
			const feedbackPrompt = createFeedbackPrompt(
				"Set count to exactly 10",
				"The count variable must be set to exactly 10 (not 5, not 100, exactly 10)",
				2,
			);
			await runClaudeInDir(feedbackPrompt, worktree.path);
			const passed2 = runQualityCheck(filePath, "count = 10");
			iterations.push({ iteration: 2, passed: passed2 });
		}

		// Assert - iterations tracked correctly
		expect(iterations.length).toBeGreaterThanOrEqual(1);
		expect(iterations.length).toBeLessThanOrEqual(2);
		expect(iterations[iterations.length - 1].passed).toBe(true);
	}, 180000);

	it("budget limit enforced (max 4 API calls)", async () => {
		// Arrange
		const taskId = "ch-fb03";
		const worktree = await worktreeService.create("claude", taskId);

		// Use up budget with simple commands
		for (let i = 0; i < MAX_API_CALLS_PER_TEST; i++) {
			await runClaudeInDir(`echo "iteration ${i + 1}"`, worktree.path);
		}

		// Assert - next call should fail
		await expect(
			runClaudeInDir("echo 'over budget'", worktree.path),
		).rejects.toThrow("Budget exceeded");
	}, 180000);
});
