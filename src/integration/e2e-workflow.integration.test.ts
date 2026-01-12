/**
 * INT-05: End-to-end task completion workflow
 *
 * Integration test for complete workflow from task to merge.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	branchExists,
	createGitRepoWithChorus,
	type GitTestRepo,
	mergeBranch,
} from "../test-utils/git-fixtures.js";

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;
let worktreeService: WorktreeService;
const signalParser = new SignalParser();

/**
 * Helper to run Claude CLI with a prompt in a specific directory
 */
async function runClaudeInDir(prompt: string, cwd: string): Promise<string> {
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

/**
 * Helper to create a task in .beads/issues.jsonl
 */
function createTask(
	repoPath: string,
	taskId: string,
	title: string,
	description: string,
): void {
	const beadsPath = join(repoPath, ".beads", "issues.jsonl");
	const task = {
		id: taskId,
		title,
		description,
		status: "open",
		priority: "P1",
		created_at: new Date().toISOString(),
	};
	const existingContent = existsSync(beadsPath)
		? readFileSync(beadsPath, "utf-8")
		: "";
	writeFileSync(beadsPath, `${existingContent}${JSON.stringify(task)}\n`);
}

/**
 * Helper to run quality check
 */
function runQualityCheck(worktreePath: string, filename: string): boolean {
	return existsSync(join(worktreePath, filename));
}

describe("INT-05: End-to-end task completion workflow", () => {
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
		// Create isolated temp git repository with .chorus directory
		repo = createGitRepoWithChorus();
		worktreeService = new WorktreeService(repo.path);
	});

	afterEach(() => {
		// Cleanup
		repo.cleanup();
	});

	it("completes full workflow from task creation to merge", async () => {
		// === STEP 1: Create task in .beads/issues.jsonl ===
		const taskId = "ch-e2e01";
		const taskTitle = "Create solution file";
		const taskDescription = "Create solution.txt with content: TASK_SOLVED";

		createTask(repo.path, taskId, taskTitle, taskDescription);

		// Verify task was created
		const beadsContent = readFileSync(
			join(repo.path, ".beads", "issues.jsonl"),
			"utf-8",
		);
		expect(beadsContent).toContain(taskId);

		// === STEP 2: Agent claims task → worktree created ===
		const worktree = await worktreeService.create("claude", taskId);

		// Verify worktree exists
		expect(existsSync(worktree.path)).toBe(true);

		// Verify branch was created
		expect(branchExists(repo.path, `agent/claude/${taskId}`)).toBe(true);

		// === STEP 3: Agent executes task ===
		const prompt = `
You are working on task ${taskId}: ${taskTitle}
Task description: ${taskDescription}

Create a file named "solution.txt" in the current directory with exactly this content: TASK_SOLVED

After creating the file, run:
1. git add solution.txt
2. git commit -m "Implement ${taskId}: ${taskTitle}"

Then output this signal at the end: <chorus>COMPLETE</chorus>
`;

		const output = await runClaudeInDir(prompt, worktree.path);

		// === STEP 4: Agent signals TASK_COMPLETE ===
		expect(signalParser.isComplete(output)).toBe(true);

		// === STEP 5: Quality check passes ===
		const qualityPassed = runQualityCheck(worktree.path, "solution.txt");
		expect(qualityPassed).toBe(true);

		// Verify file content
		const solutionContent = readFileSync(
			join(worktree.path, "solution.txt"),
			"utf-8",
		);
		expect(solutionContent.trim()).toBe("TASK_SOLVED");

		// === STEP 6: Merge to main branch ===
		// First, make sure there's a commit to merge
		const commitCount = execSync("git log --oneline | wc -l", {
			cwd: worktree.path,
			encoding: "utf-8",
		}).trim();
		expect(Number.parseInt(commitCount, 10)).toBeGreaterThan(0);

		// Merge the agent branch to main
		mergeBranch(repo.path, `agent/claude/${taskId}`);

		// === STEP 7: Verify solution.txt in main ===
		const mainSolutionPath = join(repo.path, "solution.txt");
		expect(existsSync(mainSolutionPath)).toBe(true);

		const mainSolutionContent = readFileSync(mainSolutionPath, "utf-8");
		expect(mainSolutionContent.trim()).toBe("TASK_SOLVED");

		// === STEP 8: Cleanup worktree ===
		await worktreeService.remove("claude", taskId, {
			force: true,
			deleteBranch: true, // Safe to delete since we merged
		});

		// Verify worktree removed
		expect(existsSync(worktree.path)).toBe(false);

		// Verify branch deleted (since it was merged)
		expect(branchExists(repo.path, `agent/claude/${taskId}`)).toBe(false);
	}, 180000);
});
