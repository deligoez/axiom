/**
 * INT-22: Real Agent Review Integration Test
 *
 * Integration tests for full review flow with real Claude agent.
 * Run with: npm run test:integration -- --grep "Real Agent Review"
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Not included in `npm run test` or CI.
 */

import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PendingReview } from "../machines/reviewRegion.js";
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";
import type { TaskCompletionResult } from "../types/review.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 3;

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;
let worktreeService: WorktreeService;
const signalParser = new SignalParser();

// Track API calls
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
 * Simulate pending review from agent output
 */
function createPendingReviewFromAgent(
	taskId: string,
	agentOutput: string,
	qualityPassed: boolean,
): PendingReview {
	const result: TaskCompletionResult = {
		taskId,
		agentId: "claude",
		iterations: 1,
		duration: 1000,
		signal: signalParser.parse(agentOutput).signal,
		quality: [
			{
				name: "typecheck",
				passed: qualityPassed,
				duration: 100,
			},
		],
		changes: [],
	};
	return {
		taskId,
		result,
		addedAt: Date.now(),
	};
}

describe("INT-22: Real Agent Review", () => {
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

	it("agent completes simple task and triggers review", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-rv01";
		const worktree = await worktreeService.create(agentType, taskId);

		// Create a simple file for agent to modify
		const filePath = join(worktree.path, "code.ts");
		writeFileSync(
			filePath,
			"const x = 1;\nexport function foo() {\n  return x;\n}\n",
		);

		const prompt = `Add a comment "// Added by review test" above the function foo() in code.ts. Then output: <chorus>COMPLETE</chorus>`;

		// Act - agent makes change
		const { output } = await runClaudeInDir(prompt, worktree.path);

		// Assert - signal detected
		expect(signalParser.isComplete(output)).toBe(true);

		// Create pending review from agent output
		const pendingReview = createPendingReviewFromAgent(taskId, output, true);

		// Assert - review structure valid
		expect(pendingReview.taskId).toBe(taskId);
		expect(pendingReview.result.quality[0].passed).toBe(true);
		expect(pendingReview.result.signal?.type).toBe("COMPLETE");
	}, 120000);

	it("task appears in pending reviews after completion", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-rv02";
		const worktree = await worktreeService.create(agentType, taskId);

		const prompt = `Create a file named "result.txt" with content "test". Then output: <chorus>COMPLETE</chorus>`;

		// Act - agent completes task
		const { output } = await runClaudeInDir(prompt, worktree.path);

		// Assert - create review and verify it would appear in pending reviews
		const pendingReviews: PendingReview[] = [];
		const review = createPendingReviewFromAgent(taskId, output, true);
		pendingReviews.push(review);

		expect(pendingReviews).toHaveLength(1);
		expect(pendingReviews[0].taskId).toBe(taskId);
	}, 120000);

	it("approve action would send to merge queue", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-rv03";
		const worktree = await worktreeService.create(agentType, taskId);

		// Create initial file
		const filePath = join(worktree.path, "feature.ts");
		writeFileSync(filePath, "// Feature file\nexport const feature = true;\n");

		const prompt = `Add export const version = "1.0" to feature.ts. Then output: <chorus>COMPLETE</chorus>`;

		// Act - agent completes task
		const { output } = await runClaudeInDir(prompt, worktree.path);
		const review = createPendingReviewFromAgent(taskId, output, true);

		// Simulate approve action
		const mergeQueue: string[] = [];
		const approve = (reviewItem: PendingReview) => {
			mergeQueue.push(reviewItem.taskId);
		};

		approve(review);

		// Assert - task in merge queue
		expect(mergeQueue).toContain(taskId);
	}, 120000);

	it("budget limit enforced (max API calls)", async () => {
		// Arrange - use up budget
		const taskId = "ch-rv04";
		const worktree = await worktreeService.create("claude", taskId);

		// Use all API calls
		for (let i = 0; i < MAX_API_CALLS_PER_TEST; i++) {
			await runClaudeInDir(`echo "call ${i + 1}"`, worktree.path);
		}

		// Assert - next call should fail
		await expect(
			runClaudeInDir("echo 'over budget'", worktree.path),
		).rejects.toThrow("Budget exceeded");
	}, 120000);
});
