/**
 * INT-08: Learning propagation between sequential agents
 *
 * Integration tests for learning propagation from Agent A to Agent B.
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
function createLearning(content: string): Learning {
	return {
		id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		content,
		scope: "cross-cutting",
		category: "general",
		source: {
			taskId: "ch-agent-a",
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

describe("INT-08: Learning propagation between sequential agents", () => {
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

	it("Agent B receives learning stored by Agent A", async () => {
		// === STEP 1: Agent A stores a learning ===
		const agentALearning = createLearning(
			"Always use strict equality (===) in JavaScript",
		);
		await learningStore.append([agentALearning]);

		// Verify learning was stored
		const storedLearnings = await learningStore.readAll();
		expect(storedLearnings).toHaveLength(1);

		// === STEP 2: Read learnings for Agent B prompt ===
		const learningsContent = readFileSync(learningStore.learningsPath, "utf-8");

		// === STEP 3: Agent B receives prompt with learnings ===
		const agentBPrompt = `
You have access to the following project learnings:

${learningsContent}

Based on these learnings, what is the recommended way to check equality in JavaScript? Answer in one sentence.
`;

		const agentBOutput = await runClaudeInDir(agentBPrompt, repo.path);

		// === STEP 4: Verify Agent B uses the learning ===
		// Agent B should mention strict equality or ===
		const outputLower = agentBOutput.toLowerCase();
		expect(
			outputLower.includes("===") ||
				outputLower.includes("strict") ||
				outputLower.includes("triple"),
		).toBe(true);
	}, 120000);

	it("multiple learnings propagate to Agent B", async () => {
		// === STEP 1: Store multiple learnings ===
		const learnings = [
			createLearning("UNIQUE_LEARNING_1: Always validate user input"),
			createLearning("UNIQUE_LEARNING_2: Use TypeScript for type safety"),
		];
		await learningStore.append(learnings);

		// === STEP 2: Read learnings for Agent B ===
		const learningsContent = readFileSync(learningStore.learningsPath, "utf-8");

		// Verify both learnings are in the file
		expect(learningsContent).toContain("UNIQUE_LEARNING_1");
		expect(learningsContent).toContain("UNIQUE_LEARNING_2");

		// === STEP 3: Agent B receives prompt with learnings ===
		const agentBPrompt = `
You have access to the following project learnings:

${learningsContent}

List all the unique learnings you can see. Output each learning ID (UNIQUE_LEARNING_1, UNIQUE_LEARNING_2, etc.) on a separate line.
`;

		const agentBOutput = await runClaudeInDir(agentBPrompt, repo.path);

		// === STEP 4: Verify Agent B sees both learnings ===
		expect(agentBOutput).toContain("UNIQUE_LEARNING_1");
		expect(agentBOutput).toContain("UNIQUE_LEARNING_2");
	}, 120000);
});
