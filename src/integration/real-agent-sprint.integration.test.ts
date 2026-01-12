/**
 * INT-02: Real Agent Sprint Planning Integration Test
 *
 * Integration tests for sprint planning flow with real Claude agent.
 * Run with: npm run test:integration -- --grep "Sprint Planning"
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
import { createActor } from "xstate";
import { sprintRegionMachine } from "../machines/sprintRegion.js";
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";
import type { SprintConfig } from "../types/sprint.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 5;

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

describe("INT-02: Sprint Planning", () => {
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

	it("configures sprint with settings and spawns agent", async () => {
		// Arrange
		const sprintConfig: SprintConfig = {
			target: { type: "taskCount", count: 2 },
			iterationSettings: {
				maxIterations: 10,
				timeoutMinutes: 30,
			},
			pauseOnStuck: true,
			pauseOnErrors: true,
		};

		// Start sprint machine
		const actor = createActor(sprintRegionMachine);
		actor.start();

		// Configure sprint
		actor.send({
			type: "START_PLANNING",
			target: sprintConfig.target,
		});

		// Assert - sprint in planning state
		expect(actor.getSnapshot().value).toBe("planning");
		expect(actor.getSnapshot().context.target).toEqual(sprintConfig.target);

		// Start sprint
		actor.send({ type: "START_SPRINT" });

		// Assert - sprint running
		expect(actor.getSnapshot().value).toBe("running");

		// Create worktree for agent
		const agentType = "claude";
		const taskId = "ch-sp01";
		const worktree = await worktreeService.create(agentType, taskId);

		// Create simple task file
		const filePath = join(worktree.path, "task.ts");
		writeFileSync(filePath, "// TODO: Implement feature\n");

		const prompt = `Add the line "export const feature = true;" to task.ts. Then output: <chorus>COMPLETE</chorus>`;

		// Act - agent executes task
		const { output } = await runClaudeInDir(prompt, worktree.path);

		// Assert - agent completed task
		expect(signalParser.isComplete(output)).toBe(true);

		actor.stop();
	}, 120000);

	it("tracks sprint progress through task completions", async () => {
		// Arrange
		const actor = createActor(sprintRegionMachine);
		actor.start();

		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 2 },
		});
		actor.send({ type: "START_SPRINT" });

		// Create worktrees for multiple tasks
		const task1Worktree = await worktreeService.create("claude", "ch-sp02");
		const task2Worktree = await worktreeService.create("claude", "ch-sp03");

		// Create task files
		writeFileSync(join(task1Worktree.path, "t1.txt"), "task 1\n");
		writeFileSync(join(task2Worktree.path, "t2.txt"), "task 2\n");

		// Act - complete first task
		const { output: output1 } = await runClaudeInDir(
			`Create a file "done1.txt" with content "done". Then output: <chorus>COMPLETE</chorus>`,
			task1Worktree.path,
		);

		// Track progress
		if (signalParser.isComplete(output1)) {
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-sp02" });
		}

		// Assert - progress updated
		expect(actor.getSnapshot().context.tasksCompleted).toBe(1);
		expect(actor.getSnapshot().value).toBe("running");

		// Act - complete second task
		const { output: output2 } = await runClaudeInDir(
			`Create a file "done2.txt" with content "done". Then output: <chorus>COMPLETE</chorus>`,
			task2Worktree.path,
		);

		if (signalParser.isComplete(output2)) {
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-sp03" });
		}

		// Assert - sprint completed
		expect(actor.getSnapshot().context.tasksCompleted).toBe(2);
		expect(actor.getSnapshot().value).toBe("completed");

		actor.stop();
	}, 180000);

	it("handles sprint completion when target reached", async () => {
		// Arrange
		const actor = createActor(sprintRegionMachine);
		actor.start();

		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 1 },
		});
		actor.send({ type: "START_SPRINT" });

		// Create worktree
		const worktree = await worktreeService.create("claude", "ch-sp04");
		writeFileSync(join(worktree.path, "file.ts"), "const x = 1;\n");

		// Act - complete single task
		const { output } = await runClaudeInDir(
			`Add "export const y = 2;" to file.ts. Then output: <chorus>COMPLETE</chorus>`,
			worktree.path,
		);

		if (signalParser.isComplete(output)) {
			actor.send({ type: "TASK_COMPLETED", taskId: "ch-sp04" });
		}

		// Assert - sprint completed
		const snapshot = actor.getSnapshot();
		expect(snapshot.value).toBe("completed");
		expect(snapshot.context.tasksCompleted).toBe(1);
		expect(snapshot.context.tasksFailed).toBe(0);
		expect(snapshot.status).toBe("done");

		actor.stop();
	}, 120000);
});
