import { describe, expect, it } from "vitest";
import type {
	AgentMachineContext,
	AgentMachineEvent,
	AgentMachineInput,
	ChorusMachineContext,
	ChorusMachineEvent,
	ChorusMachineInput,
} from "./xstate.types.js";

describe("XState Types", () => {
	describe("ChorusMachineContext", () => {
		it("has required fields", () => {
			// Arrange
			const context: ChorusMachineContext = {
				config: { projectRoot: "/test" },
				mode: "semi-auto",
				agents: [],
				maxAgents: 3,
				mergeQueue: [],
				stats: { completed: 0, failed: 0, inProgress: 0 },
			};

			// Assert
			expect(context.config).toBeDefined();
			expect(context.mode).toBe("semi-auto");
			expect(context.agents).toEqual([]);
			expect(context.maxAgents).toBe(3);
			expect(context.mergeQueue).toEqual([]);
			expect(context.stats).toBeDefined();
		});
	});

	describe("ChorusMachineEvent", () => {
		it("covers all event types", () => {
			// Arrange - create array of all event types
			const events: ChorusMachineEvent[] = [
				{ type: "SPAWN_AGENT", taskId: "task-1" },
				{ type: "STOP_AGENT", agentId: "agent-1" },
				{ type: "PAUSE" },
				{ type: "RESUME" },
				{ type: "SET_MODE", mode: "autopilot" },
				{ type: "ENQUEUE_MERGE", taskId: "task-1", branch: "feat/x" },
				{
					type: "AGENT_COMPLETED",
					agentId: "agent-1",
					result: { success: true },
				},
				{ type: "AGENT_FAILED", agentId: "agent-1", error: new Error("test") },
			];

			// Assert - all events have type field
			for (const event of events) {
				expect(event.type).toBeDefined();
				expect(typeof event.type).toBe("string");
			}
		});
	});

	describe("AgentMachineContext", () => {
		it("has required fields", () => {
			// Arrange
			const context: AgentMachineContext = {
				taskId: "task-1",
				agentId: "agent-1",
				iteration: 0,
				maxIterations: 5,
				worktree: "/worktrees/task-1",
				branch: "feat/task-1",
			};

			// Assert
			expect(context.taskId).toBe("task-1");
			expect(context.agentId).toBe("agent-1");
			expect(context.iteration).toBe(0);
			expect(context.maxIterations).toBe(5);
			expect(context.worktree).toBeDefined();
			expect(context.branch).toBeDefined();
		});
	});

	describe("AgentMachineEvent", () => {
		it("covers all event types", () => {
			// Arrange
			const events: AgentMachineEvent[] = [
				{ type: "START" },
				{ type: "READY" },
				{ type: "ITERATION_DONE" },
				{ type: "COMPLETE" },
				{ type: "FAIL", error: new Error("test") },
				{ type: "RETRY" },
				{ type: "STOP" },
				{ type: "TIMEOUT" },
			];

			// Assert
			for (const event of events) {
				expect(event.type).toBeDefined();
				expect(typeof event.type).toBe("string");
			}
		});
	});

	describe("ChorusMachineInput", () => {
		it("has config field", () => {
			// Arrange
			const input: ChorusMachineInput = {
				config: { projectRoot: "/test" },
			};

			// Assert
			expect(input.config).toBeDefined();
			expect(input.config.projectRoot).toBe("/test");
		});
	});

	describe("AgentMachineInput", () => {
		it("has taskId and parentRef fields", () => {
			// Arrange - mock AnyActorRef with minimal interface
			const mockParentRef = {
				send: () => {},
			} as unknown as AgentMachineInput["parentRef"];
			const input: AgentMachineInput = {
				taskId: "task-1",
				parentRef: mockParentRef,
			};

			// Assert
			expect(input.taskId).toBe("task-1");
			expect(input.parentRef).toBeDefined();
		});
	});

	describe("Type discriminations", () => {
		it("event types are discriminated by type field", () => {
			// Arrange - helper to test type narrowing
			const handleEvent = (event: ChorusMachineEvent): string => {
				if (event.type === "SPAWN_AGENT") {
					// TypeScript knows this has taskId
					return event.taskId;
				}
				if (event.type === "PAUSE") {
					// TypeScript knows this is just { type: 'PAUSE' }
					return "paused";
				}
				return event.type;
			};

			// Act
			const spawnResult = handleEvent({
				type: "SPAWN_AGENT",
				taskId: "task-1",
			});
			const pauseResult = handleEvent({ type: "PAUSE" });

			// Assert
			expect(spawnResult).toBe("task-1");
			expect(pauseResult).toBe("paused");
		});
	});

	describe("JSON serialization", () => {
		it("context types are JSON-serializable (no functions)", () => {
			// Arrange
			const context: ChorusMachineContext = {
				config: { projectRoot: "/test" },
				mode: "semi-auto",
				agents: [],
				maxAgents: 3,
				mergeQueue: [],
				stats: { completed: 0, failed: 0, inProgress: 0 },
			};

			// Act
			const serialized = JSON.stringify(context);
			const deserialized = JSON.parse(serialized);

			// Assert - can round-trip through JSON
			expect(deserialized.config.projectRoot).toBe("/test");
			expect(deserialized.mode).toBe("semi-auto");
			expect(deserialized.maxAgents).toBe(3);
		});
	});
});
