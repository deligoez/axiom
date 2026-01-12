import { describe, expect, it, vi } from "vitest";
import {
	AgentRedirector,
	type Orchestrator,
	type AgentStopper as RedirectorAgentStopper,
	type RedirectorTaskProvider,
} from "../services/AgentRedirector.js";
import {
	AgentStopper,
	type AgentTracker,
	type CommandRunner,
	type ProcessKiller,
} from "../services/AgentStopper.js";
import {
	type OrchestratorControl,
	PauseHandler,
} from "../services/PauseHandler.js";
import {
	type AgentStopper as BlockerAgentStopper,
	TaskBlocker,
} from "../services/TaskBlocker.js";
import type { TaskProvider } from "../types/task-provider.js";

describe("E2E: Human Intervention System", () => {
	describe("Pause Handler", () => {
		it("pauses orchestration and stops spawning new agents", async () => {
			// Arrange
			let isPaused = false;
			const orchestrator: OrchestratorControl = {
				setPaused: (paused) => {
					isPaused = paused;
				},
			};
			const handler = new PauseHandler(orchestrator);

			// Act
			const result = await handler.pause();

			// Assert
			expect(result.success).toBe(true);
			expect(result.type).toBe("pause");
			expect(handler.isPaused()).toBe(true);
			expect(isPaused).toBe(true);
		});

		it("resumes paused orchestration", async () => {
			// Arrange
			let isPaused = true;
			const orchestrator: OrchestratorControl = {
				setPaused: (paused) => {
					isPaused = paused;
				},
			};
			const handler = new PauseHandler(orchestrator);
			await handler.pause();

			// Act
			const result = await handler.resume();

			// Assert
			expect(result.success).toBe(true);
			expect(handler.isPaused()).toBe(false);
			expect(isPaused).toBe(false);
		});

		it("tracks pause duration", async () => {
			// Arrange
			const orchestrator: OrchestratorControl = {
				setPaused: vi.fn(),
			};
			const handler = new PauseHandler(orchestrator);

			// Act
			await handler.pause();
			// Wait a bit
			await new Promise((r) => setTimeout(r, 50));
			const duration = handler.getPauseDuration();

			// Assert
			expect(duration).toBeGreaterThan(0);
			expect(duration).toBeLessThan(200);
		});
	});

	describe("Agent Stopper", () => {
		it("stops agent and returns task to pending", async () => {
			// Arrange
			const agents = new Map([
				[
					"agent-1",
					{
						agentId: "agent-1",
						taskId: "ch-001",
						pid: 12345,
						worktreePath: "/worktrees/agent-1",
					},
				],
			]);
			const taskAgents = new Map([["ch-001", "agent-1"]]);
			const killedPids: number[] = [];
			const releasedTasks: string[] = [];

			const agentTracker: AgentTracker = {
				getAgent: (id) => agents.get(id) || null,
				getAgentByTask: (taskId) => {
					const agentId = taskAgents.get(taskId);
					return agentId ? agents.get(agentId) || null : null;
				},
				getAllAgents: () => Array.from(agents.values()),
				removeAgent: (id) => {
					agents.delete(id);
				},
			};

			const taskProvider = {
				releaseTask: async (taskId: string) => {
					releasedTasks.push(taskId);
				},
			} as unknown as TaskProvider;

			const processKiller: ProcessKiller = {
				kill: (pid) => {
					killedPids.push(pid);
				},
			};

			const commandRunner: CommandRunner = {
				run: async () => ({ success: true, output: "" }),
			};

			const stopper = new AgentStopper(
				agentTracker,
				taskProvider,
				processKiller,
				commandRunner,
			);

			// Act
			const result = await stopper.stopAgent("agent-1");

			// Assert
			expect(result.success).toBe(true);
			expect(killedPids).toContain(12345);
			expect(releasedTasks).toContain("ch-001");
			expect(agents.has("agent-1")).toBe(false);
		});

		it("stops agent by task ID", async () => {
			// Arrange
			const agents = new Map([
				[
					"agent-2",
					{
						agentId: "agent-2",
						taskId: "ch-002",
						pid: 54321,
						worktreePath: "/worktrees/agent-2",
					},
				],
			]);
			const taskAgents = new Map([["ch-002", "agent-2"]]);
			const killedPids: number[] = [];

			const agentTracker: AgentTracker = {
				getAgent: (id) => agents.get(id) || null,
				getAgentByTask: (taskId) => {
					const agentId = taskAgents.get(taskId);
					return agentId ? agents.get(agentId) || null : null;
				},
				getAllAgents: () => Array.from(agents.values()),
				removeAgent: (id) => {
					agents.delete(id);
				},
			};

			const stopper = new AgentStopper(
				agentTracker,
				{ releaseTask: vi.fn() } as unknown as TaskProvider,
				{ kill: (pid) => killedPids.push(pid) },
				{ run: async () => ({ success: true, output: "" }) },
			);

			// Act
			const result = await stopper.stopAgentByTask("ch-002");

			// Assert
			expect(result).not.toBeNull();
			expect(result?.success).toBe(true);
			expect(killedPids).toContain(54321);
		});

		it("returns null when stopping non-existent task agent", async () => {
			// Arrange
			const agentTracker: AgentTracker = {
				getAgent: () => null,
				getAgentByTask: () => null,
				getAllAgents: () => [],
				removeAgent: vi.fn(),
			};

			const stopper = new AgentStopper(
				agentTracker,
				{ releaseTask: vi.fn() } as unknown as TaskProvider,
				{ kill: vi.fn() },
				{ run: async () => ({ success: true, output: "" }) },
			);

			// Act
			const result = await stopper.stopAgentByTask("ch-999");

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("Agent Redirector", () => {
		it("redirects agent to new task", async () => {
			// Arrange
			const stoppedAgents: string[] = [];
			const claimedTasks: string[] = [];
			const spawnedAgents: { agentId: string; taskId: string }[] = [];

			const agentStopper: RedirectorAgentStopper = {
				stopAgent: async (agentId) => {
					stoppedAgents.push(agentId);
					return { success: true, message: "Stopped" };
				},
				getAgentForTask: () => null,
			};

			const taskProvider: RedirectorTaskProvider = {
				getTask: async (taskId) => ({
					id: taskId,
					title: `Task ${taskId}`,
					priority: 2,
					status: "open",
					labels: [],
					dependencies: [],
					blockedBy: [],
				}),
				claimTask: async (taskId, _assignee) => {
					claimedTasks.push(taskId);
				},
			};

			const orchestrator: Orchestrator = {
				getAgent: (agentId) => ({
					agentId,
					taskId: "ch-old",
					pid: 1234,
					worktreePath: "/worktrees/test",
					status: "running" as const,
				}),
				spawnAgentForTask: async (agentId, taskId) => {
					spawnedAgents.push({ agentId, taskId });
				},
			};

			const redirector = new AgentRedirector(
				agentStopper,
				taskProvider,
				orchestrator,
			);

			// Act
			const result = await redirector.redirect("agent-1", "ch-new");

			// Assert
			expect(result.success).toBe(true);
			expect(stoppedAgents).toContain("agent-1");
			expect(claimedTasks).toContain("ch-new");
			expect(spawnedAgents).toContainEqual({
				agentId: "agent-1",
				taskId: "ch-new",
			});
		});

		it("fails to redirect to blocked task", async () => {
			// Arrange
			const agentStopper: RedirectorAgentStopper = {
				stopAgent: vi.fn(),
				getAgentForTask: () => null,
			};

			const taskProvider: RedirectorTaskProvider = {
				getTask: async () => ({
					id: "ch-blocked",
					title: "Blocked Task",
					priority: 2,
					status: "open",
					labels: [],
					dependencies: [],
					blockedBy: ["ch-001"],
				}),
				claimTask: vi.fn(),
			};

			const orchestrator: Orchestrator = {
				getAgent: (agentId) => ({
					agentId,
					taskId: "ch-old",
					pid: 1234,
					worktreePath: "/worktrees/test",
					status: "running" as const,
				}),
				spawnAgentForTask: vi.fn(),
			};

			const redirector = new AgentRedirector(
				agentStopper,
				taskProvider,
				orchestrator,
			);

			// Act
			const result = await redirector.redirect("agent-1", "ch-blocked");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("blocked");
		});

		it("fails to redirect to deferred task", async () => {
			// Arrange
			const orchestrator: Orchestrator = {
				getAgent: (agentId) => ({
					agentId,
					taskId: "ch-old",
					pid: 1234,
					worktreePath: "/worktrees/test",
					status: "running" as const,
				}),
				spawnAgentForTask: vi.fn(),
			};

			const redirector = new AgentRedirector(
				{ stopAgent: vi.fn(), getAgentForTask: () => null },
				{
					getTask: async () => ({
						id: "ch-deferred",
						title: "Deferred Task",
						priority: 2,
						status: "open",
						labels: ["deferred"],
						dependencies: [],
						blockedBy: [],
					}),
					claimTask: vi.fn(),
				},
				orchestrator,
			);

			// Act
			const result = await redirector.redirect("agent-1", "ch-deferred");

			// Assert
			expect(result.success).toBe(false);
			expect(result.message).toContain("deferred");
		});
	});

	describe("Task Blocker", () => {
		it("blocks task and stops working agent", async () => {
			// Arrange
			const stoppedTasks: string[] = [];
			const addedLabels: { taskId: string; label: string }[] = [];
			const addedNotes: { taskId: string; note: string }[] = [];

			const agentStopper: BlockerAgentStopper = {
				stopAgentByTask: async (taskId) => {
					stoppedTasks.push(taskId);
					return { success: true, message: "Stopped" };
				},
				getAgentForTask: () => ({
					agentId: "agent-1",
					taskId: "ch-001",
					pid: 1234,
					worktreePath: "/worktrees/test",
				}),
			};

			const taskProvider = {
				getTask: async (taskId: string) => ({
					id: taskId,
					title: `Task ${taskId}`,
					priority: 2,
					status: "in_progress",
					labels: [],
					dependencies: [],
				}),
				addLabel: async (taskId: string, label: string) => {
					addedLabels.push({ taskId, label });
				},
				removeLabel: vi.fn(),
				updateStatus: vi.fn(),
				addNote: async (taskId: string, note: string) => {
					addedNotes.push({ taskId, note });
				},
			} as unknown as TaskProvider;

			const blocker = new TaskBlocker(agentStopper, taskProvider);

			// Act
			const result = await blocker.blockTask("ch-001", "Needs investigation");

			// Assert
			expect(result.success).toBe(true);
			expect(stoppedTasks).toContain("ch-001");
			expect(addedLabels).toContainEqual({
				taskId: "ch-001",
				label: "blocked",
			});
			expect(
				addedNotes.some((n) => n.note.includes("Needs investigation")),
			).toBe(true);
		});

		it("unblocks task by removing blocked label", async () => {
			// Arrange
			const removedLabels: { taskId: string; label: string }[] = [];

			const taskProvider = {
				getTask: vi.fn(),
				addLabel: vi.fn(),
				removeLabel: async (taskId: string, label: string) => {
					removedLabels.push({ taskId, label });
				},
				updateStatus: vi.fn(),
				addNote: vi.fn(),
			} as unknown as TaskProvider;

			const blocker = new TaskBlocker(
				{ stopAgentByTask: vi.fn(), getAgentForTask: () => null },
				taskProvider,
			);

			// Act
			const result = await blocker.unblockTask("ch-001");

			// Assert
			expect(result.success).toBe(true);
			expect(removedLabels).toContainEqual({
				taskId: "ch-001",
				label: "blocked",
			});
		});

		it("checks if task is blocked", async () => {
			// Arrange
			const taskProvider = {
				getTask: async (taskId: string) => ({
					id: taskId,
					title: `Task ${taskId}`,
					priority: 2,
					status: "open",
					labels: ["blocked", "bug"],
					dependencies: [],
				}),
				addLabel: vi.fn(),
				removeLabel: vi.fn(),
				updateStatus: vi.fn(),
				addNote: vi.fn(),
			} as unknown as TaskProvider;

			const blocker = new TaskBlocker(
				{ stopAgentByTask: vi.fn(), getAgentForTask: () => null },
				taskProvider,
			);

			// Act
			const isBlocked = await blocker.isBlocked("ch-001");

			// Assert
			expect(isBlocked).toBe(true);
		});
	});

	describe("Multiple Interventions", () => {
		it("handles pause → stop → resume without state corruption", async () => {
			// Arrange
			let isPaused = false;
			const orchestrator: OrchestratorControl = {
				setPaused: (paused) => {
					isPaused = paused;
				},
			};
			const pauseHandler = new PauseHandler(orchestrator);

			const agents = new Map([
				[
					"agent-1",
					{
						agentId: "agent-1",
						taskId: "ch-001",
						pid: 1234,
						worktreePath: "/test",
					},
				],
			]);

			const agentTracker: AgentTracker = {
				getAgent: (id) => agents.get(id) || null,
				getAgentByTask: () => null,
				getAllAgents: () => Array.from(agents.values()),
				removeAgent: (id) => agents.delete(id),
			};

			const stopper = new AgentStopper(
				agentTracker,
				{ releaseTask: vi.fn() } as unknown as TaskProvider,
				{ kill: vi.fn() },
				{ run: async () => ({ success: true, output: "" }) },
			);

			// Act
			await pauseHandler.pause();
			expect(pauseHandler.isPaused()).toBe(true);

			await stopper.stopAgent("agent-1");
			expect(agents.size).toBe(0);

			await pauseHandler.resume();
			expect(pauseHandler.isPaused()).toBe(false);

			// Assert - state is consistent
			expect(agents.size).toBe(0);
			expect(isPaused).toBe(false);
		});
	});
});
