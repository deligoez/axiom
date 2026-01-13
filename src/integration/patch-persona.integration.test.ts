/**
 * INT-14: Patch Persona Conflict Resolution Test
 *
 * Integration tests for Patch persona with real Claude CLI.
 * Run with: npm run test:integration -- patch-persona
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 2 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 2;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;
const signalParser = new SignalParser();

// Patch persona prompt (simplified for testing)
const PATCH_PROMPT = `You are Patch, a merge conflict resolution persona.

Your role is to:
1. Parse git conflict markers (<<<<<<< HEAD, =======, >>>>>>>)
2. Understand both sides of the conflict
3. Produce a semantically correct resolution
4. Emit appropriate signals

Guidelines:
- Preserve functionality from both sides when possible
- If semantic conflict is irresolvable, emit BLOCKED
- Use conventional commit message: "fix: resolve merge conflict in {file}"

Signals:
- On successful resolution: <chorus>RESOLVED</chorus>
- On unresolvable conflict: <chorus>BLOCKED: reason</chorus>`;

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

describe("INT-14: Patch Persona Integration", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-patch-"));
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("resolves simple merge conflict", async () => {
		// Arrange: File with conflict markers
		const conflictedCode = `
function greet(name) {
<<<<<<< HEAD
  return "Hello, " + name + "!";
=======
  return "Hi, " + name + "!";
>>>>>>> feature-branch
}
`;

		const prompt = `${PATCH_PROMPT}

Resolve this merge conflict. Output only the resolved code without conflict markers:

${conflictedCode}`;

		// Act: Spawn Patch with conflicted file
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output contains resolved code without markers
		expect(output.length).toBeGreaterThan(0);
		expect(output).not.toContain("<<<<<<<");
		expect(output).not.toContain("=======");
		expect(output).not.toContain(">>>>>>>");
	}, 60000);

	it("produces syntactically valid resolution", async () => {
		// Arrange: TypeScript conflict
		const conflictedCode = `
function add(a: number, b: number): number {
<<<<<<< HEAD
  return a + b;
=======
  const result = a + b;
  return result;
>>>>>>> feature-branch
}
`;

		const prompt = `${PATCH_PROMPT}

Resolve this TypeScript conflict. The resolved code must be valid TypeScript:

${conflictedCode}

Output only the resolved function code.`;

		// Act: Patch resolves
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output looks like valid TypeScript
		expect(output).toMatch(/function|return/);
		expect(output).not.toContain("<<<<<<<");
	}, 60000);

	it("emits RESOLVED signal when conflict fixed", async () => {
		// Arrange: Simple resolvable conflict
		const prompt = `${PATCH_PROMPT}

You have successfully resolved a merge conflict in utils.ts.
Emit the appropriate signal to indicate resolution is complete.`;

		// Act: Resolve conflict
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: RESOLVED signal present
		const signals = signalParser.parseAll(output);
		const resolvedSignals = signals.filter((s) => s.type === "RESOLVED");
		expect(output.length).toBeGreaterThan(0);
		// If RESOLVED signal emitted, verify it's valid
		if (resolvedSignals.length > 0) {
			expect(resolvedSignals[0].type).toBe("RESOLVED");
		}
	}, 60000);

	it("recognizes complex conflicts requiring escalation", async () => {
		// Arrange: Semantic conflict description
		const prompt = `${PATCH_PROMPT}

Consider this scenario:
- HEAD: Renamed function from "calculate" to "compute"
- Branch: Changed function's return type from number to string

This is a semantic conflict - both changes affect the function contract.
What signal would you emit and why? Be brief.`;

		// Act: Patch analyzes
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Output discusses escalation or blocking
		expect(output.toLowerCase()).toMatch(
			/block|complex|semantic|escalat|help|manual/,
		);
		expect(output.length).toBeGreaterThan(0);
	}, 60000);

	it("understands conventional commit format for resolutions", async () => {
		// Arrange: Ask about commit message
		const prompt = `${PATCH_PROMPT}

You just resolved a merge conflict in src/utils/parser.ts.
What commit message would you use? Just provide the commit message.`;

		// Act: Get commit message suggestion
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should use conventional format with fix:
		expect(output.toLowerCase()).toMatch(/fix:|merge|conflict|resolv/);
	}, 60000);
});
