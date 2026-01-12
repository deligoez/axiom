/**
 * INT-09: Ralph iteration - retry until success
 *
 * Integration test for the Ralph pattern: task fails first iteration,
 * succeeds on retry with feedback.
 * Run with: npm run test:integration
 *
 * Requirements:
 * - Claude CLI installed (`claude` command available)
 * - Valid API key configured
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";

// Find full path to claude CLI
let claudePath = "claude";
let repo: GitTestRepo;

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
 * Run quality check - validates JSON file
 */
function runQualityCheck(repoPath: string, filename: string): boolean {
	try {
		const content = readFileSync(join(repoPath, filename), "utf-8");
		JSON.parse(content);
		return true;
	} catch {
		return false;
	}
}

describe("INT-09: Ralph iteration - retry until success", () => {
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
	});

	afterEach(() => {
		// Cleanup
		repo.cleanup();
	});

	it("succeeds on retry after initial failure (Ralph pattern)", async () => {
		const filename = "valid.json";
		const filePath = join(repo.path, filename);

		// === ITERATION 1: Create invalid JSON (simulate agent failure) ===
		// In a real Ralph loop, the agent might make a mistake
		// We simulate this by creating invalid JSON
		writeFileSync(filePath, "{ invalid json }", "utf-8");

		// Quality check fails
		const iteration1Result = runQualityCheck(repo.path, filename);
		expect(iteration1Result).toBe(false);

		// === ITERATION 2: Agent receives feedback and fixes ===
		// In Ralph loop, we provide feedback about what went wrong
		const feedbackPrompt = `
The file "${filename}" contains invalid JSON. The quality check failed with error: "Unexpected token".

Please fix the file "${filename}" to contain valid JSON. The file should have this structure:
{
  "status": "fixed",
  "iteration": 2
}

Overwrite the existing file with valid JSON content.
`;

		await runClaudeInDir(feedbackPrompt, repo.path);

		// === VERIFY: Quality check passes ===
		const iteration2Result = runQualityCheck(repo.path, filename);
		expect(iteration2Result).toBe(true);

		// Verify the content is valid JSON
		const content = readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed).toHaveProperty("status");
	}, 120000);
});
