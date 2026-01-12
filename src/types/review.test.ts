import { describe, expect, it } from "vitest";
import type {
	FeedbackEntry,
	FeedbackType,
	FileChange,
	QualityRunResult,
	ReviewConfig,
	ReviewMode,
	TaskCompletionResult,
	TaskFeedback,
} from "./review.js";

describe("Review Types", () => {
	it("ReviewMode union includes all modes", () => {
		// Arrange & Act
		const modes: ReviewMode[] = ["per-task", "batch", "auto-approve", "skip"];

		// Assert
		expect(modes.length).toBe(4);
		expect(modes).toContain("per-task");
		expect(modes).toContain("batch");
		expect(modes).toContain("auto-approve");
		expect(modes).toContain("skip");
	});

	it("ReviewConfig has required fields", () => {
		// Arrange & Act
		const config: ReviewConfig = {
			defaultMode: "per-task",
			autoApprove: {
				enabled: true,
				maxIterations: 3,
				requireQualityPass: true,
			},
			labelRules: [
				{ label: "trivial", mode: "auto-approve" },
				{ label: "critical", mode: "per-task" },
			],
		};

		// Assert
		expect(config.defaultMode).toBe("per-task");
		expect(config.autoApprove.enabled).toBe(true);
		expect(config.autoApprove.maxIterations).toBe(3);
		expect(config.autoApprove.requireQualityPass).toBe(true);
		expect(config.labelRules).toHaveLength(2);
		expect(config.labelRules[0].label).toBe("trivial");
		expect(config.labelRules[0].mode).toBe("auto-approve");
	});

	it("FileChange has required fields", () => {
		// Arrange & Act
		const addedFile: FileChange = {
			path: "src/new-file.ts",
			type: "added",
			linesAdded: 50,
			linesRemoved: 0,
		};

		const modifiedFile: FileChange = {
			path: "src/existing.ts",
			type: "modified",
			linesAdded: 10,
			linesRemoved: 5,
		};

		const deletedFile: FileChange = {
			path: "src/old-file.ts",
			type: "deleted",
			linesAdded: 0,
			linesRemoved: 100,
		};

		// Assert
		expect(addedFile.type).toBe("added");
		expect(modifiedFile.type).toBe("modified");
		expect(deletedFile.type).toBe("deleted");
		expect(addedFile.linesAdded).toBe(50);
		expect(deletedFile.linesRemoved).toBe(100);
	});

	it("QualityRunResult has required fields", () => {
		// Arrange & Act
		const passedResult: QualityRunResult = {
			name: "typecheck",
			passed: true,
			duration: 2500,
		};

		const failedResult: QualityRunResult = {
			name: "lint",
			passed: false,
			duration: 1200,
			error: "3 lint errors found",
		};

		// Assert
		expect(passedResult.name).toBe("typecheck");
		expect(passedResult.passed).toBe(true);
		expect(passedResult.duration).toBe(2500);
		expect(passedResult.error).toBeUndefined();

		expect(failedResult.passed).toBe(false);
		expect(failedResult.error).toBe("3 lint errors found");
	});

	it("TaskCompletionResult has all required fields", () => {
		// Arrange & Act
		const result: TaskCompletionResult = {
			taskId: "ch-test1",
			agentId: "agent-1",
			iterations: 2,
			duration: 180000,
			signal: {
				type: "COMPLETE",
				payload: "Task finished",
				raw: "<chorus>COMPLETE:Task finished</chorus>",
			},
			quality: [
				{ name: "test", passed: true, duration: 5000 },
				{ name: "typecheck", passed: true, duration: 3000 },
				{ name: "lint", passed: true, duration: 2000 },
			],
			changes: [
				{ path: "src/new.ts", type: "added", linesAdded: 100, linesRemoved: 0 },
			],
		};

		// Assert
		expect(result.taskId).toBe("ch-test1");
		expect(result.agentId).toBe("agent-1");
		expect(result.iterations).toBe(2);
		expect(result.duration).toBe(180000);
		expect(result.signal?.type).toBe("COMPLETE");
		expect(result.quality).toHaveLength(3);
		expect(result.changes).toHaveLength(1);
	});

	it("FeedbackType union includes all types", () => {
		// Arrange & Act
		const types: FeedbackType[] = ["approve", "redo", "reject", "comment"];

		// Assert
		expect(types.length).toBe(4);
		expect(types).toContain("approve");
		expect(types).toContain("redo");
		expect(types).toContain("reject");
		expect(types).toContain("comment");
	});

	it("FeedbackEntry has required fields", () => {
		// Arrange & Act
		const entry: FeedbackEntry = {
			type: "redo",
			message: "Please fix the error handling",
			timestamp: "2026-01-12T10:00:00Z",
			reviewer: "human",
		};

		// Assert
		expect(entry.type).toBe("redo");
		expect(entry.message).toBe("Please fix the error handling");
		expect(entry.timestamp).toBe("2026-01-12T10:00:00Z");
		expect(entry.reviewer).toBe("human");
	});

	it("TaskFeedback has taskId and history", () => {
		// Arrange & Act
		const feedback: TaskFeedback = {
			taskId: "ch-test1",
			history: [
				{
					type: "comment",
					message: "Looking good",
					timestamp: "2026-01-12T10:00:00Z",
				},
				{
					type: "approve",
					message: "Approved",
					timestamp: "2026-01-12T10:05:00Z",
				},
			],
		};

		// Assert
		expect(feedback.taskId).toBe("ch-test1");
		expect(feedback.history).toHaveLength(2);
		expect(feedback.history[0].type).toBe("comment");
		expect(feedback.history[1].type).toBe("approve");
	});

	it("Types are exported correctly", () => {
		// Arrange - create instances to verify exports work
		const mode: ReviewMode = "batch";
		const config: ReviewConfig = {
			defaultMode: "skip",
			autoApprove: {
				enabled: false,
				maxIterations: 1,
				requireQualityPass: false,
			},
			labelRules: [],
		};
		const fileChange: FileChange = {
			path: "test.ts",
			type: "modified",
			linesAdded: 1,
			linesRemoved: 1,
		};
		const qualityResult: QualityRunResult = {
			name: "test",
			passed: true,
			duration: 100,
		};
		const completionResult: TaskCompletionResult = {
			taskId: "ch-x",
			agentId: "a-1",
			iterations: 1,
			duration: 1000,
			signal: null,
			quality: [],
			changes: [],
		};

		// Assert
		expect(mode).toBeDefined();
		expect(config).toBeDefined();
		expect(fileChange).toBeDefined();
		expect(qualityResult).toBeDefined();
		expect(completionResult).toBeDefined();
	});
});
