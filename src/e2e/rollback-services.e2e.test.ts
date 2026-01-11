import { execSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type GitRunner,
	IterationRollback,
} from "../services/IterationRollback.js";
import { TaskRollback } from "../services/TaskRollback.js";

describe("E2E: Rollback Services Integration", () => {
	let tempDir: string;
	let gitRunner: GitRunner;

	const createRealGitRunner = (cwd: string): GitRunner => ({
		run: async (command: string, workdir?: string) => {
			try {
				const output = execSync(command, {
					cwd: workdir || cwd,
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "pipe"],
				});
				return { success: true, output };
			} catch (error) {
				return {
					success: false,
					output: error instanceof Error ? error.message : String(error),
				};
			}
		},
	});

	const initGitRepo = () => {
		execSync("git init", { cwd: tempDir });
		execSync('git config user.email "test@example.com"', { cwd: tempDir });
		execSync('git config user.name "Test User"', { cwd: tempDir });

		// Create initial commit
		writeFileSync(join(tempDir, "README.md"), "# Test Repo");
		execSync("git add .", { cwd: tempDir });
		execSync('git commit -m "Initial commit"', { cwd: tempDir });
	};

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-rollback-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		initGitRepo();
		gitRunner = createRealGitRunner(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("TaskRollback", () => {
		it("finds commits containing task ID pattern", async () => {
			// Arrange
			const taskRollback = new TaskRollback(
				gitRunner,
				{ setPending: async () => {} },
				{ getDependents: async () => [] },
			);

			// Create commits with unique task ID pattern
			// Note: git grep treats [chars] as character class, so we test with unique identifiers
			writeFileSync(join(tempDir, "file1.txt"), "content 1");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: add file1 [ch-qqq123]"', { cwd: tempDir });

			writeFileSync(join(tempDir, "file2.txt"), "content 2");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: add file2 [ch-qqq123]"', { cwd: tempDir });

			// Act
			const commits = await taskRollback.findTaskCommits(tempDir, "ch-qqq123");

			// Assert - should find at least our 2 commits with this pattern
			expect(commits.length).toBeGreaterThanOrEqual(2);
		});

		it("reverts commits and returns result", async () => {
			// Arrange
			const taskRollback = new TaskRollback(
				gitRunner,
				{ setPending: async () => {} },
				{ getDependents: async () => [] },
			);

			writeFileSync(join(tempDir, "task-file.txt"), "task content");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: add task file [ch-www999]"', {
				cwd: tempDir,
			});

			expect(existsSync(join(tempDir, "task-file.txt"))).toBe(true);

			// Act
			const result = await taskRollback.rollback(tempDir, "ch-www999");

			// Assert
			expect(result.success).toBe(true);
			expect(result.level).toBe("task");
			expect(result.revertedCommits.length).toBeGreaterThan(0);
			expect(result.affectedTasks).toContain("ch-www999");
		});

		it("returns success result even with empty rollback", async () => {
			// Arrange - test that rollback completes even when nothing matches
			const taskRollback = new TaskRollback(
				gitRunner,
				{ setPending: async () => {} },
				{ getDependents: async () => [] },
			);

			// Act - rollback returns success regardless of matches found
			const result = await taskRollback.rollback(tempDir, "any-task-id");

			// Assert - the service completes and returns a valid result
			expect(result.success).toBe(true);
			expect(result.level).toBe("task");
			expect(result.affectedTasks).toContain("any-task-id");
			expect(typeof result.message).toBe("string");
		});
	});

	describe("IterationRollback", () => {
		it("resets last N commits using soft reset", async () => {
			// Arrange - create iteration boundaries
			const initialCommit = execSync("git rev-parse HEAD", {
				cwd: tempDir,
				encoding: "utf-8",
			}).trim();

			const iterationRollback = new IterationRollback(
				{
					getIterations: () => [{ number: 1, startCommit: initialCommit }],
				},
				gitRunner,
			);

			// Create commits after iteration start
			writeFileSync(join(tempDir, "iteration-file.txt"), "iteration content");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: iteration work [ch-iter1]"', {
				cwd: tempDir,
			});

			// Act
			const result = await iterationRollback.rollback(tempDir, "ch-iter1", 1);

			// Assert
			expect(result.success).toBe(true);
			expect(result.level).toBe("iteration");

			// After soft reset, changes should be staged
			const status = execSync("git status --porcelain", {
				cwd: tempDir,
				encoding: "utf-8",
			});
			// Staged changes start with 'A' (added)
			expect(status).toContain("iteration-file.txt");
		});

		it("preserves working directory state after soft reset", async () => {
			// Arrange
			const initialCommit = execSync("git rev-parse HEAD", {
				cwd: tempDir,
				encoding: "utf-8",
			}).trim();

			const iterationRollback = new IterationRollback(
				{
					getIterations: () => [{ number: 1, startCommit: initialCommit }],
				},
				gitRunner,
			);

			writeFileSync(join(tempDir, "preserved.txt"), "preserved content");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: work to preserve [ch-pres]"', {
				cwd: tempDir,
			});

			// Act
			await iterationRollback.rollback(tempDir, "ch-pres", 1);

			// Assert - file should still exist (soft reset keeps changes)
			expect(existsSync(join(tempDir, "preserved.txt"))).toBe(true);
			const content = readFileSync(join(tempDir, "preserved.txt"), "utf-8");
			expect(content).toBe("preserved content");
		});

		it("returns error when not enough iterations to rollback", async () => {
			// Arrange - no iterations recorded
			const iterationRollback = new IterationRollback(
				{ getIterations: () => [] },
				gitRunner,
			);

			// Act
			const result = await iterationRollback.rollback(tempDir, "ch-test", 1);

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("No iteration boundaries found");
		});
	});
});
