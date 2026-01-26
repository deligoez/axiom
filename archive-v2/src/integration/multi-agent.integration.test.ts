/**
 * INT-04: Multi-agent parallel execution
 *
 * Integration tests for multiple agents working in parallel.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;
let worktreeService: WorktreeService;

/**
 * Helper to run Claude CLI with a prompt in a specific directory
 * Returns a promise that resolves with the output
 */
function runClaudeAsync(prompt: string, cwd: string): Promise<string> {
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

describe("INT-04: Multi-agent parallel execution", () => {
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

	it("runs 2 agents in parallel creating different files", async () => {
		// Arrange
		const worktree1 = await worktreeService.create("claude", "ch-para1");
		const worktree2 = await worktreeService.create("claude", "ch-para2");

		const prompt1 = `Create a file named "agent1.txt" in the current directory with exactly this content: AGENT_1_OUTPUT`;
		const prompt2 = `Create a file named "agent2.txt" in the current directory with exactly this content: AGENT_2_OUTPUT`;

		// Act - run both agents in parallel
		const [result1, result2] = await Promise.all([
			runClaudeAsync(prompt1, worktree1.path),
			runClaudeAsync(prompt2, worktree2.path),
		]);

		// Assert - both agents completed (didn't throw)
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();

		// Assert - files created in correct worktrees
		const file1Path = join(worktree1.path, "agent1.txt");
		const file2Path = join(worktree2.path, "agent2.txt");

		expect(existsSync(file1Path)).toBe(true);
		expect(existsSync(file2Path)).toBe(true);

		// Assert - content is correct
		expect(readFileSync(file1Path, "utf-8").trim()).toBe("AGENT_1_OUTPUT");
		expect(readFileSync(file2Path, "utf-8").trim()).toBe("AGENT_2_OUTPUT");
	}, 180000);

	it("maintains worktree isolation - no cross-contamination", async () => {
		// Arrange
		const worktreeA = await worktreeService.create("claude", "ch-isola");
		const worktreeB = await worktreeService.create("claude", "ch-isolb");

		const promptA = `Create a file named "file-a.txt" in the current directory with content: ONLY_IN_A`;
		const promptB = `Create a file named "file-b.txt" in the current directory with content: ONLY_IN_B`;

		// Act - run both agents in parallel
		await Promise.all([
			runClaudeAsync(promptA, worktreeA.path),
			runClaudeAsync(promptB, worktreeB.path),
		]);

		// Assert - file-a only exists in worktree A
		expect(existsSync(join(worktreeA.path, "file-a.txt"))).toBe(true);
		expect(existsSync(join(worktreeB.path, "file-a.txt"))).toBe(false);

		// Assert - file-b only exists in worktree B
		expect(existsSync(join(worktreeB.path, "file-b.txt"))).toBe(true);
		expect(existsSync(join(worktreeA.path, "file-b.txt"))).toBe(false);
	}, 180000);

	it("agents complete independently", async () => {
		// Arrange
		const worktree1 = await worktreeService.create("claude", "ch-indp1");
		const worktree2 = await worktreeService.create("claude", "ch-indp2");

		// Prompt 1 should be faster (simpler task)
		const prompt1 = `Create a file named "quick.txt" with content: QUICK`;
		// Prompt 2 is slightly more complex
		const prompt2 = `Create a file named "detailed.txt". Write the content: DETAILED_TASK_COMPLETE`;

		// Act - track completion order
		const completions: string[] = [];

		const promise1 = runClaudeAsync(prompt1, worktree1.path).then((result) => {
			completions.push("agent1");
			return result;
		});

		const promise2 = runClaudeAsync(prompt2, worktree2.path).then((result) => {
			completions.push("agent2");
			return result;
		});

		await Promise.all([promise1, promise2]);

		// Assert - both completed
		expect(completions).toHaveLength(2);
		expect(completions).toContain("agent1");
		expect(completions).toContain("agent2");

		// Assert - files exist
		expect(existsSync(join(worktree1.path, "quick.txt"))).toBe(true);
		expect(existsSync(join(worktree2.path, "detailed.txt"))).toBe(true);
	}, 180000);
});
