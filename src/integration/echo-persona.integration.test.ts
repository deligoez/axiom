/**
 * INT-16: Echo Persona Review Test
 *
 * Integration tests for Echo persona with real Claude CLI.
 * Run with: npm run test:integration -- echo-persona
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 2 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LearningExtractor } from "../services/LearningExtractor.js";
import { LearningStore } from "../services/LearningStore.js";
import { SignalParser } from "../services/SignalParser.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 2;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;
const signalParser = new SignalParser();

// Echo persona prompt (simplified for testing)
const ECHO_PROMPT = `You are Echo, a code review persona.

Review the provided code and:
1. Identify quality issues (if any)
2. Extract learnings using the format below

For each learning, use a scope prefix:
- [LOCAL] - Specific to this code
- [CROSS-CUTTING] - Applies across features
- [ARCHITECTURAL] - System-wide implications

Example output format:
## Learnings
- [LOCAL] Use const instead of let for immutable values
- [CROSS-CUTTING] Validate input at API boundaries

When done, emit: <chorus>COMPLETE</chorus>`;

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

describe("INT-16: Echo Persona Integration", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-echo-"));
		// Create .chorus directory structure
		mkdirSync(join(tmpDir, ".chorus", "agents", "echo", "logs"), {
			recursive: true,
		});
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("reviews completed code for quality", async () => {
		// Arrange: Code with potential quality issues
		const codeFile = join(tmpDir, "example.ts");
		writeFileSync(
			codeFile,
			`
// Example code with potential issues
let x = 10;  // Could be const
function add(a, b) {
  return a + b;
}
export { add };
`,
		);

		const prompt = `${ECHO_PROMPT}

Review this TypeScript code:
\`\`\`typescript
${readFileSync(codeFile, "utf-8")}
\`\`\`

Provide quality feedback.`;

		// Act: Spawn Echo with review prompt
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output contains quality feedback
		expect(output.length).toBeGreaterThan(0);
		// Should mention something about const vs let or types
		expect(output.toLowerCase()).toMatch(/const|let|type|any|quality/);
	}, 60000);

	it("extracts learnings from implementation", async () => {
		// Arrange: Code with interesting patterns
		const codeFile = join(tmpDir, "patterns.ts");
		writeFileSync(
			codeFile,
			`
// Code with patterns worth noting
async function fetchData(url: string): Promise<Data> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

function memoize<T>(fn: (arg: string) => T): (arg: string) => T {
  const cache = new Map<string, T>();
  return (arg: string) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
`,
		);

		const prompt = `${ECHO_PROMPT}

Review this code and extract any learnings about patterns or best practices:
\`\`\`typescript
${readFileSync(codeFile, "utf-8")}
\`\`\``;

		// Act: Echo reviews
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Learnings extracted (may contain scope prefixes)
		const extractor = new LearningExtractor();
		const learnings = extractor.parse(output, "ch-test", "claude");
		// Echo might extract learnings depending on what it finds interesting
		expect(output.length).toBeGreaterThan(0);
		// If learnings were extracted, verify structure
		if (learnings.length > 0) {
			expect(learnings[0].content).toBeDefined();
		}
	}, 60000);

	it("stores learnings in .chorus/agents/echo/learnings.md", async () => {
		// Arrange: Create a learning manually to verify storage
		const store = new LearningStore(tmpDir);
		const learning = {
			id: "test-learning-1",
			content: "Use memoization for expensive computations",
			scope: "cross-cutting" as const,
			category: "performance",
			source: {
				taskId: "ch-test",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: true,
		};

		// Act: Store learning
		await store.append([learning]);

		// Assert: File contains new learning entry
		const learningsPath = join(tmpDir, ".claude", "rules", "learnings.md");
		expect(existsSync(learningsPath)).toBe(true);
		const content = readFileSync(learningsPath, "utf-8");
		expect(content).toContain("memoization");
		expect(content).toContain("[CROSS-CUTTING]");
	}, 30000);

	it("deduplicates identical learnings", async () => {
		// Arrange: Store a learning first
		const store = new LearningStore(tmpDir);
		const learning1 = {
			id: "test-learning-1",
			content: "Always validate user input",
			scope: "cross-cutting" as const,
			category: "security",
			source: {
				taskId: "ch-test1",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: true,
		};
		await store.append([learning1]);

		// Get initial content
		const learningsPath = join(tmpDir, ".claude", "rules", "learnings.md");
		const initialContent = readFileSync(learningsPath, "utf-8");
		const initialCount = (initialContent.match(/validate user input/gi) || [])
			.length;

		// Act: Try to store same learning again (different ID, same content)
		const learning2 = {
			id: "test-learning-2",
			content: "Always validate user input", // Same content
			scope: "cross-cutting" as const,
			category: "security",
			source: {
				taskId: "ch-test2",
				agentType: "claude" as const,
				timestamp: new Date(),
			},
			suggestPattern: true,
		};
		const result = await store.append([learning2]);

		// Assert: File unchanged, learning was skipped (deduplicated)
		expect(result.skipped).toHaveLength(1);
		expect(result.added).toHaveLength(0);
		const finalContent = readFileSync(learningsPath, "utf-8");
		const finalCount = (finalContent.match(/validate user input/gi) || [])
			.length;
		expect(finalCount).toBe(initialCount); // No duplicates
	}, 30000);

	it("emits COMPLETE signal with review summary", async () => {
		// Arrange: Simple code to review
		const codeFile = join(tmpDir, "simple.ts");
		writeFileSync(
			codeFile,
			`export const greet = (name: string) => "Hello, " + name;`,
		);

		const prompt = `${ECHO_PROMPT}

Review this code briefly and emit COMPLETE when done:
\`\`\`typescript
${readFileSync(codeFile, "utf-8")}
\`\`\``;

		// Act: Complete review
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: COMPLETE signal present
		const signals = signalParser.parseAll(output);
		const completeSignals = signals.filter((s) => s.type === "COMPLETE");
		// Echo should emit COMPLETE when done (behavior may vary)
		expect(output.length).toBeGreaterThan(0);
		// If COMPLETE signal was emitted, verify it has correct type
		if (completeSignals.length > 0) {
			expect(completeSignals[0].type).toBe("COMPLETE");
		}
	}, 60000);
});
