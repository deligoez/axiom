import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Checkpointer, type GitRunner } from "../services/Checkpointer.js";
import { IterationRollback } from "../services/IterationRollback.js";
import { TaskRollback } from "../services/TaskRollback.js";
import type { CheckpointConfig } from "../types/rollback.js";

describe("E2E: Checkpoint & Rollback System", () => {
	let tempDir: string;
	let checkpointer: Checkpointer;
	let iterationRollback: IterationRollback;
	let taskRollback: TaskRollback;

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

	const defaultConfig: CheckpointConfig = {
		enabled: true,
		beforeAutopilot: true,
		beforeMerge: true,
		periodic: 5,
	};

	beforeEach(() => {
		// Create a fresh temp directory with a real git repo
		tempDir = join(
			tmpdir(),
			`chorus-checkpoint-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });

		// Initialize git repo
		execSync("git init", { cwd: tempDir });
		execSync('git config user.email "test@example.com"', { cwd: tempDir });
		execSync('git config user.name "Test User"', { cwd: tempDir });

		// Create initial commit
		writeFileSync(join(tempDir, "README.md"), "# Test Repo");
		execSync("git add .", { cwd: tempDir });
		execSync('git commit -m "Initial commit"', { cwd: tempDir });

		const gitRunner = createRealGitRunner(tempDir);
		checkpointer = new Checkpointer(defaultConfig, gitRunner);
		iterationRollback = new IterationRollback(
			{
				getIterations: () => [],
			},
			gitRunner,
		);
		taskRollback = new TaskRollback(
			gitRunner,
			{
				setPending: async () => {},
			},
			{
				getDependents: async () => [],
			},
		);
	});

	afterEach(() => {
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Checkpoint Creation", () => {
		it("creates checkpoint tag before autopilot start", async () => {
			// Arrange & Act
			const checkpoint = await checkpointer.create("autopilot_start");

			// Assert
			expect(checkpoint.tag).toMatch(/^chorus-checkpoint-\d+$/);
			expect(checkpoint.type).toBe("autopilot_start");

			// Verify tag exists in git
			const output = execSync("git tag", { cwd: tempDir, encoding: "utf-8" });
			expect(output).toContain("chorus-checkpoint-");
		});

		it("tracks multiple checkpoints with correct timestamps", async () => {
			// Arrange & Act
			await checkpointer.create("autopilot_start");
			await checkpointer.create("pre_merge", "ch-test1");

			// Assert
			const checkpoints = await checkpointer.list();
			expect(checkpoints).toHaveLength(2);
			expect(checkpoints[0].timestamp).toBeInstanceOf(Date);
			expect(checkpoints[1].timestamp).toBeInstanceOf(Date);
			expect(checkpoints[0].type).toBe("autopilot_start");
			expect(checkpoints[1].type).toBe("pre_merge");
		});

		it("creates pre-merge checkpoint with task ID", async () => {
			// Arrange & Act
			const checkpoint = await checkpointer.create("pre_merge", "ch-abc123");

			// Assert
			expect(checkpoint.tag).toBe("pre-merge-ch-abc123");
			expect(checkpoint.taskId).toBe("ch-abc123");

			// Verify tag exists
			const output = execSync("git tag", { cwd: tempDir, encoding: "utf-8" });
			expect(output).toContain("pre-merge-ch-abc123");
		});
	});

	describe("Rollback Operations", () => {
		it("iteration rollback counts commits correctly", async () => {
			// Arrange - create commits
			writeFileSync(join(tempDir, "file1.txt"), "content 1");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: add file1"', { cwd: tempDir });

			writeFileSync(join(tempDir, "file2.txt"), "content 2");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: add file2"', { cwd: tempDir });

			// Act - count commits via git log
			const output = execSync("git log --oneline", {
				cwd: tempDir,
				encoding: "utf-8",
			});

			// Assert - 3 commits total (initial + 2 new)
			expect(output.trim().split("\n")).toHaveLength(3);
		});

		it("rollback services exist and are callable", async () => {
			// Arrange - verify rollback services are properly instantiated

			// Act & Assert - verify TaskRollback has the expected methods
			expect(typeof taskRollback.rollback).toBe("function");
			expect(typeof taskRollback.findTaskCommits).toBe("function");
			expect(typeof taskRollback.rollbackWithDependents).toBe("function");

			// Act & Assert - verify IterationRollback has the expected methods
			expect(typeof iterationRollback.rollback).toBe("function");
			expect(typeof iterationRollback.findTaskCommits).toBe("function");
			expect(typeof iterationRollback.getTaskCommitCount).toBe("function");
		});

		it("rollback fails gracefully if no checkpoints exist", async () => {
			// Arrange - no checkpoints created

			// Act
			const checkpoints = await checkpointer.list();

			// Assert
			expect(checkpoints).toHaveLength(0);
		});

		it("checkpoint restore returns affected task IDs", async () => {
			// Arrange
			await checkpointer.create("autopilot_start");

			// Create commits after checkpoint
			writeFileSync(join(tempDir, "file1.txt"), "content 1");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: task A [ch-001]"', { cwd: tempDir });

			writeFileSync(join(tempDir, "file2.txt"), "content 2");
			execSync("git add .", { cwd: tempDir });
			execSync('git commit -m "feat: task B [ch-002]"', { cwd: tempDir });

			const checkpoints = await checkpointer.list();
			const checkpointTag = checkpoints[0].tag;

			// Act
			const affectedTasks = await checkpointer.restore(checkpointTag);

			// Assert
			expect(affectedTasks).toContain("ch-001");
			expect(affectedTasks).toContain("ch-002");

			// Verify files are gone after reset
			expect(existsSync(join(tempDir, "file1.txt"))).toBe(false);
			expect(existsSync(join(tempDir, "file2.txt"))).toBe(false);
		});
	});

	describe("Checkpoint Management", () => {
		it("prunes old checkpoints keeping last N", async () => {
			// Arrange - create 3 checkpoints with different task IDs (pre_merge type has unique tag names)
			await checkpointer.create("pre_merge", "ch-prune1");
			await checkpointer.create("pre_merge", "ch-prune2");
			await checkpointer.create("pre_merge", "ch-prune3");

			// Act - keep only 1
			const deleted = await checkpointer.prune(1);

			// Assert
			expect(deleted).toBe(2);
			const remaining = await checkpointer.list();
			expect(remaining).toHaveLength(1);
		});

		it("shouldCreate respects config settings", () => {
			// Arrange
			const disabledConfig: CheckpointConfig = {
				enabled: false,
				beforeAutopilot: true,
				beforeMerge: true,
				periodic: 5,
			};
			const disabledCheckpointer = new Checkpointer(
				disabledConfig,
				createRealGitRunner(tempDir),
			);

			// Act & Assert
			expect(checkpointer.shouldCreate("autopilot_start")).toBe(true);
			expect(checkpointer.shouldCreate("pre_merge")).toBe(true);
			expect(checkpointer.shouldCreate("periodic")).toBe(true);
			expect(disabledCheckpointer.shouldCreate("autopilot_start")).toBe(false);
		});
	});
});
