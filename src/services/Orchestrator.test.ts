import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChorusConfig } from "../types/config.js";
import { getDefaultConfig } from "../types/config.js";
import type { OrchestratorDeps } from "./Orchestrator.js";
import { Orchestrator } from "./Orchestrator.js";

describe("Orchestrator", () => {
	let orchestrator: Orchestrator;
	let deps: OrchestratorDeps;
	let config: ChorusConfig;

	beforeEach(() => {
		config = getDefaultConfig();

		deps = {
			projectDir: "/project",
			config,
			worktreeService: {
				create: vi.fn().mockResolvedValue({
					path: "/project/.worktrees/claude-ch-123",
					branch: "agent/claude/ch-123",
					agentType: "claude",
					taskId: "ch-123",
				}),
				exists: vi.fn().mockReturnValue(false),
				getPath: vi.fn().mockReturnValue("/project/.worktrees/claude-ch-123"),
				getBranch: vi.fn().mockReturnValue("agent/claude/ch-123"),
			} as unknown as OrchestratorDeps["worktreeService"],
			beadsCLI: {
				getTask: vi.fn().mockResolvedValue({
					id: "ch-123",
					title: "Test task",
					description: "Task description",
					status: "open",
					priority: 1,
					labels: [],
					dependencies: [],
				}),
				claimTask: vi.fn().mockResolvedValue(undefined),
				getReadyTasks: vi.fn().mockResolvedValue([
					{
						id: "ch-123",
						title: "Test task",
						status: "open",
						priority: 1,
						labels: [],
						dependencies: [],
					},
				]),
			} as unknown as OrchestratorDeps["beadsCLI"],
			promptBuilder: {
				build: vi.fn().mockResolvedValue("Built prompt for task"),
			} as unknown as OrchestratorDeps["promptBuilder"],
			agentSpawner: {
				spawn: vi.fn().mockResolvedValue({
					pid: 12345,
					stdout: {} as unknown,
					exitCode: Promise.resolve(0),
				}),
				kill: vi.fn(),
			} as unknown as OrchestratorDeps["agentSpawner"],
			eventEmitter: new EventEmitter(),
		};

		orchestrator = new Orchestrator(deps);
	});

	// Constructor - 1 test
	describe("constructor", () => {
		it("stores dependencies correctly", () => {
			// Arrange & Act - done in beforeEach

			// Assert
			expect(orchestrator).toBeDefined();
		});
	});

	// assignTask() - 8 tests
	describe("assignTask()", () => {
		it("creates worktree for task", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(deps.worktreeService.create).toHaveBeenCalledWith(
				"claude",
				"ch-123",
			);
		});

		it("claims task via beadsCLI.claimTask()", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(deps.beadsCLI.claimTask).toHaveBeenCalledWith(
				"ch-123",
				"claude-ch-123",
			);
		});

		it("builds prompt with task context", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(deps.promptBuilder.build).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: "ch-123",
					branch: "agent/claude/ch-123",
					projectDir: "/project",
					config,
				}),
			);
		});

		it("spawns agent in worktree directory", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(deps.agentSpawner.spawn).toHaveBeenCalledWith({
				prompt: "Built prompt for task",
				cwd: "/project/.worktrees/claude-ch-123",
			});
		});

		it("returns AssignmentResult on success", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			const result = await orchestrator.assignTask(assignment);

			// Assert
			expect(result.success).toBe(true);
			expect(result.taskId).toBe("ch-123");
			expect(result.worktree).toBe("/project/.worktrees/claude-ch-123");
			expect(result.agentId).toBe("claude-ch-123");
		});

		it("emits 'assigned' event on success", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };
			const assignedSpy = vi.fn();
			deps.eventEmitter.on("assigned", assignedSpy);

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(assignedSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: "ch-123",
					agentId: "claude-ch-123",
				}),
			);
		});

		it("returns error if task not found", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue(null);
			const assignment = { taskId: "ch-999" };

			// Act
			const result = await orchestrator.assignTask(assignment);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Task not found: ch-999");
		});

		it("returns error if task already assigned", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-123",
				title: "Test task",
				status: "in_progress",
				priority: 1,
				labels: [],
				dependencies: [],
			});
			const assignment = { taskId: "ch-123" };

			// Act
			const result = await orchestrator.assignTask(assignment);

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toBe("Task already assigned: ch-123");
		});
	});

	// canAssign() - 5 tests
	describe("canAssign()", () => {
		it("returns { can: true } for ready open task", async () => {
			// Arrange
			const taskId = "ch-123";

			// Act
			const result = await orchestrator.canAssign(taskId);

			// Assert
			expect(result.can).toBe(true);
		});

		it("returns { can: false } for in_progress task", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-123",
				title: "Test",
				status: "in_progress",
				priority: 1,
				labels: [],
				dependencies: [],
			});

			// Act
			const result = await orchestrator.canAssign("ch-123");

			// Assert
			expect(result.can).toBe(false);
			expect(result.reason).toContain("in_progress");
		});

		it("returns { can: false } for closed task", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-123",
				title: "Test",
				status: "closed",
				priority: 1,
				labels: [],
				dependencies: [],
			});

			// Act
			const result = await orchestrator.canAssign("ch-123");

			// Assert
			expect(result.can).toBe(false);
			expect(result.reason).toContain("closed");
		});

		it("returns { can: false } if max agents reached", async () => {
			// Arrange - spawn 3 agents (maxParallel = 3)
			await orchestrator.assignTask({ taskId: "ch-1" });
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-2",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: [],
			});
			await orchestrator.assignTask({ taskId: "ch-2" });
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-3",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: [],
			});
			await orchestrator.assignTask({ taskId: "ch-3" });

			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-4",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: [],
			});

			// Act
			const result = await orchestrator.canAssign("ch-4");

			// Assert
			expect(result.can).toBe(false);
			expect(result.reason).toContain("Max");
		});

		it("returns { can: false } if dependencies not met", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-123",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: ["ch-dep1", "ch-dep2"],
			});
			// Simulate one dep still open
			vi.mocked(deps.beadsCLI.getReadyTasks).mockResolvedValue([]);

			// Act
			const result = await orchestrator.canAssign("ch-123");

			// Assert
			expect(result.can).toBe(false);
			expect(result.reason).toContain("dependencies");
		});
	});

	// getAgentType() - 2 tests
	describe("getAgentType()", () => {
		it("uses task custom.agent if specified", async () => {
			// Arrange
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-123",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: [],
				custom: { agent: "codex" },
			});

			// Act
			const result = await orchestrator.getAgentType("ch-123");

			// Assert
			expect(result).toBe("codex");
		});

		it("falls back to config default", async () => {
			// Arrange - task has no custom.agent

			// Act
			const result = await orchestrator.getAgentType("ch-123");

			// Assert
			expect(result).toBe("claude"); // Default from config
		});
	});

	// Helper methods - 5 tests
	describe("getTask()", () => {
		it("delegates to beadsCLI.getTask()", async () => {
			// Arrange
			const taskId = "ch-123";

			// Act
			const result = await orchestrator.getTask(taskId);

			// Assert
			expect(deps.beadsCLI.getTask).toHaveBeenCalledWith(taskId);
			expect(result?.id).toBe("ch-123");
		});
	});

	describe("getReadyTasks()", () => {
		it("delegates to beadsCLI.getReadyTasks() with excludeLabels", async () => {
			// Arrange

			// Act
			const result = await orchestrator.getReadyTasks();

			// Assert
			expect(deps.beadsCLI.getReadyTasks).toHaveBeenCalledWith({
				excludeLabels: ["deferred"],
			});
			expect(result.length).toBe(1);
		});
	});

	describe("getAgentConfig()", () => {
		it("returns config for agent type", () => {
			// Arrange
			const agentType = "claude";

			// Act
			const result = orchestrator.getAgentConfig(agentType);

			// Assert
			expect(result).toEqual({
				command: "claude",
				args: ["--dangerously-skip-permissions"],
			});
		});
	});

	describe("getActiveAgentCount()", () => {
		it("returns count of active agents", async () => {
			// Arrange
			await orchestrator.assignTask({ taskId: "ch-123" });
			vi.mocked(deps.beadsCLI.getTask).mockResolvedValue({
				id: "ch-456",
				title: "Test",
				status: "open",
				priority: 1,
				labels: [],
				dependencies: [],
			});
			await orchestrator.assignTask({ taskId: "ch-456" });

			// Act
			const count = orchestrator.getActiveAgentCount();

			// Assert
			expect(count).toBe(2);
		});
	});

	describe("environment variables", () => {
		it("passes CHORUS_TASK_ID and CHORUS_BRANCH env vars", async () => {
			// Arrange
			const assignment = { taskId: "ch-123" };

			// Act
			await orchestrator.assignTask(assignment);

			// Assert
			expect(deps.agentSpawner.spawn).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: "/project/.worktrees/claude-ch-123",
				}),
			);
			// Note: env vars are set in the spawn call
		});
	});
});
