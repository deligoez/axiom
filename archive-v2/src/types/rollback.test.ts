import { describe, expect, it } from "vitest";
import type {
	Checkpoint,
	CheckpointConfig,
	RollbackLevel,
	RollbackResult,
} from "./rollback.js";

describe("Rollback Types", () => {
	it("RollbackLevel union includes all levels", () => {
		// Arrange & Act
		const levels: RollbackLevel[] = [
			"iteration",
			"task",
			"task_chain",
			"session",
		];

		// Assert
		expect(levels.length).toBe(4);
		expect(levels).toContain("iteration");
		expect(levels).toContain("task");
		expect(levels).toContain("task_chain");
		expect(levels).toContain("session");
	});

	it("Checkpoint has required fields", () => {
		// Arrange & Act
		const checkpoint: Checkpoint = {
			id: "cp-1",
			tag: "checkpoint-1",
			timestamp: new Date(),
			type: "autopilot_start",
		};

		const checkpointWithTask: Checkpoint = {
			id: "cp-2",
			tag: "pre-merge-task-1",
			timestamp: new Date(),
			type: "pre_merge",
			taskId: "task-1",
		};

		// Assert
		expect(checkpoint.id).toBe("cp-1");
		expect(checkpoint.tag).toBe("checkpoint-1");
		expect(checkpoint.type).toBe("autopilot_start");
		expect(checkpoint.taskId).toBeUndefined();

		expect(checkpointWithTask.type).toBe("pre_merge");
		expect(checkpointWithTask.taskId).toBe("task-1");
	});

	it("CheckpointConfig has required fields", () => {
		// Arrange & Act
		const config: CheckpointConfig = {
			enabled: true,
			beforeAutopilot: true,
			beforeMerge: true,
			periodic: 5,
		};

		// Assert
		expect(config.enabled).toBe(true);
		expect(config.beforeAutopilot).toBe(true);
		expect(config.beforeMerge).toBe(true);
		expect(config.periodic).toBe(5);
	});

	it("RollbackResult has required fields", () => {
		// Arrange & Act
		const result: RollbackResult = {
			success: true,
			level: "task",
			revertedCommits: ["abc123", "def456"],
			affectedTasks: ["task-1"],
			message: "Rolled back successfully",
		};

		// Assert
		expect(result.success).toBe(true);
		expect(result.level).toBe("task");
		expect(result.revertedCommits).toHaveLength(2);
		expect(result.affectedTasks).toContain("task-1");
		expect(result.message).toBe("Rolled back successfully");
	});

	it("Types are exported correctly", () => {
		// Arrange - create instances to verify exports work
		const level: RollbackLevel = "session";
		const checkpoint: Checkpoint = {
			id: "1",
			tag: "t",
			timestamp: new Date(),
			type: "periodic",
		};
		const config: CheckpointConfig = {
			enabled: false,
			beforeAutopilot: false,
			beforeMerge: false,
			periodic: 0,
		};
		const result: RollbackResult = {
			success: false,
			level: "iteration",
			revertedCommits: [],
			affectedTasks: [],
			message: "",
		};

		// Assert
		expect(level).toBeDefined();
		expect(checkpoint).toBeDefined();
		expect(config).toBeDefined();
		expect(result).toBeDefined();
	});
});
