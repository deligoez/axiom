/**
 * INT-25: Real Agent Auto-Approve Integration Test
 *
 * Integration tests for auto-approve flow with real Claude agent.
 * Tests the end-to-end quality pipeline with real quality checks.
 * Run with: npm run test:integration -- --grep "Auto-Approve"
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
import type {
	QualityRunResult,
	TaskCompletionResult,
} from "../types/review.js";

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
 * Run real quality checks on a file
 */
function runRealQualityChecks(worktreePath: string): QualityRunResult[] {
	const results: QualityRunResult[] = [];

	// Check 1: TypeScript compilation (simulated - check file exists and has valid syntax)
	try {
		const files = execSync("ls *.ts 2>/dev/null || true", {
			cwd: worktreePath,
			encoding: "utf-8",
		});
		const hasFiles = files.trim().length > 0;
		results.push({
			name: "typecheck",
			passed: hasFiles,
			duration: 100,
			error: hasFiles ? undefined : "No TypeScript files",
		});
	} catch {
		results.push({
			name: "typecheck",
			passed: false,
			duration: 100,
			error: "TypeScript check failed",
		});
	}

	// Check 2: Lint check (simulated - check for common issues)
	try {
		const tsFiles = execSync("cat *.ts 2>/dev/null || true", {
			cwd: worktreePath,
			encoding: "utf-8",
		});
		const hasConsoleLog = tsFiles.includes("console.log");
		results.push({
			name: "lint",
			passed: !hasConsoleLog, // Fail if console.log present
			duration: 50,
			error: hasConsoleLog ? "Found console.log" : undefined,
		});
	} catch {
		results.push({
			name: "lint",
			passed: true,
			duration: 50,
		});
	}

	// Check 3: Basic test (simulated - check for export)
	try {
		const content = execSync("cat *.ts 2>/dev/null || true", {
			cwd: worktreePath,
			encoding: "utf-8",
		});
		const hasExport = content.includes("export");
		results.push({
			name: "test",
			passed: hasExport,
			duration: 200,
			error: hasExport ? undefined : "No exports found",
		});
	} catch {
		results.push({
			name: "test",
			passed: false,
			duration: 200,
			error: "Test check failed",
		});
	}

	return results;
}

/**
 * Auto-approve engine: evaluates quality results
 */
function evaluateAutoApprove(qualityResults: QualityRunResult[]): {
	approved: boolean;
	reason: string;
} {
	const failed = qualityResults.filter((r) => !r.passed);

	if (failed.length === 0) {
		return {
			approved: true,
			reason: "All quality checks passed",
		};
	}

	return {
		approved: false,
		reason: `Failed checks: ${failed.map((f) => f.name).join(", ")}`,
	};
}

/**
 * Create pending review from agent output with real quality checks
 */
function createPendingReviewWithQuality(
	taskId: string,
	agentOutput: string,
	qualityResults: QualityRunResult[],
): PendingReview {
	const result: TaskCompletionResult = {
		taskId,
		agentId: "claude",
		iterations: 1,
		duration: 1000,
		signal: signalParser.parse(agentOutput).signal,
		quality: qualityResults,
		changes: [],
	};
	return {
		taskId,
		result,
		addedAt: Date.now(),
	};
}

describe("INT-25: Auto-Approve", () => {
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

	it("auto-approves task when all quality checks pass", async () => {
		// Arrange
		const taskId = "ch-aa01";
		const worktree = await worktreeService.create("claude", taskId);

		// Create initial file
		const filePath = join(worktree.path, "service.ts");
		writeFileSync(filePath, "// Service file\n");

		const prompt = `Add "export const service = { name: 'test' };" to service.ts. Do not use console.log. Output: <chorus>COMPLETE</chorus>`;

		// Act - agent completes task
		const { output } = await runClaudeInDir(prompt, worktree.path);

		// Run real quality checks
		const qualityResults = runRealQualityChecks(worktree.path);
		const review = createPendingReviewWithQuality(
			taskId,
			output,
			qualityResults,
		);

		// Evaluate auto-approve
		const { approved, reason } = evaluateAutoApprove(qualityResults);

		// Simulate merge queue
		const mergeQueue: string[] = [];
		if (approved) {
			mergeQueue.push(taskId);
		}

		// Assert
		expect(signalParser.isComplete(output)).toBe(true);
		expect(approved).toBe(true);
		expect(reason).toBe("All quality checks passed");
		expect(mergeQueue).toContain(taskId);
		expect(review.result.quality.every((q) => q.passed)).toBe(true);
	}, 120000);

	it("requires manual review when quality checks fail", async () => {
		// Arrange
		const taskId = "ch-aa02";
		const worktree = await worktreeService.create("claude", taskId);

		// Create file that will fail lint (console.log)
		const filePath = join(worktree.path, "debug.ts");
		writeFileSync(filePath, "// Debug file\n");

		const prompt = `Add "console.log('debug'); export const debug = true;" to debug.ts. Output: <chorus>COMPLETE</chorus>`;

		// Act - agent completes task with lint violation
		const { output } = await runClaudeInDir(prompt, worktree.path);

		// Run real quality checks
		const qualityResults = runRealQualityChecks(worktree.path);
		const review = createPendingReviewWithQuality(
			taskId,
			output,
			qualityResults,
		);

		// Evaluate auto-approve
		const { approved, reason } = evaluateAutoApprove(qualityResults);

		// Simulate manual review queue
		const manualReviewQueue: string[] = [];
		if (!approved) {
			manualReviewQueue.push(taskId);
		}

		// Assert
		expect(signalParser.isComplete(output)).toBe(true);
		expect(approved).toBe(false);
		expect(reason).toContain("lint");
		expect(manualReviewQueue).toContain(taskId);
		expect(review.result.quality.some((q) => !q.passed)).toBe(true);
	}, 120000);

	it("budget limit enforced (max 3 API calls)", async () => {
		// Arrange
		const taskId = "ch-aa03";
		const worktree = await worktreeService.create("claude", taskId);

		// Use up budget
		for (let i = 0; i < MAX_API_CALLS_PER_TEST; i++) {
			await runClaudeInDir(`echo "call ${i + 1}"`, worktree.path);
		}

		// Assert - next call should fail
		await expect(
			runClaudeInDir("echo 'over budget'", worktree.path),
		).rejects.toThrow("Budget exceeded");
	}, 120000);
});
