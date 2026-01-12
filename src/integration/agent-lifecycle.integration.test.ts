/**
 * INT-03: Agent lifecycle with worktree
 *
 * Integration tests for full agent lifecycle with git worktree.
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
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	branchExists,
	createGitRepoWithChorus,
	type GitTestRepo,
	listWorktrees,
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

describe("INT-03: Agent lifecycle with worktree", () => {
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

	it("creates worktree for agent task", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-int01";

		// Act
		const worktree = await worktreeService.create(agentType, taskId);

		// Assert - worktree directory exists
		expect(existsSync(worktree.path)).toBe(true);

		// Assert - branch was created
		expect(branchExists(repo.path, `agent/${agentType}/${taskId}`)).toBe(true);

		// Assert - scratchpad was created
		const scratchpadPath = join(worktree.path, ".agent", "scratchpad.md");
		expect(existsSync(scratchpadPath)).toBe(true);
	});

	it("agent makes change in worktree and commits", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-int02";
		const worktree = await worktreeService.create(agentType, taskId);

		const filename = "feature.txt";
		const content = "FEATURE_IMPLEMENTED";
		const prompt = `Create a file named "${filename}" in the current directory with exactly this content: ${content}. Then run git add and git commit with message "Add feature file".`;

		// Act
		await runClaudeInDir(prompt, worktree.path);

		// Assert - file exists
		const filePath = join(worktree.path, filename);
		expect(existsSync(filePath)).toBe(true);

		// Assert - content matches
		const fileContent = readFileSync(filePath, "utf-8");
		expect(fileContent.trim()).toBe(content);

		// Assert - commit was made (check git log)
		const log = execSync("git log --oneline -1", {
			cwd: worktree.path,
			encoding: "utf-8",
		});
		expect(log.toLowerCase()).toContain("feature");
	}, 120000);

	it("detects COMPLETE signal from agent output", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-int03";
		const worktree = await worktreeService.create(agentType, taskId);

		const prompt = `Create a file named "task.txt" with content "done". Then output exactly this text at the end of your response: <chorus>COMPLETE</chorus>`;

		// Act
		const output = await runClaudeInDir(prompt, worktree.path);

		// Assert - signal is detected
		expect(signalParser.isComplete(output)).toBe(true);

		const result = signalParser.parse(output);
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("COMPLETE");
	}, 120000);

	it("cleans up worktree after agent completes", async () => {
		// Arrange
		const agentType = "claude";
		const taskId = "ch-int04";
		const worktree = await worktreeService.create(agentType, taskId);

		// Verify worktree exists
		expect(existsSync(worktree.path)).toBe(true);
		expect(listWorktrees(repo.path).length).toBeGreaterThan(1);

		// Act - remove worktree with force (because of untracked .agent/ files)
		await worktreeService.remove(agentType, taskId, {
			force: true,
			deleteBranch: false, // Keep branch for potential recovery
		});

		// Assert - worktree directory removed
		expect(existsSync(worktree.path)).toBe(false);

		// Assert - only main worktree remains
		const remainingWorktrees = listWorktrees(repo.path);
		expect(remainingWorktrees).toHaveLength(1);
	});
});
