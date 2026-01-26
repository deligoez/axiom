import { describe, expect, it } from "vitest";
import type {
	Intervention,
	InterventionResult,
	InterventionState,
	InterventionType,
} from "./intervention.js";

describe("Intervention Types", () => {
	it("InterventionType union includes all types", () => {
		// Arrange & Act
		const types: InterventionType[] = [
			"pause",
			"stop_agent",
			"redirect_agent",
			"edit_task",
			"kill_all",
			"rollback",
			"block_task",
			"approve_merge",
		];

		// Assert
		expect(types.length).toBe(8);
		expect(types).toContain("pause");
		expect(types).toContain("stop_agent");
		expect(types).toContain("redirect_agent");
		expect(types).toContain("edit_task");
		expect(types).toContain("kill_all");
		expect(types).toContain("rollback");
		expect(types).toContain("block_task");
		expect(types).toContain("approve_merge");
	});

	it("InterventionState has required fields", () => {
		// Arrange & Act
		const state: InterventionState = {
			paused: false,
			pausedAt: null,
			pendingInterventions: [],
		};

		// Assert
		expect(state.paused).toBe(false);
		expect(state.pausedAt).toBeNull();
		expect(state.pendingInterventions).toEqual([]);
	});

	it("Intervention has required and optional fields", () => {
		// Arrange & Act - with optional fields
		const fullIntervention: Intervention = {
			type: "stop_agent",
			targetAgentId: "agent-1",
			targetTaskId: "task-1",
			timestamp: new Date(),
			reason: "Testing",
		};

		// without optional fields
		const minimalIntervention: Intervention = {
			type: "pause",
			timestamp: new Date(),
		};

		// Assert
		expect(fullIntervention.type).toBe("stop_agent");
		expect(fullIntervention.targetAgentId).toBe("agent-1");
		expect(fullIntervention.targetTaskId).toBe("task-1");
		expect(fullIntervention.reason).toBe("Testing");

		expect(minimalIntervention.type).toBe("pause");
		expect(minimalIntervention.targetAgentId).toBeUndefined();
		expect(minimalIntervention.reason).toBeUndefined();
	});

	it("InterventionResult has required fields", () => {
		// Arrange & Act
		const result: InterventionResult = {
			success: true,
			type: "stop_agent",
			message: "Agent stopped successfully",
			affectedAgents: ["agent-1"],
			affectedTasks: ["task-1", "task-2"],
		};

		// Assert
		expect(result.success).toBe(true);
		expect(result.type).toBe("stop_agent");
		expect(result.message).toBe("Agent stopped successfully");
		expect(result.affectedAgents).toContain("agent-1");
		expect(result.affectedTasks?.length).toBe(2);
	});

	it("Types are exported correctly", () => {
		// Arrange - create instances to verify exports work
		const type: InterventionType = "pause";
		const state: InterventionState = {
			paused: true,
			pausedAt: new Date(),
			pendingInterventions: [],
		};
		const intervention: Intervention = {
			type: "rollback",
			timestamp: new Date(),
		};
		const result: InterventionResult = {
			success: false,
			type: "rollback",
			message: "Failed",
		};

		// Assert
		expect(type).toBeDefined();
		expect(state).toBeDefined();
		expect(intervention).toBeDefined();
		expect(result).toBeDefined();
	});
});
