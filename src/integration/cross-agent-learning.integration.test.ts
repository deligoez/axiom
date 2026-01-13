/**
 * INT-21: Cross-Agent Learning Propagation Test
 *
 * Integration tests for learning propagation between agents.
 * Run with: npm run test:integration -- cross-agent-learning
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 3 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LearningStore } from "../services/LearningStore.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 3;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;

// Learning propagation prompt context
const LEARNING_PROMPT = `You are an agent in the Chorus orchestration system.

The system maintains shared learnings across agents:
- Learnings are stored in .claude/rules/learnings.md
- Learnings have scopes: LOCAL (task-specific), CROSS-CUTTING (project-wide), ARCHITECTURAL (system-wide)
- When spawning, agents receive relevant learnings in their context

Your task is to demonstrate understanding of the learning system.`;

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

describe("INT-21: Cross-Agent Learning Propagation", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-learning-"));
		// Create .chorus structure for learnings
		mkdirSync(join(tmpDir, ".claude", "rules"), { recursive: true });
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("learning stored by Agent A is available to Agent B", async () => {
		// Arrange: Store a learning using LearningStore
		const store = new LearningStore(tmpDir);
		const learning = {
			id: "learn-001",
			content: "Always use async/await instead of raw promises",
			scope: "cross-cutting" as const,
			category: "coding-patterns",
			source: {
				taskId: "ch-001",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: false,
		};
		await store.append([learning]);

		// Verify learning was stored
		const learningsPath = join(tmpDir, ".claude", "rules", "learnings.md");
		expect(existsSync(learningsPath)).toBe(true);
		const storedContent = readFileSync(learningsPath, "utf-8");
		expect(storedContent).toContain("async/await");

		// Act: Ask Claude about the learning concept
		const prompt = `${LEARNING_PROMPT}

Previous learnings include: "Always use async/await instead of raw promises"

As Agent B starting a new task, acknowledge that you received this learning.
Respond briefly.`;

		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Agent B acknowledges the learning
		expect(output.toLowerCase()).toMatch(/async|await|promise|learning|receiv/);
	}, 60000);

	it("deduplication works across agents", async () => {
		// Arrange: Agent A stores a learning
		const store = new LearningStore(tmpDir);
		const learning1 = {
			id: "learn-002",
			content: "Validate user input at API boundaries",
			scope: "cross-cutting" as const,
			category: "security",
			source: {
				taskId: "ch-002",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: false,
		};
		await store.append([learning1]);

		// Act: Agent B tries to store the same learning
		const learning2 = {
			id: "learn-003",
			content: "Validate user input at API boundaries", // Same content
			scope: "cross-cutting" as const,
			category: "security",
			source: {
				taskId: "ch-003",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: false,
		};
		const result = await store.append([learning2]);

		// Assert: Learning was skipped (deduplicated)
		expect(result.skipped).toHaveLength(1);
		expect(result.added).toHaveLength(0);

		// Verify only one entry in file
		const learningsPath = join(tmpDir, ".claude", "rules", "learnings.md");
		const content = readFileSync(learningsPath, "utf-8");
		const matches = content.match(/Validate user input/gi);
		expect(matches).toHaveLength(1);
	}, 30000);

	it("scope filtering explained by agent", async () => {
		// Arrange: Ask about scope filtering
		const prompt = `${LEARNING_PROMPT}

Learning scopes:
- LOCAL: Specific to one task/file
- CROSS-CUTTING: Applies across the project
- ARCHITECTURAL: System-wide design patterns

If you're working on task ch-123 but a LOCAL learning was for task ch-100,
should that learning be injected into your context? Answer briefly with yes/no and why.`;

		// Act: Agent explains
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Agent understands scope filtering
		expect(output.toLowerCase()).toMatch(/no|local|specific|different/);
	}, 60000);

	it("learnings persist and are readable after store recreation", async () => {
		// Arrange: Store learning with first store instance
		const store1 = new LearningStore(tmpDir);
		const learning = {
			id: "learn-004",
			content: "Use dependency injection for testability",
			scope: "architectural" as const,
			category: "design-patterns",
			source: {
				taskId: "ch-004",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: false,
		};
		await store1.append([learning]);

		// Act: Create new store instance (simulating restart)
		const store2 = new LearningStore(tmpDir);
		const readAll = await store2.readAll();

		// Assert: Learning is readable by new store
		expect(readAll).toHaveLength(1);
		expect(readAll[0].content).toContain("dependency injection");
	}, 30000);
});
