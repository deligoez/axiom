import { describe, expect, it } from "vitest";
import type {
	AgentState,
	AgentStatus,
	ChorusState,
	MergeQueueItem,
	MergeQueueItemStatus,
	SessionStats,
} from "./state.js";

describe("State types", () => {
	// AgentState tests (3)
	it("AgentState accepts object with all required fields and valid AgentStatus", () => {
		// Arrange & Act
		const agent: AgentState = {
			id: "agent-1",
			type: "claude",
			pid: 12345,
			taskId: "ch-abc",
			worktree: "/tmp/worktree-1",
			branch: "feature/ch-abc",
			iteration: 1,
			startedAt: Date.now(),
			status: "running",
		};

		// Assert
		expect(agent.id).toBe("agent-1");
		expect(agent.type).toBe("claude");
		expect(agent.pid).toBe(12345);
		expect(agent.status).toBe("running");
	});

	it("AgentState.type accepts only 'claude' | 'codex' | 'opencode'", () => {
		// Arrange
		const types: Array<"claude" | "codex" | "opencode"> = [
			"claude",
			"codex",
			"opencode",
		];

		// Act & Assert
		for (const type of types) {
			const agent: AgentState = {
				id: "agent-1",
				type,
				pid: 12345,
				taskId: "ch-abc",
				worktree: "/tmp/worktree-1",
				branch: "feature/ch-abc",
				iteration: 1,
				startedAt: Date.now(),
				status: "idle",
			};
			expect(agent.type).toBe(type);
		}
	});

	it("AgentStatus includes all valid states", () => {
		// Arrange & Act
		const statuses: AgentStatus[] = [
			"idle",
			"running",
			"paused",
			"stopped",
			"error",
		];

		// Assert
		expect(statuses).toContain("idle");
		expect(statuses).toContain("running");
		expect(statuses).toContain("paused");
		expect(statuses).toContain("stopped");
		expect(statuses).toContain("error");
	});

	// MergeQueueItem tests (2)
	it("MergeQueueItem accepts object with all required fields and valid status", () => {
		// Arrange & Act
		const item: MergeQueueItem = {
			taskId: "ch-abc",
			branch: "feature/ch-abc",
			worktree: "/tmp/worktree-1",
			priority: 1,
			status: "pending",
			retries: 0,
			enqueuedAt: Date.now(),
		};

		// Assert
		expect(item.taskId).toBe("ch-abc");
		expect(item.branch).toBe("feature/ch-abc");
		expect(item.priority).toBe(1);
		expect(item.status).toBe("pending");
		expect(item.retries).toBe(0);
	});

	it("MergeQueueItemStatus includes all valid states", () => {
		// Arrange & Act
		const statuses: MergeQueueItemStatus[] = [
			"pending",
			"merging",
			"conflict",
			"resolving",
		];

		// Assert
		expect(statuses).toContain("pending");
		expect(statuses).toContain("merging");
		expect(statuses).toContain("conflict");
		expect(statuses).toContain("resolving");
	});

	// SessionStats test (1)
	it("SessionStats accepts object with all 6 numeric fields", () => {
		// Arrange & Act
		const stats: SessionStats = {
			tasksCompleted: 10,
			tasksFailed: 2,
			mergesAuto: 8,
			mergesManual: 2,
			totalIterations: 50,
			totalRuntime: 3600000,
		};

		// Assert
		expect(stats.tasksCompleted).toBe(10);
		expect(stats.tasksFailed).toBe(2);
		expect(stats.mergesAuto).toBe(8);
		expect(stats.mergesManual).toBe(2);
		expect(stats.totalIterations).toBe(50);
		expect(stats.totalRuntime).toBe(3600000);
	});

	// ChorusState tests (2)
	it("ChorusState accepts complete state with agents={}, mergeQueue=[], checkpoint=null", () => {
		// Arrange & Act
		const state: ChorusState = {
			version: "3.1",
			sessionId: "session-123",
			startedAt: Date.now(),
			mode: "semi-auto",
			paused: false,
			agents: {},
			mergeQueue: [],
			checkpoint: null,
			stats: {
				tasksCompleted: 0,
				tasksFailed: 0,
				mergesAuto: 0,
				mergesManual: 0,
				totalIterations: 0,
				totalRuntime: 0,
			},
		};

		// Assert
		expect(state.version).toBe("3.1");
		expect(state.sessionId).toBe("session-123");
		expect(state.mode).toBe("semi-auto");
		expect(state.paused).toBe(false);
		expect(state.agents).toEqual({});
		expect(state.mergeQueue).toEqual([]);
		expect(state.checkpoint).toBeNull();
	});

	it("ChorusState accepts complete state with populated agents and mergeQueue", () => {
		// Arrange
		const agent: AgentState = {
			id: "agent-1",
			type: "claude",
			pid: 12345,
			taskId: "ch-abc",
			worktree: "/tmp/worktree-1",
			branch: "feature/ch-abc",
			iteration: 3,
			startedAt: Date.now() - 60000,
			status: "running",
		};

		const queueItem: MergeQueueItem = {
			taskId: "ch-xyz",
			branch: "feature/ch-xyz",
			worktree: "/tmp/worktree-2",
			priority: 1,
			status: "pending",
			retries: 0,
			enqueuedAt: Date.now(),
		};

		// Act
		const state: ChorusState = {
			version: "3.1",
			sessionId: "session-456",
			startedAt: Date.now() - 3600000,
			mode: "autopilot",
			paused: false,
			agents: { "agent-1": agent },
			mergeQueue: [queueItem],
			checkpoint: "checkpoint-1",
			stats: {
				tasksCompleted: 5,
				tasksFailed: 1,
				mergesAuto: 4,
				mergesManual: 1,
				totalIterations: 25,
				totalRuntime: 3600000,
			},
		};

		// Assert
		expect(state.mode).toBe("autopilot");
		expect(state.agents["agent-1"].taskId).toBe("ch-abc");
		expect(state.mergeQueue).toHaveLength(1);
		expect(state.mergeQueue[0].status).toBe("pending");
		expect(state.checkpoint).toBe("checkpoint-1");
		expect(state.stats.tasksCompleted).toBe(5);
	});
});
