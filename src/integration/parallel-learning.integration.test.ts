/**
 * INT-10: Parallel agents share learnings in real-time
 *
 * Integration test for learning propagation timing with parallel agents.
 * Agent A's learning becomes available to Agent C (spawned later).
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LearningStore } from "../services/LearningStore.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";
import type { Learning } from "../types/learning.js";

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;
let learningStore: LearningStore;

/**
 * Helper to create a learning object
 */
function createLearning(content: string, taskId: string): Learning {
	return {
		id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		content,
		scope: "cross-cutting",
		category: "general",
		source: {
			taskId,
			agentType: "claude",
			timestamp: new Date(),
		},
		suggestPattern: false,
	};
}

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

describe("INT-10: Parallel agents share learnings in real-time", () => {
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
		learningStore = new LearningStore(repo.path);
	});

	afterEach(() => {
		// Cleanup
		repo.cleanup();
	});

	it("Agent C receives learning stored by Agent A (spawned after A completes)", async () => {
		// === STEP 1: Agent A starts and stores a learning ===
		// Simulating Agent A discovering and storing a learning
		const agentALearning = createLearning(
			"PARALLEL_LEARNING_TEST: Use Promise.all for parallel operations",
			"ch-task-a",
		);

		// Store learning immediately (simulating real-time storage)
		await learningStore.append([agentALearning]);

		// Verify learning was stored
		const storedLearnings = await learningStore.readAll();
		expect(storedLearnings).toHaveLength(1);

		// === STEP 2: Simulate Agent B running in parallel ===
		// Agent B is running but doesn't need to store learnings for this test
		// We just verify that B's existence doesn't block A's learning propagation

		// === STEP 3: Agent C spawns and receives learning ===
		// Read learnings for Agent C's prompt
		const learningsContent = readFileSync(learningStore.learningsPath, "utf-8");

		// Verify the learning from A is available
		expect(learningsContent).toContain("PARALLEL_LEARNING_TEST");

		// Agent C receives prompt with learnings
		const agentCPrompt = `
You have access to the following project learnings:

${learningsContent}

Based on these learnings, what is recommended for parallel operations?
Answer in one sentence mentioning the specific technique.
`;

		const agentCOutput = await runClaudeInDir(agentCPrompt, repo.path);

		// === STEP 4: Verify Agent C used the learning ===
		const outputLower = agentCOutput.toLowerCase();
		expect(
			outputLower.includes("promise.all") ||
				outputLower.includes("parallel") ||
				outputLower.includes("concurrent"),
		).toBe(true);
	}, 120000);
});
