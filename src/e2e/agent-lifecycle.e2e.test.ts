import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { agentMachine } from "../machines/agent.machine.js";
import { CompletionChecker } from "../services/CompletionChecker.js";
import { QualityCommandRunner } from "../services/QualityCommandRunner.js";
import { SignalParser } from "../services/SignalParser.js";
import { WorktreeService } from "../services/WorktreeService.js";
import {
	createGitRepoWithChorus,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";

describe("E2E: Full Agent Lifecycle", () => {
	let repo: GitTestRepo;
	let worktreeService: WorktreeService;

	beforeEach(() => {
		repo = createGitRepoWithChorus();
		worktreeService = new WorktreeService(repo.path);
	});

	afterEach(async () => {
		// Clean up worktrees before repo cleanup
		try {
			const worktrees = worktreeService.list();
			for (const wt of worktrees) {
				await worktreeService.remove(wt.agentType, wt.taskId, {
					force: true,
					deleteBranch: false, // Don't check branch merge status
				});
			}
		} catch {
			// Ignore cleanup errors
		}
		repo.cleanup();
	});

	// Worktree creation tests

	it("creates worktree with correct directory structure", async () => {
		// Arrange
		const agentType = "implement";
		const taskId = "ch-test1";

		// Act
		const worktree = await worktreeService.create(agentType, taskId);

		// Assert
		expect(worktree.path).toContain(".worktrees");
		expect(worktree.path).toContain(`${agentType}-${taskId}`);
		expect(worktree.branch).toBe(`agent/${agentType}/${taskId}`);
		expect(existsSync(worktree.path)).toBe(true);
	});

	it("creates .agent/scratchpad.md in worktree", async () => {
		// Arrange
		const agentType = "implement";
		const taskId = "ch-test2";

		// Act
		const worktree = await worktreeService.create(agentType, taskId);

		// Assert
		const scratchpadPath = join(worktree.path, ".agent", "scratchpad.md");
		expect(existsSync(scratchpadPath)).toBe(true);
	});

	it("creates correct branch name pattern", async () => {
		// Arrange
		const agentType = "fix";
		const taskId = "ch-bug1";

		// Act
		const worktree = await worktreeService.create(agentType, taskId);

		// Assert
		expect(worktree.branch).toBe(`agent/${agentType}/${taskId}`);
		expect(worktree.agentType).toBe(agentType);
		expect(worktree.taskId).toBe(taskId);
	});

	// Quality command execution tests

	it("executes quality commands and captures output", async () => {
		// Arrange
		const runner = new QualityCommandRunner(repo.path);
		const commands = [
			{
				name: "check1",
				command: 'echo "Check 1 passed"',
				order: 1,
				required: true,
			},
			{
				name: "check2",
				command: 'echo "Check 2 passed"',
				order: 2,
				required: true,
			},
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.allPassed).toBe(true);
		expect(result.results.length).toBe(2);
		expect(result.results[0].output).toContain("Check 1 passed");
		expect(result.results[1].output).toContain("Check 2 passed");
	});

	it("executes quality commands in order", async () => {
		// Arrange
		const runner = new QualityCommandRunner(repo.path);
		const outputFile = join(repo.path, "order-test.txt");
		const commands = [
			{
				name: "step3",
				command: `echo "3" >> ${outputFile}`,
				order: 3,
				required: true,
			},
			{
				name: "step1",
				command: `echo "1" >> ${outputFile}`,
				order: 1,
				required: true,
			},
			{
				name: "step2",
				command: `echo "2" >> ${outputFile}`,
				order: 2,
				required: true,
			},
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.allPassed).toBe(true);
		const content = require("node:fs").readFileSync(outputFile, "utf-8");
		expect(content.trim()).toBe("1\n2\n3");
	});

	it("stops on required command failure and reports first failure", async () => {
		// Arrange
		const runner = new QualityCommandRunner(repo.path);
		const commands = [
			{ name: "pass", command: "true", order: 1, required: true },
			{ name: "fail", command: "exit 1", order: 2, required: true },
			{
				name: "skip",
				command: 'echo "should not run"',
				order: 3,
				required: true,
			},
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.allPassed).toBe(false);
		expect(result.firstFailure).toBe("fail");
		expect(result.results.length).toBe(2); // Stopped after fail
	});

	// Completion detection tests

	it("detects completion signal in output", () => {
		// Arrange
		const parser = new SignalParser();
		const output = "Task done\n<chorus>COMPLETE</chorus>\nAll finished.";

		// Act
		const isComplete = parser.isComplete(output);

		// Assert
		expect(isComplete).toBe(true);
	});

	it("detects blocked signal with reason", () => {
		// Arrange
		const parser = new SignalParser();
		const output = "<chorus>BLOCKED:Missing API key</chorus>";

		// Act
		const isBlocked = parser.isBlocked(output);
		const reason = parser.getReason(output);

		// Assert
		expect(isBlocked).toBe(true);
		expect(reason).toBe("Missing API key");
	});

	it("completion checker validates with test command", async () => {
		// Arrange
		const checker = new CompletionChecker(repo.path, {
			requireTests: true,
			testCommand: "true",
		});
		const output = "<chorus>COMPLETE</chorus>";

		// Act
		const result = await checker.check(output);

		// Assert
		expect(result.complete).toBe(true);
		expect(result.hasSignal).toBe(true);
		expect(result.testsPassed).toBe(true);
	});

	it("completion checker fails when test command fails", async () => {
		// Arrange
		const checker = new CompletionChecker(repo.path, {
			requireTests: true,
			testCommand: "exit 1",
		});
		const output = "<chorus>COMPLETE</chorus>";

		// Act
		const result = await checker.check(output);

		// Assert
		expect(result.complete).toBe(false);
		expect(result.hasSignal).toBe(true);
		expect(result.testsPassed).toBe(false);
	});

	// Worktree cleanup tests

	it("removes worktree after completion", async () => {
		// Arrange
		const agentType = "implement";
		const taskId = "ch-cleanup";
		const worktree = await worktreeService.create(agentType, taskId);
		expect(existsSync(worktree.path)).toBe(true);

		// Act
		await worktreeService.remove(agentType, taskId, { force: true });

		// Assert
		expect(existsSync(worktree.path)).toBe(false);
	});

	it("lists all active worktrees", async () => {
		// Arrange
		await worktreeService.create("implement", "ch-wt1");
		await worktreeService.create("fix", "ch-wt2");

		// Act
		const worktrees = worktreeService.list();

		// Assert
		expect(worktrees.length).toBe(2);
		expect(worktrees.some((w) => w.taskId === "ch-wt1")).toBe(true);
		expect(worktrees.some((w) => w.taskId === "ch-wt2")).toBe(true);
	});

	// Agent machine lifecycle tests

	it("agent machine transitions through lifecycle states", () => {
		// Arrange
		const mockParent = { send: () => {} } as never;
		const actor = createActor(agentMachine, {
			input: { taskId: "ch-lifecycle", parentRef: mockParent },
		});
		actor.start();

		// Assert initial state
		expect(actor.getSnapshot().value).toBe("idle");

		// Act - transition to preparing
		actor.send({ type: "START" });
		expect(actor.getSnapshot().value).toBe("preparing");

		// Act - transition to executing
		actor.send({ type: "READY" });
		expect(actor.getSnapshot().value).toEqual({ executing: "iteration" });

		// Act - complete iteration
		actor.send({ type: "ITERATION_DONE" });
		expect(actor.getSnapshot().value).toEqual({ executing: "checkQuality" });

		// Act - all pass → completed
		actor.send({ type: "ALL_PASS" });
		expect(actor.getSnapshot().value).toBe("completed");
		expect(actor.getSnapshot().status).toBe("done");

		actor.stop();
	});

	it("agent machine handles retry loop", () => {
		// Arrange
		const mockParent = { send: () => {} } as never;
		const actor = createActor(agentMachine, {
			input: { taskId: "ch-retry", parentRef: mockParent },
		});
		actor.start();

		// Navigate to checkQuality
		actor.send({ type: "START" });
		actor.send({ type: "READY" });
		actor.send({ type: "ITERATION_DONE" });
		expect(actor.getSnapshot().context.iteration).toBe(0);

		// Act - retry increments iteration
		actor.send({ type: "RETRY" });
		expect(actor.getSnapshot().value).toEqual({ executing: "iteration" });
		expect(actor.getSnapshot().context.iteration).toBe(1);

		// Another iteration and retry
		actor.send({ type: "ITERATION_DONE" });
		actor.send({ type: "RETRY" });
		expect(actor.getSnapshot().context.iteration).toBe(2);

		actor.stop();
	});

	it("agent machine handles blocked state", () => {
		// Arrange
		const mockParent = { send: () => {} } as never;
		const actor = createActor(agentMachine, {
			input: { taskId: "ch-blocked", parentRef: mockParent },
		});
		actor.start();

		// Navigate to executing
		actor.send({ type: "START" });
		actor.send({ type: "READY" });

		// Act - become blocked
		actor.send({ type: "BLOCKED", reason: "Waiting for dependency" });
		expect(actor.getSnapshot().value).toBe("blocked");

		// Act - unblock and continue
		actor.send({ type: "READY" });
		expect(actor.getSnapshot().value).toEqual({ executing: "iteration" });

		actor.stop();
	});

	it("agent machine handles failure", () => {
		// Arrange
		const mockParent = { send: () => {} } as never;
		const actor = createActor(agentMachine, {
			input: { taskId: "ch-fail", parentRef: mockParent },
		});
		actor.start();

		// Navigate to executing
		actor.send({ type: "START" });
		actor.send({ type: "READY" });

		// Act - fail
		const error = new Error("Test failure");
		actor.send({ type: "FAIL", error });

		// Assert
		expect(actor.getSnapshot().value).toBe("failed");
		expect(actor.getSnapshot().context.error).toBe(error);
		expect(actor.getSnapshot().status).toBe("done");

		actor.stop();
	});

	// Output capture tests

	it("captures command output correctly", async () => {
		// Arrange
		const runner = new QualityCommandRunner(repo.path);

		// Act
		const result = await runner.run(
			'echo "line1" && echo "line2" && echo "line3"',
		);

		// Assert
		expect(result.success).toBe(true);
		expect(result.output).toContain("line1");
		expect(result.output).toContain("line2");
		expect(result.output).toContain("line3");
	});

	it("captures stderr in output", async () => {
		// Arrange
		const runner = new QualityCommandRunner(repo.path);

		// Act
		const result = await runner.run('echo "error message" >&2');

		// Assert
		expect(result.output).toContain("error message");
	});
});
