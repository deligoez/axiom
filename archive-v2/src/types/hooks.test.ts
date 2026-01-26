import { describe, expect, it } from "vitest";
import type {
	HookAgentInput,
	HookConfig,
	HookErrorInput,
	HookEvent,
	HookHandler,
	HookInput,
	HookIterationInput,
	HookMergeInput,
	HookOutput,
	HookOutputInput,
	HookTaskInput,
} from "./hooks.js";
import { getDefaultHookConfig } from "./hooks.js";

describe("Hook types", () => {
	it("HookEvent union includes all 13 events", () => {
		// Arrange & Act
		const events: HookEvent[] = [
			"pre-agent-start",
			"post-agent-start",
			"pre-task-claim",
			"post-task-claim",
			"pre-iteration",
			"post-iteration",
			"pre-task-complete",
			"post-task-complete",
			"pre-merge",
			"post-merge",
			"on-agent-error",
			"on-agent-timeout",
			"on-conflict",
		];

		// Assert
		expect(events).toHaveLength(13);
		expect(events).toContain("pre-agent-start");
		expect(events).toContain("on-conflict");
	});

	it("HookInput.agent has all fields", () => {
		// Arrange & Act
		const agent: HookAgentInput = {
			id: "claude-ch-001",
			type: "claude",
			worktree: ".worktrees/claude-ch-001",
			pid: 12345,
		};

		// Assert
		expect(agent.id).toBe("claude-ch-001");
		expect(agent.type).toBe("claude");
		expect(agent.worktree).toBe(".worktrees/claude-ch-001");
		expect(agent.pid).toBe(12345);
	});

	it("HookInput.task has all fields including priority/labels", () => {
		// Arrange & Act
		const task: HookTaskInput = {
			id: "ch-001",
			title: "Test task",
			status: "in_progress",
			priority: 1,
			labels: ["m1-infrastructure", "feature"],
		};

		// Assert
		expect(task.id).toBe("ch-001");
		expect(task.title).toBe("Test task");
		expect(task.status).toBe("in_progress");
		expect(task.priority).toBe(1);
		expect(task.labels).toContain("m1-infrastructure");
	});

	it("HookInput.iteration has all fields", () => {
		// Arrange & Act
		const iteration: HookIterationInput = {
			number: 5,
			maxIterations: 50,
		};

		// Assert
		expect(iteration.number).toBe(5);
		expect(iteration.maxIterations).toBe(50);
	});

	it("HookInput.output has all fields including signal", () => {
		// Arrange & Act
		const output: HookOutputInput = {
			stdout: "Test output",
			stderr: "Error output",
			exitCode: 0,
			signal: { type: "COMPLETE", content: "Task done" },
		};

		// Assert
		expect(output.stdout).toBe("Test output");
		expect(output.stderr).toBe("Error output");
		expect(output.exitCode).toBe(0);
		expect(output.signal?.type).toBe("COMPLETE");
		expect(output.signal?.content).toBe("Task done");
	});

	it("HookInput.merge has all fields", () => {
		// Arrange & Act
		const merge: HookMergeInput = {
			branch: "agent/claude/ch-001",
			targetBranch: "main",
			conflictFiles: ["src/index.ts", "package.json"],
		};

		// Assert
		expect(merge.branch).toBe("agent/claude/ch-001");
		expect(merge.targetBranch).toBe("main");
		expect(merge.conflictFiles).toContain("src/index.ts");
	});

	it("HookInput.error has all fields", () => {
		// Arrange & Act
		const error: HookErrorInput = {
			message: "Process timed out",
			stack: "Error: Process timed out\n    at timeout",
			code: "ETIMEDOUT",
		};

		// Assert
		expect(error.message).toBe("Process timed out");
		expect(error.stack).toContain("timeout");
		expect(error.code).toBe("ETIMEDOUT");
	});

	it("HookOutput has required fields", () => {
		// Arrange & Act
		const output: HookOutput = {
			result: "continue",
			message: "Hook executed successfully",
		};

		// Assert
		expect(output.result).toBe("continue");
		expect(output.message).toBe("Hook executed successfully");
	});

	it("HookHandler has required and optional fields", () => {
		// Arrange & Act
		const handler: HookHandler = {
			event: "pre-agent-start",
			command: "./hooks/pre-start.sh",
			timeout: 60000,
			continueOnFailure: false,
		};

		// Assert
		expect(handler.event).toBe("pre-agent-start");
		expect(handler.command).toBe("./hooks/pre-start.sh");
		expect(handler.timeout).toBe(60000);
		expect(handler.continueOnFailure).toBe(false);
	});

	it("HookConfig has all fields", () => {
		// Arrange & Act
		const config: HookConfig = {
			timeout: 30000,
			retryOnError: true,
			maxRetries: 3,
			continueOnFailure: false,
		};

		// Assert
		expect(config.timeout).toBe(30000);
		expect(config.retryOnError).toBe(true);
		expect(config.maxRetries).toBe(3);
		expect(config.continueOnFailure).toBe(false);
	});

	it("Types are exported and HookInput accepts full input", () => {
		// Arrange & Act
		const input: HookInput = {
			event: "post-iteration",
			agent: {
				id: "claude-ch-001",
				type: "claude",
				worktree: ".worktrees/claude-ch-001",
			},
			task: {
				id: "ch-001",
				title: "Test",
				status: "in_progress",
				priority: 1,
				labels: [],
			},
			iteration: {
				number: 3,
				maxIterations: 50,
			},
			output: {
				stdout: "Output",
				exitCode: 0,
			},
		};

		// Assert
		expect(input.event).toBe("post-iteration");
		expect(input.agent?.id).toBe("claude-ch-001");
		expect(input.task?.id).toBe("ch-001");
		expect(input.iteration?.number).toBe(3);
		expect(input.output?.exitCode).toBe(0);

		// Verify default config helper
		const defaultConfig = getDefaultHookConfig();
		expect(defaultConfig.timeout).toBe(30000);
		expect(defaultConfig.continueOnFailure).toBe(true);
	});
});
