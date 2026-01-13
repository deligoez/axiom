/**
 * INT-20: Multi-Persona Signal Flow Test
 *
 * Integration tests for signal flow between different personas.
 * Run with: npm run test:integration -- multi-persona-signals
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 *
 * Note: These tests use real API calls (costly and slow).
 * Budget limit: max 4 API calls per test.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignalParser } from "../services/SignalParser.js";

// Budget limit: max API calls per test
const MAX_API_CALLS_PER_TEST = 4;

// Find full path to claude CLI
let claudePath = "claude";
let tmpDir = "";
let apiCallCount = 0;
const signalParser = new SignalParser();

// Multi-persona orchestration context
const ORCHESTRATOR_CONTEXT = `You are part of a multi-agent orchestration system called Chorus.

Personas and their signals:
- Chip (implementer): Emits BLOCKED when stuck, COMPLETE when done
- Patch (fixer): Emits RESOLVED when conflict fixed, BLOCKED if can't fix
- Echo (reviewer): Emits APPROVED or NEEDS_CHANGES after review

Signal flow:
- Chip BLOCKED → triggers Patch to resolve issue
- Patch RESOLVED → triggers Chip to retry
- Chip COMPLETE → triggers Echo to review
- Echo APPROVED → task moves to done`;

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

describe("INT-20: Multi-Persona Signal Flow", () => {
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
		tmpDir = mkdtempSync(join(tmpdir(), "chorus-signals-"));
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tmpDir && existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("Chip understands when to emit BLOCKED for Patch", async () => {
		// Arrange: Chip scenario with merge conflict
		const prompt = `${ORCHESTRATOR_CONTEXT}

You are Chip. You're implementing a feature but encountered a merge conflict.
The conflict is in src/utils.ts with markers like <<<<<<< HEAD.

What signal should you emit to trigger Patch? Emit the signal.`;

		// Act: Chip determines response
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should emit BLOCKED
		const signals = signalParser.parseAll(output);
		expect(output.toLowerCase()).toMatch(/blocked|conflict|patch/);
		if (signals.length > 0) {
			expect(signals.some((s) => s.type === "BLOCKED")).toBe(true);
		}
	}, 60000);

	it("Patch understands RESOLVED triggers Chip retry", async () => {
		// Arrange: Patch resolved a conflict
		const prompt = `${ORCHESTRATOR_CONTEXT}

You are Patch. You just resolved a merge conflict in src/utils.ts.
According to the signal flow, what should happen next after you emit RESOLVED?
Answer briefly.`;

		// Act: Patch explains flow
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should mention Chip retry
		expect(output.toLowerCase()).toMatch(/chip|retry|continue|resume|trigger/);
	}, 60000);

	it("Chip understands COMPLETE triggers Echo review", async () => {
		// Arrange: Chip completed implementation
		const prompt = `${ORCHESTRATOR_CONTEXT}

You are Chip. You've completed implementing a feature:
- All tests pass
- Code is committed

What signal should you emit, and what persona will respond? Answer briefly.`;

		// Act: Chip explains
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should mention COMPLETE and Echo
		expect(output.toLowerCase()).toMatch(/complete/);
		expect(output.toLowerCase()).toMatch(/echo|review/);
	}, 60000);

	it("signal payload format is understood across personas", async () => {
		// Arrange: Test payload understanding
		const prompt = `${ORCHESTRATOR_CONTEXT}

Signals can have payloads. For example:
- <chorus>BLOCKED:merge conflict in src/utils.ts</chorus>
- <chorus>PROGRESS:75</chorus>

If Chip emits BLOCKED with payload "merge conflict in config.ts",
what information does Patch receive? Answer briefly.`;

		// Act: Explain payload flow
		const { output } = await runClaude(prompt, tmpDir);

		// Assert: Should understand payload preservation
		expect(output.toLowerCase()).toMatch(/config|merge|conflict|payload/);
	}, 60000);
});
